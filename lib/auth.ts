import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

const getCurrentUserCached = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
})

export async function getCurrentUser() {
  return getCurrentUserCached()
}

export async function requireAuth(options?: { redirectTo?: string }) {
  const user = await getCurrentUser()

  if (!user) {
    if (options?.redirectTo?.startsWith("/")) {
      redirect(`/login?redirectTo=${encodeURIComponent(options.redirectTo)}`)
    }
    redirect("/login")
  }

  return user
}

const getProfileCached = cache(async () => {
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
})

export async function getProfile() {
  return getProfileCached()
}

export async function ensureProfile(input?: {
  fullName?: string
  companyName?: string
}, opts?: {
  user?: User
}) {
  const user = opts?.user ?? await requireAuth()
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
