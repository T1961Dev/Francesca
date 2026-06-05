import { PASSWORD_RESET_NEXT } from "@/lib/supabase/auth-callback"

/** Server-side recovery callback URL (uses APP_URL). */
export function buildRecoveryCallbackPath() {
  const params = new URLSearchParams()
  params.set("type", "recovery")
  params.set("next", PASSWORD_RESET_NEXT)
  return `/auth/callback?${params.toString()}`
}

/** Full recovery callback URL on the public host (server). */
export function buildRecoveryCallbackUrl(getOrigin: () => string) {
  return `${getOrigin()}${buildRecoveryCallbackPath()}`
}

/** Browser recovery callback — PKCE verifier must be stored in this browser. */
export function buildRecoveryCallbackUrlForBrowser() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")

  if (!base) {
    throw new Error("Could not determine app URL for password reset")
  }

  return `${base}${buildRecoveryCallbackPath()}`
}
