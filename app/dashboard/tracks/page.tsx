"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Database } from "@/types/supabase"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"

type Track = Database["public"]["Tables"]["tracks"]["Row"]
type Task = Database["public"]["Tables"]["tasks"]["Row"]

export default function AllWeeksPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [tracks, setTracks] = useState<
    Array<Track & { tasks: Task[]; progress: number }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddTrack, setShowAddTrack] = useState(false)

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

      // Get tasks for each track
      const tracksWithTasks = await Promise.all(
        tracksData.map(async (track) => {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("*")
            .eq("track_id", track.id)
            .order("task_order", { ascending: true })

          // Fetch user progress for tasks in this track
          const { data: userProgress } = await supabase
            .from("user_task_progress")
            .select("*")
            .eq("user_id", user.id)
            .in(
              "task_id",
              tasks?.map((task) => task.id) || []
            )

          // Calculate progress percentage
          const completedTasks = userProgress?.filter(
            (progress) => progress.status === "completed"
          ).length || 0
          
          const progress = tasks?.length
            ? Math.round((completedTasks / tasks.length) * 100)
            : 0

          return {
            ...track,
            tasks: tasks || [],
            progress,
          }
        })
      )

      setTracks(tracksWithTasks)
      setIsLoading(false)
    }

    fetchTracks()
  }, [user, router])

  // Organize tracks by status
  const currentTracks = tracks.filter((track) => track.status === "current")
  const upcomingTracks = tracks.filter((track) => track.status === "upcoming")
  const pastTracks = tracks.filter((track) => track.status === "past")

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-geist-mono text-4xl font-light tracking-[-0.04em] text-white">
          All Weeks
        </h1>
        
        {(profile?.role === "admin" || profile?.role === "superadmin") && (
          <Button
            variant="outline"
            className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
            onClick={() => setShowAddTrack(true)}
          >
            Add New Week
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid gap-8">
          {/* Current Week(s) */}
          <div>
            <h2 className="font-geist-mono mb-4 text-xl font-light text-white">Current Week</h2>
            {currentTracks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentTracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            ) : (
              <Card className="relative overflow-hidden border border-white/10 bg-black p-6 text-center">
                <GlowingEffect 
                  blur={12} 
                  glow={true} 
                  spread={30} 
                  variant="white"
                  disabled={false}
                  className="z-0"
                />
                <p className="font-geist-mono text-gray-400">No current week available</p>
              </Card>
            )}
          </div>

          {/* Upcoming Weeks */}
          <div>
            <h2 className="font-geist-mono mb-4 text-xl font-light text-white">Upcoming Weeks</h2>
            {upcomingTracks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingTracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            ) : (
              <Card className="relative overflow-hidden border border-white/10 bg-black p-6 text-center">
                <GlowingEffect 
                  blur={12} 
                  glow={true} 
                  spread={30} 
                  variant="white"
                  disabled={false}
                  className="z-0"
                />
                <p className="font-geist-mono text-gray-400">No upcoming weeks available</p>
              </Card>
            )}
          </div>

          {/* Past Weeks */}
          <div>
            <h2 className="font-geist-mono mb-4 text-xl font-light text-white">Past Weeks</h2>
            {pastTracks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastTracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            ) : (
              <Card className="relative overflow-hidden border border-white/10 bg-black p-6 text-center">
                <GlowingEffect 
                  blur={12} 
                  glow={true} 
                  spread={30} 
                  variant="white"
                  disabled={false}
                  className="z-0"
                />
                <p className="font-geist-mono text-gray-400">No past weeks available</p>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Add Track Dialog would go here - placeholder for now */}
      {showAddTrack && (
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
              <CardTitle className="font-geist-mono text-lg text-white">Add New Week</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Week Name</label>
                <input 
                  type="text" 
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  placeholder="e.g. Week 1: Introduction"
                />
              </div>
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Description</label>
                <textarea 
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  placeholder="What will this week cover?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-geist-mono text-xs text-gray-400">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-geist-mono text-xs text-gray-400">End Date</label>
                  <input 
                    type="date" 
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-geist-mono text-xs text-gray-400">Status</label>
                <select className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-white">
                  <option value="upcoming">Upcoming</option>
                  <option value="current">Current</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 px-0 pb-0">
              <Button
                variant="outline"
                className="font-geist-mono border-white/20 bg-transparent text-white hover:bg-white/5"
                onClick={() => setShowAddTrack(false)}
              >
                Cancel
              </Button>
              <Button
                className="font-geist-mono bg-white text-black hover:bg-white/90"
                onClick={() => setShowAddTrack(false)}
              >
                Add Week
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

function TrackCard({ track }: { track: Track & { tasks: Task[]; progress: number } }) {
  return (
    <Card className="relative overflow-hidden border border-white/10 bg-black">
      <GlowingEffect 
        blur={12} 
        glow={true} 
        spread={30} 
        variant="white"
        disabled={false}
        className="z-0"
      />
      <CardHeader className="border-b border-white/10 pb-3">
        <CardTitle className="font-geist-mono text-sm font-normal text-white">
          {track.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="font-geist-mono mb-4 text-xs text-gray-400">
          {track.description?.substring(0, 100)}
          {track.description && track.description.length > 100 ? "..." : ""}
        </p>
        
        <div className="mt-4">
          <div className="font-geist-mono mb-1 flex justify-between text-xs">
            <span className="text-gray-400">Tasks</span>
            <span className="text-white">{track.tasks.length}</span>
          </div>
          
          <div className="font-geist-mono mb-1 flex justify-between text-xs">
            <span className="text-gray-400">Progress</span>
            <span className="text-white">{track.progress}%</span>
          </div>
          
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-white"
              style={{ width: `${track.progress}%` }}
            />
          </div>
        </div>
        
        {track.start_date && (
          <div className="font-geist-mono mt-4 text-xs text-white/70">
            {track.status === "upcoming" ? "Starts" : "Started"}: {new Date(track.start_date).toLocaleDateString()}
          </div>
        )}
        
        {track.end_date && (
          <div className="font-geist-mono text-xs text-white/70">
            {track.status === "past" ? "Ended" : "Ends"}: {new Date(track.end_date).toLocaleDateString()}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-white/10 px-6 py-3">
        <Button
          variant="outline"
          className="font-geist-mono w-full text-xs text-white hover:bg-white/5"
          asChild
        >
          <Link href={`/dashboard/tracks/${track.id}`}>
            View Tasks
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
} 