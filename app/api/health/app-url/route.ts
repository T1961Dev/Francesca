import { NextResponse } from "next/server"

import { getAppUrlDiagnostics, getPublicAppUrl, isUnsafeAppUrl } from "@/lib/app-url"
import { buildAuthCallbackUrl } from "@/lib/supabase/auth-callback"

/**
 * Verify which app URL the server will use for auth emails and Stripe.
 * Hit after deploy: GET /api/health/app-url
 */
export async function GET() {
  const diagnostics = getAppUrlDiagnostics()
  let resolved = diagnostics.resolved ?? ""
  let error: string | null = diagnostics.resolveError

  if (!resolved) {
    try {
      resolved = getPublicAppUrl()
    } catch (e) {
      error = e instanceof Error ? e.message : "getPublicAppUrl failed"
    }
  }

  const unsafe = resolved ? isUnsafeAppUrl(resolved) : true

  let signupCallback: string | null = null
  let signupCallbackError: string | null = null

  try {
    signupCallback = buildAuthCallbackUrl("signup")
  } catch (e) {
    signupCallbackError = e instanceof Error ? e.message : "buildAuthCallbackUrl failed"
  }

  return NextResponse.json({
    ok: Boolean(resolved) && !unsafe && Boolean(signupCallback),
    appUrl: resolved || null,
    source: diagnostics.source,
    unsafe,
    error,
    signupCallback,
    signupCallbackError,
    hints: unsafe || signupCallbackError
      ? [
          "Set APP_URL=https://francesca-sy16.onrender.com on Render (runtime).",
          "Remove NEXT_PUBLIC_APP_URL=http://localhost:10000 if set.",
          "Supabase → Authentication → URL configuration: Site URL = same host; add /auth/callback redirect URLs.",
          "Redeploy after env changes; request a NEW signup/reset email (old links keep old redirect_to).",
        ]
      : [],
    envPresent: {
      APP_URL: Boolean(process.env.APP_URL?.trim()),
      SITE_URL: Boolean(process.env.SITE_URL?.trim()),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
      RENDER_EXTERNAL_URL: Boolean(process.env.RENDER_EXTERNAL_URL?.trim()),
    },
    candidates: diagnostics.candidates,
    nodeEnv: process.env.NODE_ENV ?? null,
  })
}
