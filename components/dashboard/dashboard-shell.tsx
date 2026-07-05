"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  AppSidebar,
  type AppSidebarProfile,
  type AppSidebarUser,
} from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"

type BootstrapProfile = {
  full_name: string | null
  company_name: string | null
  plan: string | null
  email: string | null
}

export function DashboardShell({
  children,
  initialUser,
  isAdmin = false,
}: {
  children: React.ReactNode
  initialUser: AppSidebarUser
  isAdmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const bootstrapStarted = React.useRef(false)
  const [user, setUser] = React.useState<AppSidebarUser>(initialUser)
  const [profile, setProfile] = React.useState<AppSidebarProfile>(null)

  React.useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    if (!bootstrapStarted.current) {
      bootstrapStarted.current = true
      void fetch("/api/me/bootstrap", { method: "POST" })
        .then(async (response) => {
          if (!response.ok) return null
          return response.json() as Promise<{
            profile?: BootstrapProfile | null
            redirect?: string
          }>
        })
        .then((json) => {
          if (cancelled) return
          if (json && "redirect" in json && typeof json.redirect === "string") {
            router.replace(json.redirect)
            return
          }
          if (!json?.profile) return
          setProfile(json.profile)
        })
        .catch(() => {
          // Sidebar can still render from auth metadata if bootstrap fails.
        })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login")
        return
      }

      setUser({
        id: session.user.id,
        email: session.user.email?.trim() ?? "",
        userMetadata: session.user.user_metadata,
      })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  // Safety: Radix modals can occasionally leave pointer-events disabled on body.
  React.useEffect(() => {
    document.body.style.pointerEvents = ""
    document.body.style.overflow = ""
  }, [pathname])

  const displayProfile: AppSidebarProfile =
    profile ??
    ({
      full_name:
        typeof user.userMetadata?.full_name === "string"
          ? user.userMetadata.full_name
          : null,
      company_name: null,
      plan: "free",
      email: user.email || null,
    } satisfies AppSidebarProfile)

  const workspaceTitle = pathname.startsWith("/admin")
    ? "Admin workspace"
    : "Your fundraising workspace"

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} profile={displayProfile} isAdmin={isAdmin} />
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
