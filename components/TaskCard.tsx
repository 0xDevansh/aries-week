"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { Database } from "@/types/supabase"

type Task = Database["public"]["Tables"]["tasks"]["Row"]

interface TaskCardProps {
  task: Task
  status: "previous" | "current" | "future"
  progress?: number
  deadline?: string
}

export function TaskCard({ task, status, progress, deadline }: TaskCardProps) {
  return (
    <Card className={`relative overflow-hidden border bg-black mb-4 ${
      status === "future" ? "border-dashed border-white/30" : 
      status === "current" ? "border-white/10" : 
      "border-white/10 opacity-80"
    }`}>
      <GlowingEffect 
        blur={12} 
        glow={true} 
        spread={status === "current" ? 60 : 30} 
        variant="white"
        disabled={false}
        className="z-0"
      />
      <CardHeader className="border-b border-white/10 pb-3">
        <CardTitle className="font-geist-mono flex items-center gap-2 text-sm font-normal text-white">
          {status === "previous" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          )}
          {status === "current" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
          {status === "future" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="M16.5 9.4 7.55 4.24" />
              <path d="M3.29 7 12 12l8.71-5" />
              <path d="M12 22V12" />
              <circle cx="18.5" cy="15.5" r="2.5" />
              <path d="M20.27 17.27 22 19" />
            </svg>
          )}
          {status === "previous" ? "PREVIOUS TASK" : status === "current" ? "CURRENT TASK" : "FUTURE TASK"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <h3 className="font-sans mb-2 text-2xl font-light tracking-[-0.02em] text-white">
          {task.name}
        </h3>
        <p className="font-geist-mono mb-4 text-xs text-gray-400">
          {task.caption}
        </p>
        
        {progress !== undefined && (
          <div className="mt-4">
            <div className="font-geist-mono mb-1 flex justify-between text-xs">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{progress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-white"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {deadline && (
          <div className="font-geist-mono mt-4 text-xs text-white/70">
            <div className="flex justify-between">
              <span>Deadline:</span>
              <span>{new Date(deadline).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 text-red-400">
              {new Date(deadline) > new Date() ? 
                `${Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left` : 
                "Deadline passed"}
            </div>
          </div>
        )}
      </CardContent>
      
      {task.resources_url && (
        <CardFooter className="border-t border-white/10 px-6 py-3">
          <Link 
            href={task.resources_url} 
            className="font-geist-mono text-xs text-white hover:underline"
            target="_blank"
          >
            View Resources →
          </Link>
        </CardFooter>
      )}
    </Card>
  )
} 