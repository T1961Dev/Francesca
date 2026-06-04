"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { formatAuthErrorMessage } from "@/lib/auth/auth-error-message"
import { rateLimit } from "@/lib/auth/action-shared"
import { createClient } from "@/lib/supabase/server"
import { buildAuthCallbackUrl } from "@/lib/supabase/auth-callback"

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

  let redirectTo: string
  try {
    redirectTo = buildAuthCallbackUrl("recovery")
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "App URL is not configured for password reset. Contact support."
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    const { captureError } = await import("@/lib/sentry/capture")
    captureError(error, { route: "forgot-password" })

    if (error.message.toLowerCase().includes("rate limit")) {
      redirect(
        `/forgot-password?error=${encodeURIComponent(formatAuthErrorMessage(error))}`
      )
    }
  }

  redirect("/forgot-password?sent=true")
}
