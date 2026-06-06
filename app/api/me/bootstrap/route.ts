import { after, NextResponse } from "next/server"

import { ensureProfile, getCurrentUser, getProfile } from "@/lib/auth"
import { isOnboardingComplete } from "@/lib/onboarding"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

/**
 * One-shot dashboard bootstrap: ensure profile exists, sync email, and
 * queue welcome email. Called once from the client shell so route
 * navigations do not repeat this work.
 */
export async function POST() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let profile = (await getProfile()) ?? (await ensureProfile(undefined, { user }))
  const authEmail = user.email?.trim() ?? ""

  if (profile && authEmail && profile.email?.trim() !== authEmail) {
    const supabase = await createClient()
    await supabase.from("profiles").update({ email: authEmail }).eq("id", user.id)
    profile = { ...profile, email: authEmail }
  }

  if (profile && !isOnboardingComplete(profile)) {
    return NextResponse.json({ redirect: "/onboarding" })
  }

  if (profile && profile.welcome_email_sent === false && authEmail) {
    after(async () => {
      try {
        const { queueWelcomeEmailIfNeeded } = await import("@/lib/resend/emails")
        await queueWelcomeEmailIfNeeded({
          userId: user.id,
          email: authEmail,
          name: profile.full_name ?? user.user_metadata?.full_name ?? null,
          welcomeEmailSent: profile.welcome_email_sent,
        })
      } catch (error) {
        captureError(error, { route: "dashboard-welcome-email" })
      }
    })
  }

  return NextResponse.json({
    profile: profile
      ? {
          full_name: profile.full_name ?? null,
          company_name: profile.company_name ?? null,
          plan: profile.plan ?? "free",
          email: profile.email ?? authEmail ?? null,
        }
      : null,
  })
}
