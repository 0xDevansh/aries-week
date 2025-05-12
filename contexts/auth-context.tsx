"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Session, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Profile = {
  id: string
  full_name: string | null
  mobile_number: string | null
  avatar_url: string | null
  role: string
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isProfileComplete: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        
        setProfile(profileData)
      }
      
      setIsLoading(false)
    }
    
    initialize()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()
          
          setProfile(profileData)
          
          // Remove redirection from here as it's now handled in the callback route
          // and middleware for better consistency
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const isProfileComplete = !!profile?.full_name && !!profile?.mobile_number

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) {
      console.error("Cannot update profile: No authenticated user")
      throw new Error("You must be logged in to update your profile")
    }

    console.log("Updating profile for user:", user.id, data)
    
    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        console.log("Profile doesn't exist, creating it", fetchError.message);
        
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id, ...data })
          .select("*")
          .single();
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw insertError;
        }
        
        console.log("New profile created:", newProfile);
        setProfile(newProfile);
        return;
      }
      
      // Profile exists, update it
      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      console.log("Profile updated successfully:", updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading,
      isProfileComplete,
      signInWithGoogle,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 