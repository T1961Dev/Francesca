import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export type StoredIdempotency = {
  response: unknown
  expiresAt: string
}

export async function lookupIdempotencyKey(key: string): Promise<StoredIdempotency | null> {
  if (!key) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("idempotency_keys")
    .select("response, expires_at")
    .eq("key", key)
    .maybeSingle()

  if (!data) return null
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    await supabase.from("idempotency_keys").delete().eq("key", key)
    return null
  }
  return { response: data.response, expiresAt: data.expires_at as string }
}

export async function storeIdempotentResponse({
  key,
  userId,
  scope,
  response,
  ttlMs = DEFAULT_TTL_MS,
}: {
  key: string
  userId: string | null
  scope: string
  response: unknown
  ttlMs?: number
}) {
  if (!key) return
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  await supabase
    .from("idempotency_keys")
    .upsert(
      {
        key,
        user_id: userId,
        scope,
        response: response as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: "key" }
    )
}
