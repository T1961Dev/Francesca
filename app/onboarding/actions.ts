"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { queueWelcomeEmailIfNeeded } from "@/lib/resend/emails"
import { CURRENCIES, SECTORS, STAGES } from "@/lib/onboarding"
import { mirrorProfileFields } from "@/lib/profile/prefill"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

const stepSchemas = {
  "1": z.object({ company_name: z.string().min(1).max(120) }),
  "2": z.object({ sector: z.enum(SECTORS) }),
  "3": z.object({ stage: z.enum(STAGES) }),
  "4": z.object({
    target_raise: z.coerce.number().positive().max(1_000_000_000),
    target_raise_currency: z.enum(CURRENCIES),
  }),
  "5": z.object({ geography: z.string().min(1).max(120) }),
} as const

export type OnboardingStep = keyof typeof stepSchemas

export async function saveOnboardingStep(formData: FormData) {
  const user = await requireAuth()
  const step = String(formData.get("step") ?? "") as OnboardingStep
  const schema = stepSchemas[step]

  if (!schema) {
    redirect("/onboarding?error=Invalid+step")
  }

  let parsed: Database["public"]["Tables"]["profiles"]["Update"]
  try {
    parsed = schema.parse(Object.fromEntries(formData.entries())) as Database["public"]["Tables"]["profiles"]["Update"]
  } catch {
    redirect(`/onboarding?step=${step}&error=Check+your+answer`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update(mirrorProfileFields(parsed))
    .eq("id", user.id)

  if (error) {
    redirect(`/onboarding?step=${step}&error=${encodeURIComponent(error.message)}`)
  }

  if (step === "5") {
    const { cookies } = await import("next/headers")
    const jar = await cookies()
    jar.set("rw_onboarded", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
    })

    const email = user.email?.trim() ?? ""
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("welcome_email_sent, full_name")
      .eq("id", user.id)
      .maybeSingle()

    try {
      await queueWelcomeEmailIfNeeded({
        userId: user.id,
        email,
        name: profileRow?.full_name ?? user.user_metadata?.full_name ?? null,
        welcomeEmailSent: profileRow?.welcome_email_sent,
      })
    } catch (error) {
      captureError(error, { route: "onboarding-welcome-email" })
    }

    redirect("/dashboard?onboarded=1")
  }

  const nextStep = String(Number(step) + 1)
  redirect(`/onboarding?step=${nextStep}`)
}
