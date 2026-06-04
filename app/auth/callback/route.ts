import { NextResponse, type NextRequest } from "next/server"

import { getAuthRedirectOrigin } from "@/lib/app-url"
import { formatSupabaseCallbackError } from "@/lib/auth/supabase-callback-errors"
import {
  exchangeAuthCallback,
  redirectAuthCallbackError,
} from "@/lib/supabase/auth-callback"

/**
 * Supabase PKCE / OTP callback: signup confirmation, OAuth, password recovery.
 * Allowlist this URL in Supabase → Authentication → URL configuration.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const authError = searchParams.get("error_code") ?? searchParams.get("error")
  if (authError) {
    return redirectAuthCallbackError(request, searchParams)
  }

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? searchParams.get("redirectTo")

  if (!code && !tokenHash) {
    const origin = getAuthRedirectOrigin(request)
    const message = formatSupabaseCallbackError(searchParams)
    const target = type === "recovery" ? "login" : "signup"
    return NextResponse.redirect(
      `${origin}/${target}?error=${encodeURIComponent(message)}`
    )
  }

  return exchangeAuthCallback(request, {
    code,
    tokenHash,
    type,
    next,
  })
}
