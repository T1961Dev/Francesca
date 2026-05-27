import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Supabase auth callback. Handles two flows:
 * - Email verification (signup confirmation): redirect to onboarding / dashboard.
 * - Password recovery: redirect to /reset-password with an active session.
 *
 * Supabase appends `?code=<pkce>&type=<recovery|signup|...>` (or similar) to the URL
 * configured as `redirectTo` when sending the email. We exchange the code for a
 * session here so cookies are set before we land the user on the final page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? searchParams.get("redirectTo")

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Missing or expired link")}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
