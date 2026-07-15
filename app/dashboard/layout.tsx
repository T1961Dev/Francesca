import { after } from "next/server"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ensureProfile, requireAuth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin/auth"
import { captureError } from "@/lib/sentry/capture"
import { queueWelcomeEmailIfNeeded } from "@/lib/resend/emails"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  const profile = await ensureProfile(undefined, { user })
  const authEmail = user.email?.trim() ?? ""

  after(async () => {
    try {
      if (profile && authEmail && profile.email?.trim() !== authEmail) {
        const supabase = await createClient()
        await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id)
      }
      if (profile && !profile.welcome_email_sent && authEmail) {
        await queueWelcomeEmailIfNeeded({
          userId: user.id,
          email: authEmail,
          name: profile.full_name ?? user.user_metadata?.full_name ?? null,
          welcomeEmailSent: profile.welcome_email_sent,
        })
      }
    } catch (error) {
      captureError(error, { route: "dashboard-email-sync" })
    }
  })

  return (
    <DashboardShell
      isAdmin={isAdminEmail(user.email)}
      initialUser={{
        id: user.id,
        email: authEmail,
        userMetadata: user.user_metadata ?? null,
      }}
      initialProfile={{
        full_name: profile.full_name ?? null,
        company_name: profile.company_name ?? null,
        plan: profile.plan ?? "free",
        email: profile.email ?? authEmail ?? null,
      }}
    >
      {children}
    </DashboardShell>
  )
}
