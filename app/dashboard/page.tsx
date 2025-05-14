"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Database } from "@/types/supabase"
import { TaskCard, TaskStatus } from "@/components/TaskCard"
import { Badge } from "@/components/ui/badge"
import { Tab } from "@headlessui/react";
import { createClient } from "@/lib/supabase/client"

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
  const [activeTab, setActiveTab] = useState<'current' | 'upcoming' | 'past'>('current')
  const [completedTracks, setCompletedTracks] = useState<string[]>([])
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)

  useEffect(() => {
    // Check if we're in dev mode
    setIsDev(process.env.NODE_ENV === 'development')
    setIsTestUser(searchParams.has('test_user'))
  }, [searchParams])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user && !isTestUser) return
      
      setIsLoading(true)
      
      try {
        // Use createClient() for client-side fetching
        const supabaseClient = createClient()
        
        // Fetch user task progress to determine latest completed task
        const { data: taskProgressData, error: taskProgressError } = await supabaseClient
          .from("user_task_progress")
          .select("task_id, status, updated_at")
          .eq("user_id", user?.id || 'test-user-id')
          .order("updated_at", { ascending: false })
          
        if (taskProgressError) {
          console.error("Error fetching user task progress:", taskProgressError)
        } else {
          // Get completed tracks by fetching tasks and their associated tracks
          const completedTaskIds = taskProgressData
            ?.filter(tp => tp.status === "completed")
            .map(tp => tp.task_id) || []

          const { data: completedTasks, error: completedTasksError } = await supabaseClient
            .from("tasks")
            .select("track_id")
            .in("id", completedTaskIds)

          if (completedTasksError) {
            console.error("Error fetching completed tasks:", completedTasksError)
          } else {
            // remove duplicates from completedTrackIds
            const uniqueCompletedTrackIds = [...new Set(completedTasks.map(task => task.track_id))]
            setCompletedTracks(uniqueCompletedTrackIds)
          }
          
          // Get current track (latest in-progress task's track or first track if none in progress)
          const currentProgressTask = taskProgressData?.find(tp => tp.status === "in-progress")
          let trackId = null;
          
          if (currentProgressTask) {
            const { data: currentTask, error: currentTaskError } = await supabaseClient
              .from("tasks")
              .select("track_id")
              .eq("id", currentProgressTask.task_id)
              .single()

            if (currentTaskError) {
              console.error("Error fetching current task data:", currentTaskError)
            } else {
              trackId = currentTask.track_id;
            }
          } else {
            // If no current progress, find the latest completed task
            const { data: latestCompletedTask, error: latestCompletedTaskError } = await supabaseClient
              .from("user_task_progress")
              .select("task_id")
              .eq("user_id", user?.id || 'test-user-id')
              .eq("status", "completed")
              .order("completed_at", { ascending: false })
              .limit(1)
              .single()
            
            if (!latestCompletedTaskError) {
              // Find the track of the latest completed task
              const { data: taskData, error: taskError } = await supabaseClient
                .from("tasks")
                .select("track_id")
                .eq("id", latestCompletedTask.task_id)
                .single()
              
              if (taskError) {
                console.error("Error fetching task data:", taskError)
              } else {
                trackId = taskData.track_id;
              }
            } else {
              // If no tasks have been completed, set to track with earliest start date
              const { data: earliestTrack, error: earliestTrackError } = await supabaseClient
                .from("tracks")
                .select("*")
                .order("start_date", { ascending: true })
                .limit(1)
                .single()
              
              if (earliestTrackError) {
                console.error("Error fetching earliest track:", earliestTrackError)
              } else {
                trackId = earliestTrack.id;
                console.log('Found earliest track:', earliestTrack)
              }
            }
          }
          
          // Set the track ID and immediately fetch the track data if we have an ID
          if (trackId) {
            setCurrentTrackId(trackId);
            console.log('Setting current track ID to:', trackId);
            
            // Fetch current track data
            const { data: currentTrackData, error: trackError } = await supabaseClient
              .from("tracks")
              .select("*")
              .eq("id", trackId)
              .single()
            
            if (trackError) {
              console.error("Error fetching current track:", trackError)
            } else {
              setCurrentTrack(currentTrackData)
              console.log('Fetched current track data:', currentTrackData)

              // Fetch tasks for current track
              const { data: tasksData, error: tasksError } = await supabaseClient
                .from("tasks")
                .select("*")
                .eq("track_id", currentTrackData.id)
                .order("task_order", { ascending: true })
                
              if (tasksError) {
                console.error("Error fetching tasks:", tasksError)
              } else {
                setTasks(tasksData || [])
                console.log('Fetched tasks:', tasksData)
                
                // Fetch user progress for these tasks
                const { data: progressData, error: progressError } = await supabaseClient
                  .from("user_task_progress")
                  .select("*")
                  .eq("user_id", user?.id || 'test-user-id')
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
    const progressSubscription = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_task_progress',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchDashboardData()
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_track_progress',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchDashboardData()
      })
      .subscribe()
      
    return () => {
      progressSubscription.unsubscribe()
    }
  }, [user, isTestUser])

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true)
      
      try {
        // Use createClient() instead of the imported supabase client for client-side fetching
        const supabaseClient = createClient()
        
        // Fetch tracks with their tasks
        const { data: tracksData, error: tracksError } = await supabaseClient
          .from("tracks")
          .select("*")
          .order("start_date", { ascending: true })

        if (tracksError) {
          console.error("Error fetching tracks:", tracksError)
          setIsLoading(false)
          return
        }
        
        // Add more detailed logging
        console.log('tracksData response:', tracksData)
        
        if (!tracksData || tracksData.length === 0) {
          console.log('No tracks found. Check your Supabase data and permissions.')
          setIsLoading(false)
          return
        }

        // Compile all tasks in sequence
        let compiledTasks: Array<Task & { track_name: string; completed: boolean }> = [];
        
        // Get tasks for each track
        const tracksWithTasks = await Promise.all(
          tracksData.map(async (track) => {
            const { data: tasks, error: tasksError } = await supabaseClient
              .from("tasks")
              .select("*")
              .eq("track_id", track.id)
              .order("task_order", { ascending: true })
            
            if (tasksError) {
              console.error(`Error fetching tasks for track ${track.id}:`, tasksError)
            }
            
            console.log(`Tasks for track ${track.id}:`, tasks)
            
            // Fetch user progress for tasks in this track (only if real user, not test user)
            let progress = 0;
            let userProgress: UserTaskProgress[] = [];
            
            if (user && !isTestUser) {
              const { data: progressData } = await supabaseClient
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
      } catch (err) {
        console.error("Error in track data fetch:", err)
        setIsLoading(false)
      }
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

  // Function to check if a track is completed
  const isTrackCompleted = (trackId: string) => {
    return completedTracks.includes(trackId)
  }
  
  // Function to check if a track is the current track
  const isCurrentTrack = (trackId: string) => {
    return trackId === currentTrackId
  }
  
  // Function to check if a track is unlocked (current or completed)
  const isTrackUnlocked = (trackId: string) => {
    return isCurrentTrack(trackId) || isTrackCompleted(trackId)
  }
  
  // Function to check if a track is upcoming (not current and not completed)
  const isUpcomingTrack = (trackId: string) => {
    return !isCurrentTrack(trackId) && !isTrackCompleted(trackId)
  }
  
  // Function to update track progress
  const updateTrackProgress = async (trackId: string, status: string) => {
    if (!user) return
    
    // Check if all tasks in the track are completed before marking track as completed
    if (status === "completed") {
      const trackTasks = allTasks.filter(task => task.track_id === trackId)
      const allTasksCompleted = trackTasks.every(task => task.completed)
      
      if (!allTasksCompleted) {
        // Cannot mark track as completed if not all tasks are completed
        return
      }
    }
    
    // Check if this track can be updated (only current track or completed tracks)
    if (!isTrackUnlocked(trackId) && status !== "completed") {
      // Cannot update upcoming tracks
      return
    }
    
    const { data: existingProgress } = await supabase
      .from("user_track_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("track_id", trackId)
      .single()
    
    const now = new Date().toISOString()
    
    if (existingProgress) {
      // Update existing progress
      const { error } = await supabase
        .from("user_track_progress")
        .update({ 
          status,
          completed_at: status === "completed" ? now : null,
          updated_at: now
        })
        .eq("id", existingProgress.id)
        
      if (error) {
        console.error("Error updating track progress:", error)
      }
    } else {
      // Create new progress entry
      const { error } = await supabase
        .from("user_track_progress")
        .insert({ 
          user_id: user.id,
          track_id: trackId,
          status,
          completed_at: status === "completed" ? now : null,
          updated_at: now
        })
        
      if (error) {
        console.error("Error creating track progress:", error)
      }
    }
  }

  return (
    <div className="w-full max-w-full p-3 md:p-6 overflow-x-hidden">
      <Suspense fallback={
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
      }>
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
            {/* Tabbed Layout */}
            <Card className="relative border border-white/10 bg-black p-3 md:p-6 overflow-hidden">
              <GlowingEffect 
                blur={16} 
                glow={true} 
                spread={60} 
                variant="white" 
                disabled={false}
                className="z-0"
              />
              
              <Tab.Group defaultIndex={0} onChange={(index) => {
                setActiveTab(index === 0 ? 'current' : index === 1 ? 'upcoming' : 'past');
              }}>
                <Tab.List className="flex space-x-1 rounded-xl bg-white/5 p-1 mb-6">
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-white
                      ${selected ? 'bg-white/10 shadow' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`
                    }
                  >
                    Current Week
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-white
                      ${selected ? 'bg-white/10 shadow' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`
                    }
                  >
                    Upcoming Weeks
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-white
                      ${selected ? 'bg-white/10 shadow' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`
                    }
                  >
                    Past Weeks
                  </Tab>
                </Tab.List>
                
                <Tab.Panels>
                  {/* Current Week Panel */}
                  <Tab.Panel>
                    {currentTrack ? (
                      <div>
                        <div className="mb-4 md:mb-6">
                          <h2 className="font-geist-mono text-lg md:text-xl text-white mb-2 break-words">
                            {currentTrack.name}
                          </h2>
                          <p className="font-geist-mono text-xs md:text-sm text-gray-400">
                            Your current week
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 md:gap-4">
                          {tasks.length > 0 ? (
                            tasks.map((task, index) => {
                              const progress = userProgress[task.id];
                              const taskStatus = getTaskStatus(task, progress);
                              
                              return (
                                <TaskCard 
                                  key={task.id}
                                  task={task} 
                                  deadline={task.deadline || undefined}
                                />
                              );
                            })
                          ) : (
                            <div className="font-geist-mono text-center text-sm text-gray-500 p-4 md:p-8">
                              No tasks available in the current week
                            </div>
                          )}
                        </div>
                        
                        {/* Track completion button - only show if all tasks are completed */}
                        {tasks.length > 0 && tasks.every(task => userProgress[task.id]?.status === "completed") && (
                          <div className="mt-6 flex justify-center">
                            <Button
                              variant="default"
                              className="font-geist-mono bg-white text-black hover:bg-white/90"
                              onClick={async () => {
                                // Mark current track as completed
                                await updateTrackProgress(currentTrack.id, "completed");

                                // Find the next week according to the earliest start date excluding the current week
                                const { data: nextTrack, error } = await supabase
                                  .from("tracks")
                                  .select("id")
                                  .neq("id", currentTrack.id)
                                  .order("start_date", { ascending: true })
                                  .limit(1)
                                  .single();

                                if (error) {
                                  console.error("Error fetching next track:", error);
                                  return;
                                }

                                // Get the first task of the next track
                                const { data: nextTask, error: taskError } = await supabase
                                  .from("tasks")
                                  .select("id")
                                  .eq("track_id", nextTrack.id)
                                  .order("task_order", { ascending: true })
                                  .limit(1)
                                  .single();

                                if (taskError) {
                                  console.error("Error fetching next task:", taskError);
                                  return;
                                }

                                // Set the status of the first task of the next week as 'in-progress'
                                const { error: progressError } = await supabase
                                  .from("user_task_progress")
                                  .insert({
                                    user_id: user?.id,
                                    task_id: nextTask.id,
                                    status: "in-progress",
                                  });

                                if (progressError) {
                                  console.error("Error updating task progress:", progressError);
                                }
                              }}
                            >
                              Complete Week
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="font-geist-mono text-center text-sm text-gray-500 p-4 md:p-8">
                        No current week assigned. Please contact your instructor.
                      </div>
                    )}
                  </Tab.Panel>
                  
                  {/* Upcoming Weeks Panel */}
                  <Tab.Panel>
                    <div className="mb-4 md:mb-6">
                      <h2 className="font-geist-mono text-lg md:text-xl text-white mb-2 break-words">
                        Upcoming Weeks
                      </h2>
                      <p className="font-geist-mono text-xs md:text-sm text-gray-400">
                        Weeks that will be unlocked after you complete the current week
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {tracks.filter(track => isUpcomingTrack(track.id)).length > 0 ? (
                        tracks
                          .filter(track => isUpcomingTrack(track.id))
                          .map(track => (
                            <Card key={track.id} className="border border-white/10 bg-black/50 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-geist-mono text-base text-white">{track.name}</h3>
                                <Badge variant="outline" className="text-gray-400 border-gray-500">Locked</Badge>
                              </div>
                              <p className="text-sm text-gray-400 mb-3">{track.description}</p>
                              <div className="text-xs text-gray-500">
                                Complete the current week to unlock this content
                              </div>
                            </Card>
                          ))
                      ) : (
                        <div className="font-geist-mono text-center text-sm text-gray-500 p-4 md:p-8">
                          No upcoming weeks available
                        </div>
                      )}
                    </div>
                  </Tab.Panel>
                  
                  {/* Past Weeks Panel */}
                  <Tab.Panel>
                    <div className="mb-4 md:mb-6">
                      <h2 className="font-geist-mono text-lg md:text-xl text-white mb-2 break-words">
                        Past Weeks
                      </h2>
                      <p className="font-geist-mono text-xs md:text-sm text-gray-400">
                        Weeks you have already completed
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {tracks.filter(track => isTrackCompleted(track.id)).length > 0 ? (
                        tracks
                          .filter(track => isTrackCompleted(track.id))
                          .map(track => (
                            <Card key={track.id} className="border border-white/10 bg-black/50 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-geist-mono text-base text-white">{track.name}</h3>
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Completed</Badge>
                              </div>
                              <p className="text-sm text-gray-400 mb-3">{track.description}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5 text-xs"
                                asChild
                              >
                                <Link href={`/dashboard/tracks/${track.id}`}>Review Week</Link>
                              </Button>
                            </Card>
                          ))
                      ) : (
                        <div className="font-geist-mono text-center text-sm text-gray-500 p-4 md:p-8">
                          No completed weeks yet
                        </div>
                      )}
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </Card>

            {/* Progress Overview */}
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
                            {isTrackCompleted(track.id) ? "100" : track.progress}%
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-white"
                            style={{ width: `${isTrackCompleted(track.id) ? 100 : track.progress}%` }}
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
                          {completedTracks.length}/{tracks.length}
                        </div>
                        <div className="font-geist-mono text-[10px] md:text-xs text-gray-400">Weeks Completed</div>
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
      </Suspense>
    </div>
  )
} 