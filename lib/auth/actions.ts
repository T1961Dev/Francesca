"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { bumpRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

async function rateLimit(scope: string, formEmail: FormDataEntryValue | null) {
  const hdrs = await headers()
  const forwarded = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || hdrs.get("x-real-ip") || "unknown"
  const email = typeof formEmail === "string" ? formEmail.toLowerCase() : ""

  const ipResult = await bumpRateLimit({
    key: `${scope}:ip:${ip}`,
    windowMs: 60_000,
    limit: 10,
  })
  if (!ipResult.allowed) return false

  if (email) {
    const emailResult = await bumpRateLimit({
      key: `${scope}:email:${email}`,
      windowMs: 600_000,
      limit: 5,
    })
    if (!emailResult.allowed) return false
  }

  return true
}

const emailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function getAppUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    ""

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL or APP_URL env var")
  }

  return url.replace(/\/$/, "")
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  return value
}

export async function loginAction(formData: FormData) {
  if (!(await rateLimit("login", formData.get("email")))) {
    redirect(
      `/login?error=${encodeURIComponent("Too many attempts. Try again in a minute.")}`
    )
  }

  let input: z.infer<typeof emailPasswordSchema>

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
    const params = new URLSearchParams({ error: error.message })
    if (redirectTo) params.set("redirectTo", redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  redirect(redirectTo ?? "/dashboard")
}

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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback?type=signup`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email: input.email,
        full_name: input.fullName,
        company_name: input.companyName || null,
        plan: "free",
        subscription_status: "inactive",
      },
      { onConflict: "id" }
    )
  }

  // Supabase may auto-confirm (no email step) — in that case a session is already
  // active and we send the user to onboarding. Otherwise, show the verify screen.
  if (data.session) {
    redirect("/dashboard")
  }

  redirect(`/signup?verify=${encodeURIComponent(input.email)}`)
}

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
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/forgot-password?sent=true")
}

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
