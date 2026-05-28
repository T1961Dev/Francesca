"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const bootstrapStarted = React.useRef(false)
  const [user, setUser] = React.useState<AppSidebarUser | null>(null)
  const [profile, setProfile] = React.useState<AppSidebarProfile>(null)

  React.useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function loadSession() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (!authUser) {
        router.replace("/login")
        return
      }

      setUser({
        id: authUser.id,
        email: authUser.email?.trim() ?? "",
        userMetadata: authUser.user_metadata,
      })

      if (!bootstrapStarted.current) {
        bootstrapStarted.current = true
        void fetch("/api/me/bootstrap", { method: "POST" })
          .then(async (response) => {
            if (!response.ok) return null
            return response.json() as Promise<{
              profile?: BootstrapProfile | null
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
    }

    void loadSession()

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

  const displayProfile: AppSidebarProfile =
    profile ??
    (user
      ? {
          full_name:
            typeof user.userMetadata?.full_name === "string"
              ? user.userMetadata.full_name
              : null,
          company_name: null,
          plan: "free",
          email: user.email || null,
        }
      : null)

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user ?? { id: "", email: "", userMetadata: null }} profile={displayProfile} />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/45 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 bg-border/60"
              />
              <p className="font-heading text-sm font-medium tracking-tight text-foreground">
                Your fundraising workspace
              </p>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
