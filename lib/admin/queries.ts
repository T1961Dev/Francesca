import type { SupabaseClient } from "@supabase/supabase-js"

export type AdminProfileSummary = {
  id: string
  email: string | null
  full_name: string | null
  company_name: string | null
  plan: string | null
}

export async function fetchProfilesByIds(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[]
): Promise<Map<string, AdminProfileSummary>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (!unique.length) return new Map()

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, plan")
    .in("id", unique)

  return new Map((data ?? []).map((p) => [String(p.id), p as AdminProfileSummary]))
}

export function formatAdminUserLabel(
  profile: AdminProfileSummary | null | undefined,
  userId?: string | null
): string {
  if (profile?.full_name && profile.email) return `${profile.full_name} · ${profile.email}`
  if (profile?.full_name) return profile.full_name
  if (profile?.email) return profile.email
  if (profile?.company_name) return profile.company_name
  if (userId) return userId
  return "Anonymous"
}
