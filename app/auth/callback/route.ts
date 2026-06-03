import { NextResponse, type NextRequest } from "next/server"

import { exchangeAuthCallback } from "@/lib/supabase/auth-callback"

/**
 * Supabase PKCE callback: signup, OAuth, and password recovery.
 * Recovery emails must allowlist this URL in the Supabase dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? searchParams.get("redirectTo")

  if (!code && !tokenHash) {
    const { origin } = request.nextUrl
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing or expired link")}`
    )
  }

  return exchangeAuthCallback(request, {
    code,
    tokenHash,
    type,
    next,
  })
}
