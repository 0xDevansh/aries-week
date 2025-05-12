"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useAuth } from "@/contexts/auth-context"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect"

// Create a schema for form validation
const formSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  mobile_number: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits")
})

export default function OnboardingPage() {
  const { user, profile, updateProfile, isProfileComplete } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [canvasActive, setCanvasActive] = useState(true)

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      mobile_number: "",
    },
  })

  useEffect(() => {
    // If user is already logged in and profile is complete, redirect to dashboard
    if (user && isProfileComplete) {
      router.push("/dashboard")
    }
    
    // Update form values if profile data is available
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        mobile_number: profile.mobile_number || "",
      })
    }
  }, [user, profile, isProfileComplete, router, form])

  if (!user) {
    return null
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    
    try {
      await updateProfile({
        full_name: values.full_name,
        mobile_number: values.mobile_number,
      })
      
      // Disable canvas animation before navigation to prevent WebGL context issues
      setCanvasActive(false)
      
      // Add a delay to allow WebGL context to clean up
      setTimeout(() => {
        router.push("/dashboard")
      }, 300)
    } catch (error) {
      console.error("Error updating profile:", error)
      form.setError("root", { 
        message: error instanceof Error ? error.message : "Failed to update profile" 
      })
    } finally {
      setIsLoading(false)
    }
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
              Complete Your Profile
            </h2>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-6">
              <p className="font-geist-mono text-center text-sm text-gray-400">
                Please enter your details to continue
              </p>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-geist-mono text-white/70">Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            className="font-geist-mono border-white/20 bg-black/30 text-white"
                          />
                        </FormControl>
                        <FormMessage className="font-geist-mono text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mobile_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-geist-mono text-white/70">Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your 10-digit phone number" 
                            {...field} 
                            inputMode="numeric"
                            className="font-geist-mono border-white/20 bg-black/30 text-white"
                          />
                        </FormControl>
                        <FormMessage className="font-geist-mono text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  {form.formState.errors.root && (
                    <p className="font-geist-mono text-sm text-red-400 mt-2">
                      {form.formState.errors.root.message}
                    </p>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="font-geist-mono w-full mt-4 border-white/20 bg-black hover:bg-white/5 hover:text-white"
                    variant="outline"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save & Continue"}
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
          
          <CardFooter className="border-t border-white/10 px-8 py-4">
            <p className="font-geist-mono w-full text-center text-xs text-gray-500">
              Your information is securely stored
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 