"use server"

import { redirect } from "next/navigation"

import {
  emailPasswordSchema,
  rateLimit,
  safeRedirectPath,
} from "@/lib/auth/action-shared"
import { createClient } from "@/lib/supabase/server"

export async function loginAction(formData: FormData) {
  if (!(await rateLimit("login", formData.get("email")))) {
    redirect(
      `/login?error=${encodeURIComponent("Too many attempts. Try again in a minute.")}`
    )
  }

  let input: typeof emailPasswordSchema._output

  try {
    input = emailPasswordSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    })
  } catch {
    redirect(
      `/login?error=${encodeURIComponent("Enter a valid email and an 8+ character password")}`
    )
  }

  const redirectTo = safeRedirectPath(formData.get("redirectTo"))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(input)

  if (error) {
    const params = new URLSearchParams({
      error: "Invalid email or password. Check your details or reset your password.",
    })
    if (redirectTo) params.set("redirectTo", redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  redirect(redirectTo ?? "/dashboard")
}
