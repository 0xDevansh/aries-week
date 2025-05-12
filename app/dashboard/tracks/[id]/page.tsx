"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Database } from "@/types/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { TaskCard } from "@/components/TaskCard"

type Track = Database["public"]["Tables"]["tracks"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]
type UserTaskProgress = Database["public"]["Tables"]["user_task_progress"]["Row"]

export default function WeekDetailPage({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [track, setTrack] = useState<Track | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userProgress, setUserProgress] = useState<UserTaskProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editMode, setEditMode] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrackDetails = async () => {
      setIsLoading(true)
      
      // Fetch track details
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .select("*")
        .eq("id", params.id)
        .single()

      if (trackError) {
        console.error("Error fetching track:", trackError)
        setIsLoading(false)
        router.push("/dashboard/tracks")
        return
      }

      setTrack(trackData)

      // Fetch tasks for this track
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("track_id", params.id)
        .order("task_order", { ascending: true })

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError)
      } else {
        setTasks(tasksData || [])
      }

      // Fetch user progress for these tasks
      if (tasksData?.length) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_task_progress")
          .select("*")
          .eq("user_id", user.id)
          .in(
            "task_id",
            tasksData.map((task) => task.id)
          )

        if (progressError) {
          console.error("Error fetching progress:", progressError)
        } else {
          setUserProgress(progressData || [])
        }
      }

      setIsLoading(false)
    }

    fetchTrackDetails()
  }, [params.id, user, router])

  // Calculate overall progress
  const calculateProgress = () => {
    if (!tasks.length) return 0
    
    const completedTasks = userProgress.filter(p => p.status === "completed").length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  // Get the status of a specific task
  const getTaskStatus = (taskId: string) => {
    const progress = userProgress.find(p => p.task_id === taskId)
    return progress?.status || "pending"
  }

  // Get the completion date of a task
  const getTaskCompletionDate = (taskId: string) => {
    const progress = userProgress.find(p => p.task_id === taskId)
    return progress?.completed_at
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          className="font-geist-mono text-xs text-white"
          asChild
        >
          <Link href="/dashboard/tracks">← Back to All Weeks</Link>
        </Button>
        
        {isAdmin && (
          <Button
            variant="outline"
            className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
            onClick={() => setEditMode(editMode ? null : "track")}
          >
            {editMode ? "Cancel Edit" : "Edit Week"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            {editMode === "track" ? (
              <Card className="relative overflow-hidden border border-white/10 bg-black p-6">
                <GlowingEffect 
                  blur={16} 
                  glow={true} 
                  spread={60} 
                  variant="white"
                  disabled={false}
                  className="z-0"
                />
                <CardContent className="flex flex-col gap-4 p-0">
                  <div className="space-y-2">
                    <label className="font-geist-mono text-xs text-gray-400">Week Name</label>
                    <input 
                      type="text" 
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                      defaultValue={track?.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-geist-mono text-xs text-gray-400">Description</label>
                    <textarea 
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                      defaultValue={track?.description || ""}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-geist-mono text-xs text-gray-400">Start Date</label>
                      <input 
                        type="date" 
                        className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                        defaultValue={track?.start_date?.split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-geist-mono text-xs text-gray-400">End Date</label>
                      <input 
                        type="date" 
                        className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                        defaultValue={track?.end_date?.split('T')[0]}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-geist-mono text-xs text-gray-400">Status</label>
                    <select 
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                      defaultValue={track?.status}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="current">Current</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
                      onClick={() => setEditMode(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="font-geist-mono bg-white text-black hover:bg-white/90"
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <h1 className="font-geist-mono mb-2 text-4xl font-light tracking-[-0.04em] text-white">
                  {track?.name}
                </h1>
                <p className="font-geist-mono text-sm text-gray-400">
                  {track?.description}
                </p>
                
                <div className="mt-4">
                  <div className="font-geist-mono flex justify-between text-sm">
                    <span className="text-gray-400">Overall Progress</span>
                    <span className="text-white">{calculateProgress()}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-white"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
                
                <div className="mt-2 flex font-geist-mono text-xs text-gray-400">
                  <div className="mr-4">
                    <span className="text-white">Start:</span>{" "}
                    {track?.start_date
                      ? new Date(track.start_date).toLocaleDateString()
                      : "N/A"}
                  </div>
                  <div>
                    <span className="text-white">End:</span>{" "}
                    {track?.end_date
                      ? new Date(track.end_date).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-geist-mono text-2xl font-light text-white">
              Tasks
            </h2>
            
            {isAdmin && (
              <Button
                variant="outline"
                className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
                onClick={() => setShowAddTask(true)}
              >
                Add Task
              </Button>
            )}
          </div>

          {tasks.length === 0 ? (
            <Card className="relative overflow-hidden border border-white/10 bg-black p-6 text-center">
              <GlowingEffect 
                blur={12} 
                glow={true} 
                spread={30} 
                variant="white"
                disabled={false}
                className="z-0"
              />
              <p className="font-geist-mono text-gray-400">No tasks available for this week</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => {
                const taskStatus = getTaskStatus(task.id)
                const isCompleted = taskStatus === "completed"
                const completionDate = getTaskCompletionDate(task.id)
                
                return (
                  <Card 
                    key={task.id} 
                    className={`relative overflow-hidden border bg-black ${
                      isCompleted ? "border-white/10" : "border-white/10"
                    }`}
                  >
                    <GlowingEffect 
                      blur={8} 
                      glow={true} 
                      spread={20} 
                      variant="white"
                      disabled={false}
                      className="z-0"
                    />
                    <CardHeader className="border-b border-white/10 pb-3">
                      <CardTitle className="font-geist-mono flex items-center justify-between text-sm font-normal text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30">
                            {isCompleted ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <span className="h-3 w-3">{task.task_order}</span>
                            )}
                          </div>
                          {task.name}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-400">
                            {isCompleted && completionDate
                              ? `Completed on ${new Date(completionDate).toLocaleDateString()}`
                              : task.deadline
                              ? `Due ${new Date(task.deadline).toLocaleDateString()}`
                              : ""}
                          </div>
                          
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 rounded-full p-0 text-gray-400 hover:bg-white/5 hover:text-white"
                              onClick={() => setEditMode(task.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {editMode === task.id ? (
                      <CardContent className="flex flex-col gap-4 p-6">
                        <div className="space-y-2">
                          <label className="font-geist-mono text-xs text-gray-400">Task Name</label>
                          <input 
                            type="text" 
                            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                            defaultValue={task.name}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="font-geist-mono text-xs text-gray-400">Caption</label>
                          <textarea 
                            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                            defaultValue={task.caption || ""}
                            rows={2}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="font-geist-mono text-xs text-gray-400">Deadline</label>
                            <input 
                              type="date" 
                              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                              defaultValue={task.deadline?.split('T')[0]}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="font-geist-mono text-xs text-gray-400">Task Order</label>
                            <input 
                              type="number" 
                              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                              defaultValue={task.task_order ? task.task_order : 1}
                              min="1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="font-geist-mono text-xs text-gray-400">Resources URL</label>
                          <input 
                            type="url" 
                            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                            defaultValue={task.resources_url || ""}
                            placeholder="https://example.com/resources"
                          />
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
                            onClick={() => setEditMode(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="font-geist-mono bg-white text-black hover:bg-white/90"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="p-6">
                        <p className="font-geist-mono mb-4 text-sm text-gray-400">
                          {task.caption}
                        </p>
                        
                        {task.resources_url && (
                          <Button
                            variant="outline"
                            className="font-geist-mono text-xs text-white hover:bg-white/5"
                            asChild
                          >
                            <Link 
                              href={task.resources_url} 
                              target="_blank"
                            >
                              View Resources
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
      
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="relative w-full max-w-md border border-white/10 bg-black p-6">
            <GlowingEffect 
              blur={16} 
              glow={true} 
              spread={60} 
              variant="white" 
              disabled={false}
              className="z-0"
            />
            <CardHeader className="px-0 pt-0">
              <CardTitle className="font-geist-mono text-lg text-white">Add New Task</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Task Name</label>
                <input 
                  type="text" 
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  placeholder="e.g. Complete Project Setup"
                />
              </div>
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Caption</label>
                <textarea 
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  placeholder="Brief description of the task"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-geist-mono text-xs text-gray-400">Deadline</label>
                  <input 
                    type="date" 
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-geist-mono text-xs text-gray-400">Task Order</label>
                  <input 
                    type="number" 
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                    defaultValue={tasks.length + 1}
                    min="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Resources URL</label>
                <input 
                  type="url" 
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  placeholder="https://example.com/resources"
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-white/10">
              <Button
                variant="outline"
                className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
                onClick={() => setShowAddTask(false)}
              >
                Cancel
              </Button>
              <Button
                className="font-geist-mono bg-white text-black hover:bg-white/90"
                onClick={() => setShowAddTask(false)}
              >
                Add Task
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
} 