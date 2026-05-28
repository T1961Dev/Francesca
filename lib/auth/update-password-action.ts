"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password")
  const confirm = formData.get("confirmPassword")

  if (typeof password !== "string" || password.length < 8) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 8 characters")}`
    )
  }

  if (typeof confirm === "string" && confirm !== password) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match")}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/dashboard/settings?updated=password")
}
