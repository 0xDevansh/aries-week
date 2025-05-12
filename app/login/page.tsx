"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isDev, setIsDev] = useState(false)
  const [canvasActive, setCanvasActive] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if we're in development mode
    setIsDev(process.env.NODE_ENV === 'development')
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleTestUserAccess = () => {
    setIsLoading(true)
    // Disable canvas animation before navigation to prevent WebGL context issues
    setCanvasActive(false)
    
    // Add a delay to allow WebGL context to clean up
    setTimeout(() => {
      router.push('/dashboard?test_user=true')
    }, 300)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
      <div className="absolute inset-0 z-0">
        {canvasActive && (
          <CanvasRevealEffect 
            animationSpeed={0.3}
            colors={[[70, 123, 187], [221, 123, 187], [90, 146, 44]]}
            dotSize={2}
            showGradient={true}
            containerClassName="bg-black"
          />
        )}
      </div>
      
      <div className="relative w-full max-w-md z-10">
        <h1 
          className="font-editorial-new mb-12 text-center text-5xl font-light italic tracking-[-0.04em] text-white" 
          style={{ fontFeatureSettings: '"ss01", "ss03"' }}
        >
          <span className="relative">
            Aries Week
            <div className="absolute -inset-1 -z-10 blur-md opacity-25">Aries Week</div>
          </span>
        </h1>

        <Card className="relative overflow-hidden border border-white/10 bg-black/50 backdrop-blur-sm">
          <GlowingEffect 
            blur={12} 
            glow={true} 
            spread={40} 
            variant="white" 
            disabled={false}
            className="z-0"
          />
          
          <CardHeader className="border-b border-white/10 pb-4">
            <h2 className="font-geist-mono text-center text-xl text-white">
              Authentication
            </h2>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              <p className="font-geist-mono text-center text-sm text-gray-400">
                Sign in to track your progress and access challenges
              </p>
              
              <Button 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                className="font-geist-mono w-full border-white/20 bg-black hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {isLoading ? "Connecting..." : "Continue with Google"}
                </div>
              </Button>
              
              {isDev && (
                <Button 
                  onClick={handleTestUserAccess}
                  disabled={isLoading}
                  variant="outline"
                  className="font-geist-mono w-full border-green-500/20 bg-black text-green-500 hover:bg-green-900/10 hover:text-green-400"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {isLoading ? "Loading..." : "DEV ONLY: Test User Access"}
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-white/10 px-8 py-4">
            <p className="font-geist-mono w-full text-center text-xs text-gray-500">
              Secure authentication powered by Supabase
            </p>
          </CardFooter>
        </Card>
        
        <div className="font-geist-mono mt-6 text-center text-xs text-gray-600">
          <p>
            By signing in, you agree to our{" "}
            <a href="#" className="text-white/70 hover:text-white hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-white/70 hover:text-white hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
