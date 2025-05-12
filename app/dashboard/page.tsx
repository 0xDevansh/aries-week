"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Database } from "@/types/supabase"
import { TaskCard } from "@/components/TaskCard"
import { Badge } from "@/components/ui/badge"

type Track = Database["public"]["Tables"]["tracks"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]
type UserTaskProgress = Database["public"]["Tables"]["user_task_progress"]["Row"]

export default function Dashboard() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tracks, setTracks] = useState<Array<Track & { tasks: Task[]; progress: number }>>([])
  const [allTasks, setAllTasks] = useState<Array<Task & { track_name: string; completed: boolean }>>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1)
  const [isLoading, setIsLoading] = useState(true)
  const [isDev, setIsDev] = useState(false)
  const [isTestUser, setIsTestUser] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userProgress, setUserProgress] = useState<Record<string, UserTaskProgress>>({})

  useEffect(() => {
    // Check if we're in dev mode
    setIsDev(process.env.NODE_ENV === 'development')
    setIsTestUser(searchParams.has('test_user'))
  }, [searchParams])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return
      
      setIsLoading(true)
      
      try {
        // Fetch current track
        const { data: currentTrackData, error: trackError } = await supabase
          .from("tracks")
          .select("*")
          .eq("status", "current")
          .single()
          
        if (trackError && trackError.code !== "PGRST116") {
          console.error("Error fetching current track:", trackError)
          setIsLoading(false)
          return
        }
        
        if (currentTrackData) {
          setCurrentTrack(currentTrackData)
          
          // Fetch tasks for current track
          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .eq("track_id", currentTrackData.id)
            .order("task_order", { ascending: true })
            
          if (tasksError) {
            console.error("Error fetching tasks:", tasksError)
          } else {
            setTasks(tasksData || [])
            
            // Fetch user progress for these tasks
            const { data: progressData, error: progressError } = await supabase
              .from("user_task_progress")
              .select("*")
              .eq("user_id", user.id)
              .in("task_id", tasksData?.map(t => t.id) || [])
              
            if (progressError) {
              console.error("Error fetching user progress:", progressError)
            } else {
              // Create a lookup map for easier access
              const progressMap: Record<string, UserTaskProgress> = {}
              progressData?.forEach(progress => {
                progressMap[progress.task_id] = progress
              })
              setUserProgress(progressMap)
            }
          }
        }
      } catch (err) {
        console.error("Error in dashboard data fetch:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboardData()
    
    // Set up real-time subscriptions
    const tasksSubscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_task_progress',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchDashboardData()
      })
      .subscribe()
      
    return () => {
      tasksSubscription.unsubscribe()
    }
  }, [user])

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true)
      // Fetch tracks with their tasks
      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .order("start_date", { ascending: true })

      if (tracksError) {
        console.error("Error fetching tracks:", tracksError)
        setIsLoading(false)
        return
      }

      // Compile all tasks in sequence
      let compiledTasks: Array<Task & { track_name: string; completed: boolean }> = [];
      
      // Get tasks for each track
      const tracksWithTasks = await Promise.all(
        tracksData.map(async (track) => {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("*")
            .eq("track_id", track.id)
            .order("task_order", { ascending: true })

          // Fetch user progress for tasks in this track (only if real user, not test user)
          let progress = 0;
          let userProgress: UserTaskProgress[] = [];
          
          if (user && !isTestUser) {
            const { data: progressData } = await supabase
              .from("user_task_progress")
              .select("*")
              .eq("user_id", user.id)
              .in(
                "task_id",
                tasks?.map((t: Task) => t.id) || []
              )
            
            userProgress = progressData || [];
            
            // Calculate progress percentage
            const completedTasks = userProgress.filter(
              (p) => p.status === "completed"
            ).length || 0
            
            progress = tasks?.length
              ? Math.round((completedTasks / tasks.length) * 100)
              : 0
          } else if (isTestUser) {
            // For test user: random progress between 10-90%
            progress = Math.floor(Math.random() * 80) + 10;
          }
          
          // Add to compiled tasks list
          if (tasks) {
            const tasksWithTrackInfo = tasks.map((t: Task) => ({
              ...t, 
              track_name: track.name,
              completed: userProgress.some(p => p.task_id === t.id && p.status === 'completed')
            }));
            compiledTasks = [...compiledTasks, ...tasksWithTrackInfo];
          }

          return {
            ...track,
            tasks: tasks || [],
            progress,
          }
        })
      )

      setTracks(tracksWithTasks)
      setAllTasks(compiledTasks)
      
      // Find the current task index
      if (compiledTasks.length > 0) {
        let currentTaskIdx = 0;
        if (user && !isTestUser) {
          // Find the first incomplete task
          currentTaskIdx = compiledTasks.findIndex((task) => !task.completed);
          
          // If all tasks completed, point to the last task
          if (currentTaskIdx === -1) {
            currentTaskIdx = compiledTasks.length - 1;
          }
        } else if (isTestUser) {
          // For test user, choose a random task as current
          currentTaskIdx = Math.floor(Math.random() * compiledTasks.length);
        }
        
        setCurrentTaskIndex(currentTaskIdx);
      }
      
      setIsLoading(false)
    }

    fetchTracks()
  }, [user, isTestUser])

  // Get current week/track name
  const getCurrentWeekName = () => {
    if (currentTaskIndex >= 0 && currentTaskIndex < allTasks.length) {
      return allTasks[currentTaskIndex].track_name;
    }
    return "";
  }
  
  // Calculate overall progress
  const getOverallProgress = () => {
    if (allTasks.length === 0) return 0;
    const completedCount = allTasks.filter(task => task.completed).length;
    return Math.round((completedCount / allTasks.length) * 100);
  }

  // Function to calculate time remaining
  const getTimeRemaining = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const timeRemaining = deadlineDate.getTime() - now.getTime()
    
    if (timeRemaining <= 0) {
      return { expired: true, text: "Expired" }
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return { expired: false, text: `${days}d ${hours}h remaining` }
    } else {
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
      return { expired: false, text: `${hours}h ${minutes}m remaining` }
    }
  }
  
  // Function to determine task status display
  const getTaskStatus = (task: Task, progress?: UserTaskProgress) => {
    if (!progress) {
      return { status: "not-started", label: "Not Started", color: "bg-gray-400/20 text-gray-300" }
    }
    
    if (progress.status === "completed") {
      return { status: "completed", label: "Completed", color: "bg-green-400/20 text-green-300" }
    }
    
    if (progress.status === "in-progress") {
      return { status: "in-progress", label: "In Progress", color: "bg-blue-400/20 text-blue-300" }
    }
    
    return { status: "not-started", label: "Not Started", color: "bg-gray-400/20 text-gray-300" }
  }
  
  // Function to handle task status updates
  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!user) return
    
    const existingProgress = userProgress[taskId]
    const now = new Date().toISOString()
    
    if (existingProgress) {
      // Update existing progress
      const { error } = await supabase
        .from("user_task_progress")
        .update({ 
          status,
          completed_at: status === "completed" ? now : null,
          updated_at: now
        })
        .eq("id", existingProgress.id)
        
      if (error) {
        console.error("Error updating task progress:", error)
      }
    } else {
      // Create new progress entry
      const { error } = await supabase
        .from("user_task_progress")
        .insert({ 
          user_id: user.id,
          task_id: taskId,
          status,
          completed_at: status === "completed" ? now : null,
          updated_at: now
        })
        
      if (error) {
        console.error("Error creating task progress:", error)
      }
    }
  }

  return (
    <div className="w-full max-w-full p-3 md:p-6 overflow-x-hidden">
      {isDev && isTestUser && (
        <div className="fixed top-0 left-0 bg-green-600 text-black text-xs px-2 py-1 m-2 rounded-sm z-50">
          DEV MODE - Test User Access (No Auth)
        </div>
      )}
      
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
        <div className="grid grid-cols-1 gap-6 min-w-0">
          {/* Main Task Layout Section - Vertical Tasks */}
          <div className="relative col-span-1">
            <Card className="relative border border-white/10 bg-black p-3 md:p-6 overflow-hidden">
              <GlowingEffect 
                blur={16} 
                glow={true} 
                spread={60} 
                variant="white" 
                disabled={false}
                className="z-0"
              />
              
              <div className="mb-4 md:mb-6">
                <h2 className="font-geist-mono text-lg md:text-xl text-white mb-2 break-words">
                  {getCurrentWeekName()}
                </h2>
                <p className="font-geist-mono text-xs md:text-sm text-gray-400">
                  Your progress through the course
                </p>
              </div>
              
              <div className="flex flex-col gap-3 md:gap-4">
                {allTasks.length > 0 ? (
                  <>
                    {/* Previous task - only show if there is a previous task */}
                    {currentTaskIndex > 0 && (
                      <TaskCard 
                        task={allTasks[currentTaskIndex - 1]} 
                        status="previous"
                        progress={100}
                        deadline={allTasks[currentTaskIndex - 1].deadline || undefined}
                      />
                    )}
                    
                    {/* Current task */}
                    {currentTaskIndex >= 0 && currentTaskIndex < allTasks.length && (
                      <TaskCard 
                        task={allTasks[currentTaskIndex]} 
                        status="current"
                        progress={allTasks[currentTaskIndex].completed ? 100 : 0}
                        deadline={allTasks[currentTaskIndex].deadline || undefined}
                      />
                    )}
                    
                    {/* Future task - only show if there is a next task */}
                    {currentTaskIndex < allTasks.length - 1 && (
                      <TaskCard 
                        task={allTasks[currentTaskIndex + 1]} 
                        status="future"
                        deadline={allTasks[currentTaskIndex + 1].deadline || undefined}
                      />
                    )}
                  </>
                ) : (
                  <div className="font-geist-mono text-center text-sm text-gray-500 p-4 md:p-8">
                    No tasks available in the current track
                  </div>
                )}
              </div>
              
              {/* Overall Progress */}
              <div className="mt-6 md:mt-8 border-t border-white/10 pt-4">
                <div className="font-geist-mono flex justify-between text-xs md:text-sm">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-white">{getOverallProgress()}% Complete</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${getOverallProgress()}%` }}
                  />
                </div>
              </div>
              
              {/* Timer for next deadline */}
              {allTasks.length > 0 && currentTaskIndex >= 0 && currentTaskIndex < allTasks.length && allTasks[currentTaskIndex].deadline && (
                <div className="mt-4 p-2 md:p-3 border border-white/10 rounded-md bg-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-gray-400">Next Deadline:</span>
                    <span className={`text-xs md:text-sm font-medium ${
                      getTimeRemaining(allTasks[currentTaskIndex].deadline || "").expired 
                        ? "text-red-300" 
                        : "text-blue-300"
                    }`}>
                      {getTimeRemaining(allTasks[currentTaskIndex].deadline || "").text}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5 text-xs md:text-sm px-2 py-1 md:px-4 md:py-2"
                  asChild
                >
                  <Link href="/dashboard/tracks">View All Weeks</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Next Course Milestones */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Weeks Overview */}
            <Card className="relative overflow-hidden border border-white/10 bg-black">
              <GlowingEffect 
                blur={12} 
                glow={true} 
                spread={30} 
                variant="white"
                disabled={false}
                className="z-0"
              />
              <CardHeader className="border-b border-white/10 p-3 md:pb-3">
                <CardTitle className="font-geist-mono flex items-center gap-1 md:gap-2 text-xs font-normal text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 md:h-4 md:w-4"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  WEEKS OVERVIEW
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 overflow-hidden">
                <div className="space-y-3 md:space-y-4">
                  {tracks.map((track) => (
                    <div key={track.id} className="flex flex-col gap-1 md:gap-2">
                      <div className="flex justify-between">
                        <h3 className="font-sans text-sm md:text-base font-light tracking-[-0.02em] text-white truncate mr-2">
                          {track.name}
                        </h3>
                        <span className="font-geist-mono text-xs text-gray-400 whitespace-nowrap">
                          {track.progress}%
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-white"
                          style={{ width: `${track.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Stats */}
            <Card className="relative overflow-hidden border border-white/10 bg-black">
              <GlowingEffect 
                blur={12} 
                glow={true} 
                spread={30} 
                variant="white"
                disabled={false}
                className="z-0"
              />
              <CardHeader className="border-b border-white/10 p-3 md:pb-3">
                <CardTitle className="font-geist-mono flex items-center gap-1 md:gap-2 text-xs font-normal text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 md:h-4 md:w-4"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  YOUR PROGRESS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded bg-white/5 p-2 text-center">
                      <div className="font-sans text-base md:text-xl font-light text-white">
                        {allTasks.filter(task => task.completed).length}/{allTasks.length}
                      </div>
                      <div className="font-geist-mono text-[10px] md:text-xs text-gray-400">Tasks Completed</div>
                    </div>
                    <div className="rounded bg-white/5 p-2 text-center">
                      <div className="font-sans text-base md:text-xl font-light text-white">
                        {tracks.length}
                      </div>
                      <div className="font-geist-mono text-[10px] md:text-xs text-gray-400">Total Weeks</div>
                    </div>
                    <div className="col-span-2 mt-2 rounded bg-white/5 p-2 text-center">
                      <div className="font-sans text-base md:text-xl font-light text-white">
                        {getOverallProgress()}%
                      </div>
                      <div className="font-geist-mono text-[10px] md:text-xs text-gray-400">Course Completion</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
} 