import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function getProfile() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  return data
}

export async function ensureProfile(input?: {
  fullName?: string
  companyName?: string
}) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name: input?.fullName ?? user.user_metadata?.full_name ?? null,
      company_name: input?.companyName ?? null,
      plan: "free",
      subscription_status: "inactive",
    })
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}
