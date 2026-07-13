"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

import type { AppSidebarProfile, AppSidebarUser } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"

const AppSidebar = dynamic(
  () => import("@/components/app-sidebar").then((mod) => mod.AppSidebar)
)

export function DashboardShell({
  children,
  initialUser,
  initialProfile,
  isAdmin = false,
}: {
  children: React.ReactNode
  initialUser: AppSidebarUser
  initialProfile: NonNullable<AppSidebarProfile>
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const [user, setUser] = React.useState<AppSidebarUser>(initialUser)
  const [profile] = React.useState<AppSidebarProfile>(initialProfile)

  React.useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.replace("/login")
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email?.trim() ?? "",
        userMetadata: session.user.user_metadata,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  React.useEffect(() => {
    document.body.style.pointerEvents = ""
    document.body.style.overflow = ""
  }, [pathname])

  const workspaceTitle = pathname.startsWith("/admin")
    ? "Admin workspace"
    : "Your fundraising workspace"

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} profile={profile} isAdmin={isAdmin} />
        <SidebarInset className="flex min-h-0 flex-1 flex-col max-md:overflow-visible md:overflow-hidden">
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border/45 bg-card max-md:bg-card md:bg-card/95 md:backdrop-blur-md md:supports-[backdrop-filter]:bg-card/80">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 size-11 shrink-0 touch-manipulation md:size-8" />
              <Separator
                orientation="vertical"
                className="mr-2 hidden h-4 bg-border/60 sm:block"
              />
              <p className="min-w-0 truncate font-heading text-sm font-medium tracking-tight text-foreground">
                {workspaceTitle}
              </p>
            </div>
          </header>
          <div className="relative z-0 flex-1 max-md:overflow-visible md:min-h-0 md:overflow-y-auto md:overscroll-y-contain">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
