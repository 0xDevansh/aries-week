"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"

type NavItem = {
  title: string
  href: string
  icon: React.ReactNode
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      title: "My Progress",
      href: "/dashboard/progress",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
  ]

  // Add Admin Panel link if user is admin or superadmin
  if (profile?.role === "admin" || profile?.role === "superadmin") {
    navItems.push({
      title: "Admin Panel",
      href: "/dashboard/admin",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M12 8v8" />
          <path d="M12 16h.01" />
        </svg>
      ),
    })
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Suspense fallback={<div>Loading...</div>}>
        {/* Sidebar */}
        <Sidebar open={!isCollapsed} setOpen={(open) => setIsCollapsed(!open)} animate={true}>
          <SidebarBody className="justify-between flex-col !bg-black border-r border-white/10 h-full p-0">
            <div className="flex flex-col overflow-x-hidden overflow-y-auto">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 gap-x-4 px-3 font-sans font-light text-white py-4 mb-8"
              >
                <Image 
                  src="/pokeball-pixel.png" 
                  alt="Aries Week Logo" 
                  width={32} 
                  height={32} 
                  className="min-w-[32px] min-h-[32px]" 
                />
              </Link>
              
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    link={{
                      label: item.title,
                      href: item.href,
                      icon: <div className="flex justify-center items-center w-5 ml-1">{item.icon}</div>
                    }}
                    className={cn(
                      "font-geist-mono text-gray-400 hover:text-white px-3 py-2",
                      pathname === item.href && "text-white bg-white/10 rounded-md"
                    )}
                  />
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 border-t border-white/10 pt-4 space-y-2 px-4">
              <SidebarLink
                link={{
                  label: profile?.full_name || "User",
                  href: "#",
                  icon: (
                    <div className="flex justify-center items-center w-5 ml-1">
                      {profile?.avatar_url ? (
                        <div className="h-5 w-5 overflow-hidden rounded-full border border-white/10 bg-white/5">
                          <Image
                            src={profile.avatar_url}
                            alt={profile?.full_name || "User"}
                            width={20}
                            height={20}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-white">
                          {profile?.full_name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                  )
                }}
                className="font-geist-mono text-xs text-white px-3 py-2"
              />
              
              <span onClick={() => signOut()}>
                <SidebarLink
                  link={{
                    label: "Sign Out",
                    href: "#",
                    icon: (
                      <div className="flex justify-center items-center w-5 ml-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5 text-gray-400"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </div>
                    )
                  }}
                  className="font-geist-mono text-xs text-gray-400 hover:text-white px-3 py-2 cursor-pointer"
                />
              </span>
            </div>
          </SidebarBody>
        </Sidebar>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0 w-full">{children}</main>
      </Suspense>
    </div>
  )
} 