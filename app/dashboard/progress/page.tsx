"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Database } from "@/types/supabase"
import { Badge } from "@/components/ui/badge"

type Track = Database["public"]["Tables"]["tracks"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]
type UserTaskProgress = Database["public"]["Tables"]["user_task_progress"]["Row"]

export default function ProgressPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [tracks, setTracks] = useState<Track[]>([])
  const [tasksByTrack, setTasksByTrack] = useState<Record<string, Task[]>>({})
  const [userProgress, setUserProgress] = useState<Record<string, UserTaskProgress>>({})
  
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user) return
      
      setIsLoading(true)
      
      try {
        // Fetch all tracks
        const { data: tracksData, error: tracksError } = await supabase
          .from("tracks")
          .select("*")
          .order("start_date", { ascending: false })
          
        if (tracksError) {
          console.error("Error fetching tracks:", tracksError)
          setIsLoading(false)
          return
        }
        
        setTracks(tracksData || [])
        
        if (tracksData && tracksData.length > 0) {
          // Fetch all tasks for these tracks
          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("*")
            .in("track_id", tracksData.map(t => t.id))
            .order("task_order", { ascending: true })
            
          if (tasksError) {
            console.error("Error fetching tasks:", tasksError)
          } else {
            // Group tasks by track
            const taskMap: Record<string, Task[]> = {}
            tasksData?.forEach(task => {
              if (!taskMap[task.track_id]) {
                taskMap[task.track_id] = []
              }
              taskMap[task.track_id].push(task)
            })
            setTasksByTrack(taskMap)
            
            // Get all task IDs
            const allTaskIds = tasksData?.map(t => t.id) || []
            
            if (allTaskIds.length > 0) {
              // Fetch user progress for these tasks
              const { data: progressData, error: progressError } = await supabase
                .from("user_task_progress")
                .select("*")
                .eq("user_id", user.id)
                .in("task_id", allTaskIds)
                
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
      } catch (err) {
        console.error("Error in progress data fetch:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserProgress()
    
    // Set up real-time subscriptions for progress updates
    const progressSubscription = supabase
      .channel('progress-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_task_progress',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchUserProgress()
      })
      .subscribe()
      
    return () => {
      progressSubscription.unsubscribe()
    }
  }, [user])
  
  // Calculate progress percentage for a track
  const calculateTrackProgress = (trackId: string) => {
    const tasks = tasksByTrack[trackId] || []
    if (tasks.length === 0) return 0
    
    let completedCount = 0
    tasks.forEach(task => {
      const progress = userProgress[task.id]
      if (progress && progress.status === "completed") {
        completedCount++
      }
    })
    
    return Math.round((completedCount / tasks.length) * 100)
  }

  return (
    <div className="w-full max-w-full p-3 md:p-6 overflow-x-hidden">
      <h1 className="mb-4 md:mb-8 text-lg md:text-xl font-semibold text-white">My Progress</h1>

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
        <div className="space-y-4 md:space-y-6 min-w-0">
          {tracks.length > 0 ? (
            tracks.map(track => {
              const tasks = tasksByTrack[track.id] || []
              const progressPercent = calculateTrackProgress(track.id)
              
              return (
                <Card key={track.id} className="border border-white/10 bg-black/50 backdrop-blur-md">
                  <CardHeader className="p-3 md:p-4 pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="w-full md:w-auto">
                        <CardTitle className="text-base md:text-lg text-white break-words">{track.name}</CardTitle>
                        <p className="text-xs md:text-sm text-gray-400 break-words">{track.description}</p>
                      </div>
                      <Badge 
                        className={`mt-1 md:mt-0 px-2 md:px-3 py-0.5 md:py-1 text-xs uppercase ${
                          track.status === "current" 
                            ? "bg-green-400/20 text-green-300" 
                            : track.status === "upcoming" 
                            ? "bg-purple-400/20 text-purple-300" 
                            : "bg-blue-400/20 text-blue-300"
                        }`}
                      >
                        {track.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs md:text-sm text-gray-400">
                        Progress: {progressPercent}%
                      </span>
                      <span className="text-xs md:text-sm text-gray-400">
                        {tasks.filter(t => userProgress[t.id]?.status === "completed").length} / {tasks.length} tasks
                      </span>
                    </div>
                    
                    <div className="mb-3 md:mb-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    
                    {tasks.length > 0 ? (
                      <div className="space-y-2">
                        {tasks.map(task => {
                          const progress = userProgress[task.id]
                          
                          return (
                            <div key={task.id} className="flex items-center justify-between rounded border border-white/10 p-2">
                              <span className="text-xs md:text-sm text-white truncate mr-2 max-w-[60%] md:max-w-[70%] break-words">
                                {task.name}
                              </span>
                              <span 
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] md:text-xs whitespace-nowrap ${
                                  !progress 
                                    ? "bg-gray-400/20 text-gray-300" 
                                    : progress.status === "completed" 
                                    ? "bg-green-400/20 text-green-300" 
                                    : progress.status === "in-progress" 
                                    ? "bg-blue-400/20 text-blue-300" 
                                    : "bg-gray-400/20 text-gray-300"
                                }`}
                              >
                                {!progress 
                                  ? "Not Started" 
                                  : progress.status === "completed" 
                                  ? "Completed" 
                                  : progress.status === "in-progress" 
                                  ? "In Progress" 
                                  : "Not Started"}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-xs md:text-sm text-gray-400">No tasks for this track yet</p>
                    )}
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-black/30">
              <p className="text-xs md:text-sm text-gray-400">No tracks available yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 