import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Returns true when `auth.users` already has this email (any confirmation state).
 * Uses a security-definer RPC callable only with the service role key.
 */
export async function isAuthEmailRegistered(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("auth_email_registered", {
    check_email: normalized,
  })

  if (error) {
    throw new Error(`Could not verify email availability: ${error.message}`)
  }

  return Boolean(data)
}
