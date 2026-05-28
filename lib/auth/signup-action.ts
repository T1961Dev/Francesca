"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import {
  emailPasswordSchema,
  getAppUrl,
  rateLimit,
} from "@/lib/auth/action-shared"
import { isAuthEmailRegistered } from "@/lib/auth/email-registered"
import { createClient } from "@/lib/supabase/server"

export async function signupAction(formData: FormData) {
  if (!(await rateLimit("signup", formData.get("email")))) {
    redirect(
      `/signup?error=${encodeURIComponent("Too many attempts. Try again in a minute.")}`
    )
  }

  let input: z.infer<typeof emailPasswordSchema> & {
    fullName: string
    companyName?: string
  }

  try {
    input = emailPasswordSchema
      .extend({
        fullName: z.string().min(1),
        companyName: z.string().optional(),
      })
      .parse({
        email: formData.get("email"),
        password: formData.get("password"),
        fullName: formData.get("name"),
        companyName: formData.get("companyName") ?? "",
      })
  } catch {
    redirect(
      `/signup?error=${encodeURIComponent("Check your details and try again")}`
    )
  }

  const email = input.email.trim().toLowerCase()

  try {
    if (await isAuthEmailRegistered(email)) {
      redirect(
        `/signup?error=${encodeURIComponent("An account with this email already exists. Sign in instead.")}`
      )
    }
  } catch {
    redirect(
      `/signup?error=${encodeURIComponent("Could not complete signup. Try again shortly.")}`
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup`,
    },
  })

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "An account with this email already exists. Sign in instead."
      : error.message
    redirect(`/signup?error=${encodeURIComponent(message)}`)
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    redirect(
      `/signup?error=${encodeURIComponent("An account with this email already exists. Sign in instead.")}`
    )
  }

  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: input.fullName,
        company_name: input.companyName || null,
        plan: "free",
        subscription_status: "inactive",
      },
      { onConflict: "id" }
    )
  }

  if (data.session) {
    redirect("/dashboard")
  }

  redirect(`/signup?verify=${encodeURIComponent(input.email)}`)
}
