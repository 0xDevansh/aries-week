import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Skip auth checks for auth callback route
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }
  
  return updateSession(request)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
} 