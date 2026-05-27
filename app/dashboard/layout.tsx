import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ensureProfile, requireAuth } from "@/lib/auth"
import { sendTrackedEmail } from "@/lib/resend/send"
import { welcomeEmail } from "@/lib/resend/templates"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  await ensureProfile()
  const supabase = await createClient()
  let { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, plan, email, welcome_email_sent")
    .eq("id", user.id)
    .maybeSingle()

  const authEmail = user.email?.trim() ?? ""
  if (profile && authEmail && profile.email?.trim() !== authEmail) {
    await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id)
    profile = { ...profile, email: authEmail }
  }

  // Send the welcome email exactly once, on first authenticated dashboard load
  // after email verification. We don't want to send on the signup action because
  // many setups require email confirmation first.
  if (profile && profile.welcome_email_sent === false && authEmail) {
    try {
      await sendTrackedEmail({
        userId: user.id,
        to: authEmail,
        type: "welcome",
        template: welcomeEmail(profile.full_name ?? user.user_metadata?.full_name ?? null),
      })
      const admin = createAdminClient()
      await admin
        .from("profiles")
        .update({ welcome_email_sent: true })
        .eq("id", user.id)
    } catch (error) {
      captureError(error, { route: "dashboard-welcome-email" })
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          id: user.id,
          email: authEmail,
          userMetadata: user.user_metadata,
        }}
        profile={profile}
      />
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
  )
}
