"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { getAppUrl, rateLimit } from "@/lib/auth/action-shared"
import { createClient } from "@/lib/supabase/server"

export async function resetPasswordAction(formData: FormData) {
  if (!(await rateLimit("forgot-password", formData.get("email")))) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Too many attempts. Try again in a minute.")}`
    )
  }

  let email: string

  try {
    email = z.string().email().parse(formData.get("email"))
  } catch {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Enter a valid email address")}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?type=recovery`,
  })

  if (error) {
    const { captureError } = await import("@/lib/sentry/capture")
    captureError(error, { route: "forgot-password" })
  }

  redirect("/forgot-password?sent=true")
}
