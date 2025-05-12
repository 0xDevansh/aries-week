import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  // Skip auth checks for auth callback route
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next({
      request,
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // These are paths that require authentication
  const protectedPaths = ["/dashboard", "/onboarding", "/admin"];
  
  // These paths bypass the profile completeness check
  const bypassProfileCheck = ["/onboarding", "/auth", "/login", "/logout"];

  // Get the user from the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if the current path is a protected path
  const isProtectedPath = protectedPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(path + "/")
  );
  
  // Check if current path should bypass profile check
  const shouldBypassProfileCheck = bypassProfileCheck.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(path + "/")
  );

  // Check if this is a test user in dev mode
  const isTestUser = request.nextUrl.searchParams.has('test_user');

  // No user and trying to access a fully protected route, unless it's a test user
  if (!user && isProtectedPath && !isTestUser) {
    // Redirect to login with the intended destination
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  // Check if user profile is complete
  if (user && !shouldBypassProfileCheck) {
    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, mobile_number")
      .eq("id", user.id)
      .single();
    
    // If profile doesn't exist or is incomplete, redirect to onboarding
    const isProfileIncomplete = !profile || !profile.full_name || !profile.mobile_number;
    
    if (isProfileIncomplete && request.nextUrl.pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

// Export createClient to use in middleware.ts if needed
export function createClient(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // This is a read-only client
        },
      },
    }
  );
} 