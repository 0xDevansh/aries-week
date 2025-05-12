import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  console.log("Auth callback triggered, processing code")

  if (code) {
    try {
      const supabase = await createClient()
      
      await supabase.auth.exchangeCodeForSession(code)
      console.log("Exchanged code for session")
      
      // Check if profile is complete
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (session) {
        console.log("Session found, user authenticated:", session.user.id)
        
        // Check for profile - for new users, this might be null or missing fields
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        
        if (profileError) {
          console.log("Error retrieving profile or profile doesn't exist:", profileError.message)
          // For new users, ensure a profile row exists
          const { error: insertError } = await supabase
            .from("profiles")
            .insert({ id: session.user.id })
            .select()
          
          if (insertError) {
            console.log("Error creating profile:", insertError.message)
          } else {
            console.log("Created new profile row")
          }
          
          // New user should go to onboarding
          console.log("Redirecting new user to onboarding")
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
        
        console.log("Profile data:", profile)
        
        // Check if profile is complete
        const isProfileComplete = profile && 
                                profile.full_name && 
                                profile.full_name.trim() !== '' && 
                                profile.mobile_number && 
                                profile.mobile_number.trim() !== ''
        
        // Redirect to appropriate route based on profile status
        if (!isProfileComplete) {
          console.log("Profile incomplete, redirecting to onboarding")
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
        
        console.log("Profile complete, redirecting to dashboard")
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      } else {
        console.log("No session found after code exchange")
      }
    } catch (error) {
      console.error("Error in auth callback:", error)
    }
  } else {
    console.log("No code parameter found in callback URL")
  }

  // Fallback - redirect to login if something fails
  console.log("Fallback: redirecting to login")
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
} 