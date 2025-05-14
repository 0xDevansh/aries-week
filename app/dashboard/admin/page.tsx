"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/supabase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type Track = Database["public"]["Tables"]["tracks"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export default function AdminPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  
  // Track and task edit/create states
  const [isCreatingTrack, setIsCreatingTrack] = useState(false)
  const [isEditingTrack, setIsEditingTrack] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Partial<Track> | null>(null)
  
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [currentTask, setCurrentTask] = useState<Partial<Task> | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      // Fetch tracks
      let tracksQuery = supabase.from("tracks").select("*")
      
      // If user is admin (not superadmin), only fetch tracks they are assigned to
      if (profile?.role === "admin") {
        const { data: adminTracks } = await supabase
          .from("admin_track_assignments")
          .select("track_id")
          .eq("admin_user_id", user?.id)
        
        if (adminTracks && adminTracks.length > 0) {
          tracksQuery = tracksQuery.in(
            "id", 
            adminTracks.map(at => at.track_id)
          )
        } else {
          setTracks([])
          setIsLoading(false)
          return
        }
      }

      const { data: tracksData, error: tracksError } = await tracksQuery.order("start_date", { ascending: false })

      if (tracksError) {
        console.error("Error fetching tracks:", tracksError)
        setIsLoading(false)
        return
      }

      // Update track status based on dates
      const updatedTracks = tracksData.map(track => {
        const now = new Date()
        let status = track.status
        
        if (track.start_date && track.end_date) {
          const startDate = new Date(track.start_date)
          const endDate = new Date(track.end_date)
          
          if (now < startDate) {
            status = "upcoming"
          } else if (now >= startDate && now <= endDate) {
            status = "current"
          } else {
            status = "completed"
          }
          
          // Update status in database if it's different
          if (status !== track.status) {
            updateTrackStatus(track.id, status)
            return { ...track, status }
          }
        }
        
        return track
      })

      setTracks(updatedTracks)
      
      if (updatedTracks.length > 0) {
        setSelectedTrack(updatedTracks[0].id)
        
        // Fetch tasks for first track
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*")
          .eq("track_id", updatedTracks[0].id)
          .order("task_order", { ascending: true })
        
        setTasks(tasksData || [])
      }

      // Fetch all users if superadmin
      if (profile?.role === "superadmin") {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("*")
        
        setUsers(usersData || [])
      }

      setIsLoading(false)
    }

    fetchData()
    
    // Set up real-time subscriptions
    const tracksSubscription = supabase
      .channel('tracks-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tracks' 
      }, (_) => {
        fetchData()
      })
      .subscribe()
      
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, (_) => {
        if (selectedTrack) {
          handleTrackSelect(selectedTrack)
        }
      })
      .subscribe()
      
    return () => {
      tracksSubscription.unsubscribe()
      tasksSubscription.unsubscribe()
    }
  }, [user, profile, router, selectedTrack])

  // Function to update track status in database
  const updateTrackStatus = async (trackId: string, status: string) => {
    await supabase
      .from("tracks")
      .update({ status })
      .eq("id", trackId)
  }

  const handleTrackSelect = async (trackId: string) => {
    setSelectedTrack(trackId)
    
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("track_id", trackId)
      .order("task_order", { ascending: true })
    
    setTasks(tasksData || [])
  }

  // CRUD operations for tracks
  const handleCreateTrack = async () => {
    if (!currentTrack || !currentTrack.name) return
    
    try {
      const { error } = await supabase
        .from("tracks")
        .insert({
          name: currentTrack.name,
          description: currentTrack.description || null,
          status: currentTrack.status || "upcoming",
          start_date: currentTrack.start_date,
          end_date: currentTrack.end_date
        })
        .select()
      
      if (error) {
        toast.error("Error creating track", {
          description: error.message
        })
        return
      }
      
      toast.success("Track created", {
        description: `${currentTrack.name} has been created successfully.`
      })
      
      // Refresh the data after creation
      const refreshData = async () => {
        setIsLoading(true)
  
        // Fetch tracks
        let tracksQuery = supabase.from("tracks").select("*")
        
        // If user is admin (not superadmin), only fetch tracks they are assigned to
        if (profile?.role === "admin") {
          const { data: adminTracks } = await supabase
            .from("admin_track_assignments")
            .select("track_id")
            .eq("admin_user_id", user?.id)
          
          if (adminTracks && adminTracks.length > 0) {
            tracksQuery = tracksQuery.in(
              "id", 
              adminTracks.map(at => at.track_id)
            )
          } else {
            setTracks([])
            setIsLoading(false)
            console.log('TRACKS -----',tracks)
            return
          }
        }
  
        const { data: tracksData, error: tracksError } = await tracksQuery.order("start_date", { ascending: false })
  
        if (tracksError) {
          console.error("Error fetching tracks:", tracksError)
          setIsLoading(false)
          return
        }
  
        // Update track status based on dates
        const updatedTracks = tracksData.map(track => {
          const now = new Date()
          let status = track.status
          
          if (track.start_date && track.end_date) {
            const startDate = new Date(track.start_date)
            const endDate = new Date(track.end_date)
            
            if (now < startDate) {
              status = "upcoming"
            } else if (now >= startDate && now <= endDate) {
              status = "current"
            } else {
              status = "completed"
            }
            
            // Update status in database if it's different
            if (status !== track.status) {
              updateTrackStatus(track.id, status)
              return { ...track, status }
            }
          }
          
          return track
        })
  
        setTracks(updatedTracks)
        
        if (updatedTracks.length > 0) {
          setSelectedTrack(updatedTracks[0].id)
          
          // Fetch tasks for first track
          const { data: tasksData } = await supabase
            .from("tasks")
            .select("*")
            .eq("track_id", updatedTracks[0].id)
            .order("task_order", { ascending: true })
          
          setTasks(tasksData || [])
        }
  
        // Fetch all users if superadmin
        if (profile?.role === "superadmin") {
          const { data: usersData } = await supabase
            .from("profiles")
            .select("*")
          
          setUsers(usersData || [])
        }
  
        setIsLoading(false)
      }
      
      refreshData();
      setIsCreatingTrack(false)
      setCurrentTrack(null)
    } catch (error) {
      console.error("Error creating track:", error)
      toast.error("An unexpected error occurred")
    }
  }
  
  const handleUpdateTrack = async () => {
    if (!currentTrack || !currentTrack.id || !currentTrack.name) return
    
    const { error } = await supabase
      .from("tracks")
      .update({
        name: currentTrack.name,
        description: currentTrack.description || null,
        start_date: currentTrack.start_date,
        end_date: currentTrack.end_date
      })
      .eq("id", currentTrack.id)
    
    if (error) {
      toast.error("Error updating track", {
        description: error.message
      })
      return
    }
    
    toast.success("Track updated", {
      description: `${currentTrack.name} has been updated successfully.`
    })
    
    setIsEditingTrack(false)
    setCurrentTrack(null)
  }
  
  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm("Are you sure you want to delete this track? This will also delete all associated tasks.")) {
      return
    }
    
    // First delete all tasks associated with the track
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("track_id", trackId)
    
    if (tasksError) {
      toast.error("Error deleting tasks", {
        description: tasksError.message
      })
      return
    }
    
    // Then delete the track
    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId)
    
    if (error) {
      toast.error("Error deleting track", {
        description: error.message
      })
      return
    }
    
    toast.success("Track deleted", {
      description: "The track and all its tasks have been deleted."
    })
  }

  // CRUD operations for tasks
  const handleCreateTask = async () => {
    if (!currentTask || !currentTask.name || !currentTask.track_id) return
    
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          track_id: currentTask.track_id,
          name: currentTask.name,
          caption: currentTask.caption || null,
          deadline: currentTask.deadline,
          resources_url: currentTask.resources_url || null,
          task_order: currentTask.task_order || 1
        })
        .select()
      
      if (error) {
        toast.error("Error creating task", {
          description: error.message
        })
        return
      }
      
      toast.success("Task created", {
        description: `${currentTask.name} has been created successfully.`
      })
      
      // Refresh the data after creation
      if (selectedTrack) {
        handleTrackSelect(selectedTrack)
      }
      setIsCreatingTask(false)
      setCurrentTask(null)
    } catch (error) {
      console.error("Error creating task:", error)
      toast.error("An unexpected error occurred")
    }
  }
  
  const handleUpdateTask = async () => {
    if (!currentTask || !currentTask.id || !currentTask.name) return
    
    const { error } = await supabase
      .from("tasks")
      .update({
        name: currentTask.name,
        caption: currentTask.caption || null,
        deadline: currentTask.deadline,
        resources_url: currentTask.resources_url || null,
        task_order: currentTask.task_order || 1
      })
      .eq("id", currentTask.id)
    
    if (error) {
      console.error("Error updating task:", error)
      alert(`Error updating task: ${error.message}`)
      return
    }
    
    alert(`Task ${currentTask.name} has been updated successfully.`)
    
    setIsEditingTask(false)
    setCurrentTask(null)
  }
  
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }
    
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
    
    if (error) {
      console.error("Error deleting task:", error)
      alert(`Error deleting task: ${error.message}`)
      return
    }
    
    alert("The task has been deleted successfully.")
  }

  // User management functions
  const handleEditUserRole = async (user: Profile) => {
    const newRole = prompt("Enter new role (user, admin, superadmin):", user.role)
    
    if (!newRole || newRole === user.role || !["user", "admin", "superadmin"].includes(newRole)) {
      return
    }
    
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id)
    
    if (error) {
      console.error("Error updating user role:", error)
      alert(`Error updating user role: ${error.message}`)
      return
    }
    
    alert(`User role updated to ${newRole} successfully.`)
  }
  
  const handleAssignTracks = async (user: Profile) => {
    if (user.role !== "admin") {
      alert("Only admin users can be assigned to tracks.")
      return
    }
    
    // Get current track assignments
    const { data: currentAssignments } = await supabase
      .from("admin_track_assignments")
      .select("track_id")
      .eq("admin_user_id", user.id)
    
    const currentTrackIds = currentAssignments?.map(a => a.track_id) || []
    
    // Simple implementation with confirm dialogs
    // In a real app, you'd use a multi-select UI component
    const trackOptions = tracks.map(track => 
      `${currentTrackIds.includes(track.id) ? "[x]" : "[ ]"} ${track.id}: ${track.name}`
    ).join("\n")
    
    const trackInput = prompt(
      `Enter track ID to toggle assignment for ${user.full_name || user.id}:\n\n${trackOptions}`
    )
    
    if (!trackInput) return
    
    const selectedTrackId = trackInput.trim()
    const trackExists = tracks.some(t => t.id === selectedTrackId)
    
    if (!trackExists) {
      alert("Invalid track ID")
      return
    }
    
    // Toggle assignment
    if (currentTrackIds.includes(selectedTrackId)) {
      // Remove assignment
      const { error } = await supabase
        .from("admin_track_assignments")
        .delete()
        .eq("admin_user_id", user.id)
        .eq("track_id", selectedTrackId)
      
      if (error) {
        console.error("Error removing track assignment:", error)
        alert(`Error removing track assignment: ${error.message}`)
        return
      }
      
      alert(`Track assignment removed successfully.`)
    } else {
      // Add assignment
      const { error } = await supabase
        .from("admin_track_assignments")
        .insert({
          admin_user_id: user.id,
          track_id: selectedTrackId
        })
      
      if (error) {
        console.error("Error adding track assignment:", error)
        alert(`Error adding track assignment: ${error.message}`)
        return
      }
      
      alert(`Track assigned successfully.`)
    }
  }

  return (
    <div className="w-full max-w-full p-3 md:p-6 overflow-x-hidden">
      <h1 className="mb-4 md:mb-8 text-lg md:text-xl font-semibold text-white">
        Admin Panel
      </h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <Tabs defaultValue="tracks" className="w-full">
            <TabsList className="mb-4 md:mb-6 grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger 
                value="tracks" 
                className="border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-white/10 data-[state=active]:text-white text-xs md:text-sm"
              >
                Tracks
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-white/10 data-[state=active]:text-white text-xs md:text-sm"
              >
                Tasks
              </TabsTrigger>
              {profile?.role === "superadmin" && (
                <TabsTrigger 
                  value="users" 
                  className="border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-white/10 data-[state=active]:text-white text-xs md:text-sm"
                >
                  Users
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="tracks">
              <Card className="relative overflow-hidden border border-white/10 bg-black/50 backdrop-blur-md">
                <CardHeader className="border-b border-white/10 p-3 md:p-4 pb-2 md:pb-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                    <CardTitle className="text-base md:text-lg text-white">Manage Tracks</CardTitle>
                    {profile?.role === "superadmin" && (
                      <Button 
                        onClick={() => {
                          setIsCreatingTrack(true)
                          setCurrentTrack({
                            name: "",
                            description: "",
                            status: "upcoming",
                            start_date: null,
                            end_date: null
                          })
                        }}
                        className="border border-white/20 bg-white/10 px-2 py-1 md:px-4 md:py-2 text-white hover:bg-white/20 text-xs md:text-sm"
                      >
                        Add Track
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2 md:p-4 overflow-x-auto">
                  {tracks.length > 0 ? (
                    <div className="overflow-x-auto -mx-2 px-2">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-xs md:text-sm text-gray-400">
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Name</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Status</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Start Date</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">End Date</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tracks.map((track) => (
                            <tr 
                              key={track.id} 
                              className="border-b border-white/10 text-white transition-colors hover:bg-white/5"
                            >
                              <td className="px-2 md:px-4 py-2 md:py-3 font-medium text-xs md:text-sm">{track.name}</td>
                              <td className="px-2 md:px-4 py-2 md:py-3">
                                <span 
                                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] md:text-xs font-medium ${
                                    track.status === "current" 
                                      ? "bg-green-400/20 text-green-300" 
                                      : track.status === "upcoming" 
                                      ? "bg-purple-400/20 text-purple-300" 
                                      : "bg-blue-400/20 text-blue-300"
                                  }`}
                                >
                                  {track.status}
                                </span>
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap">
                                {track.start_date 
                                  ? new Date(track.start_date).toLocaleDateString() 
                                  : "—"}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap">
                                {track.end_date 
                                  ? new Date(track.end_date).toLocaleDateString() 
                                  : "—"}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3">
                                <div className="flex gap-1 md:gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-white/30 text-white hover:border-white/60 hover:bg-white/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                    onClick={() => {
                                      setIsEditingTrack(true)
                                      setCurrentTrack(track)
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-red-400/30 text-red-300 hover:border-red-400/60 hover:bg-red-400/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                    onClick={() => handleDeleteTrack(track.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-gray-500 text-xs md:text-sm">
                      No tracks available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tasks">
              <Card className="relative overflow-hidden border border-white/10 bg-black/50 backdrop-blur-md">
                <CardHeader className="border-b border-white/10 p-3 md:p-4 pb-2 md:pb-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                    <CardTitle className="text-base md:text-lg text-white">
                      Manage Tasks
                      {selectedTrack && (
                        <span className="ml-2 text-xs md:text-sm font-normal text-gray-400 block md:inline-block mt-1 md:mt-0">
                          — for {tracks.find(t => t.id === selectedTrack)?.name}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4">
                      <div>
                        <select 
                          className="rounded-md border border-white/20 bg-black/30 px-2 md:px-3 py-1 text-xs md:text-sm text-white w-full md:w-auto"
                          value={selectedTrack || ""}
                          onChange={(e) => handleTrackSelect(e.target.value)}
                        >
                          {tracks.map(track => (
                            <option key={track.id} value={track.id}>
                              {track.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button 
                        onClick={() => {
                          if (selectedTrack) {
                            setIsCreatingTask(true)
                            setCurrentTask({
                              track_id: selectedTrack,
                              name: "",
                              caption: "",
                              deadline: null,
                              resources_url: "",
                              task_order: tasks.length + 1
                            })
                          }
                        }}
                        disabled={!selectedTrack}
                        className="border border-white/20 bg-white/10 px-2 py-1 md:px-4 md:py-2 text-white hover:bg-white/20 text-xs md:text-sm"
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2 md:p-4 overflow-x-auto">
                  {tasks.length > 0 ? (
                    <div className="overflow-x-auto -mx-2 px-2">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-xs md:text-sm text-gray-400">
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Name</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Deadline</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Resources</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Order</th>
                            <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map((task) => (
                            <tr 
                              key={task.id} 
                              className="border-b border-white/10 text-white transition-colors hover:bg-white/5"
                            >
                              <td className="px-2 md:px-4 py-2 md:py-3 font-medium text-xs md:text-sm">{task.name}</td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap">
                                {task.deadline
                                  ? new Date(task.deadline).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">
                                {task.resources_url ? (
                                  <a 
                                    href={task.resources_url}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-blue-300 hover:underline"
                                  >
                                    View
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm">
                                {task.task_order || "—"}
                              </td>
                              <td className="px-2 md:px-4 py-2 md:py-3">
                                <div className="flex gap-1 md:gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-white/30 text-white hover:border-white/60 hover:bg-white/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                    onClick={() => {
                                      setIsEditingTask(true)
                                      setCurrentTask(task)
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-red-400/30 text-red-300 hover:border-red-400/60 hover:bg-red-400/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                    onClick={() => handleDeleteTask(task.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center text-gray-500 text-xs md:text-sm">
                      {selectedTrack 
                        ? "No tasks available for this track" 
                        : "Please select a track"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {profile?.role === "superadmin" && (
              <TabsContent value="users">
                <Card className="relative overflow-hidden border border-white/10 bg-black/50 backdrop-blur-md">
                  <CardHeader className="border-b border-white/10 p-3 md:p-4 pb-2 md:pb-3">
                    <CardTitle className="text-base md:text-lg text-white">Manage Users</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 md:p-4 overflow-x-auto">
                    {users.length > 0 ? (
                      <div className="overflow-x-auto -mx-2 px-2">
                        <table className="w-full min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/10 text-left text-xs md:text-sm text-gray-400">
                              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Name</th>
                              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Mobile</th>
                              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Role</th>
                              <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => (
                              <tr 
                                key={user.id} 
                                className="border-b border-white/10 text-white transition-colors hover:bg-white/5"
                              >
                                <td className="px-2 md:px-4 py-2 md:py-3 font-medium text-xs md:text-sm">{user.full_name || "—"}</td>
                                <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">{user.mobile_number || "—"}</td>
                                <td className="px-2 md:px-4 py-2 md:py-3">
                                  <span 
                                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] md:text-xs font-medium ${
                                      user.role === "superadmin" 
                                        ? "bg-red-400/20 text-red-300" 
                                        : user.role === "admin" 
                                        ? "bg-purple-400/20 text-purple-300" 
                                        : "bg-blue-400/20 text-blue-300"
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-2 md:px-4 py-2 md:py-3">
                                  <div className="flex gap-1 md:gap-2 flex-wrap">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="border-white/30 text-white hover:border-white/60 hover:bg-white/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                      onClick={() => handleEditUserRole(user)}
                                    >
                                      Edit Role
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="border-purple-400/30 text-purple-300 hover:border-purple-400/60 hover:bg-purple-400/10 text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-1"
                                      onClick={() => handleAssignTracks(user)}
                                    >
                                      Assign
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-gray-500 text-xs md:text-sm">
                        No users found
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
      
      {/* Track Create/Edit Dialog */}
      {(isCreatingTrack || isEditingTrack) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-black p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-base md:text-xl font-semibold text-white">
              {isCreatingTrack ? "Create New Track" : "Edit Track"}
            </h2>
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Name</label>
                <input
                  type="text"
                  value={currentTrack?.name || ""}
                  onChange={(e) => setCurrentTrack({ ...currentTrack, name: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter track name"
                />
              </div>
              
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Description</label>
                <textarea
                  value={currentTrack?.description || ""}
                  onChange={(e) => setCurrentTrack({ ...currentTrack, description: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter track description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Start Date</label>
                  <input
                    type="date"
                    value={currentTrack?.start_date?.split('T')[0] || ""}
                    onChange={(e) => setCurrentTrack({ 
                      ...currentTrack, 
                      start_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                    })}
                    className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  />
                </div>
                
                <div>
                  <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">End Date</label>
                  <input
                    type="date"
                    value={currentTrack?.end_date?.split('T')[0] || ""}
                    onChange={(e) => setCurrentTrack({ 
                      ...currentTrack, 
                      end_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                    })}
                    className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsCreatingTrack(false)
                    setIsEditingTrack(false)
                    setCurrentTrack(null)
                  }}
                  className="rounded-md border border-white/20 bg-transparent px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={isCreatingTrack ? handleCreateTrack : handleUpdateTrack}
                  className="rounded-md bg-white/10 px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm text-white hover:bg-white/20"
                >
                  {isCreatingTrack ? "Create" : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Create/Edit Dialog */}
      {(isCreatingTask || isEditingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-black p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-base md:text-xl font-semibold text-white">
              {isCreatingTask ? "Create New Task" : "Edit Task"}
            </h2>
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Name</label>
                <input
                  type="text"
                  value={currentTask?.name || ""}
                  onChange={(e) => setCurrentTask({ ...currentTask, name: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter task name"
                />
              </div>
              
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Caption</label>
                <textarea
                  value={currentTask?.caption || ""}
                  onChange={(e) => setCurrentTask({ ...currentTask, caption: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter task caption"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Deadline</label>
                <input
                  type="date"
                  value={currentTask?.deadline?.split('T')[0] || ""}
                  onChange={(e) => setCurrentTask({ 
                    ...currentTask, 
                    deadline: e.target.value ? new Date(e.target.value).toISOString() : null 
                  })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                />
              </div>
              
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Resources URL</label>
                <input
                  type="text"
                  value={currentTask?.resources_url || ""}
                  onChange={(e) => setCurrentTask({ ...currentTask, resources_url: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter resources URL"
                />
              </div>
              
              <div>
                <label className="mb-1 md:mb-2 block text-xs md:text-sm text-gray-300">Task Order</label>
                <input
                  type="number"
                  value={currentTask?.task_order || ""}
                  onChange={(e) => setCurrentTask({ 
                    ...currentTask, 
                    task_order: parseInt(e.target.value) || 1
                  })}
                  className="w-full rounded-md border border-white/20 bg-black px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-white"
                  placeholder="Enter task order"
                  min="1"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsCreatingTask(false)
                    setIsEditingTask(false)
                    setCurrentTask(null)
                  }}
                  className="rounded-md border border-white/20 bg-transparent px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={isCreatingTask ? handleCreateTask : handleUpdateTask}
                  className="rounded-md bg-white/10 px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm text-white hover:bg-white/20"
                >
                  {isCreatingTask ? "Create" : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 