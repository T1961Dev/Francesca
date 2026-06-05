import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  assertSafeAppUrlForAuth,
  getAuthRedirectOrigin,
  getPublicAppUrl,
} from "@/lib/app-url"
import { buildRecoveryCallbackUrl } from "@/lib/auth/recovery-redirect"
import { formatSupabaseCallbackError } from "@/lib/auth/supabase-callback-errors"

/** Where password-reset emails should land after the code exchange. */
export const PASSWORD_RESET_NEXT = "/reset-password"

export function buildAuthCallbackUrl(type?: "recovery" | "signup") {
  assertSafeAppUrlForAuth("buildAuthCallbackUrl")

  if (type === "recovery") {
    return buildRecoveryCallbackUrl(getPublicAppUrl)
  }

  const base = `${getPublicAppUrl()}/auth/callback`
  if (type === "signup") {
    return `${base}?type=signup`
  }

  return base
}

/**
 * Exchange a Supabase auth code (or recovery token) and return a redirect
 * response with session cookies attached (required for Route Handlers).
 */
export async function exchangeAuthCallback(
  request: NextRequest,
  options: {
    code?: string | null
    tokenHash?: string | null
    type?: string | null
    next?: string | null
  }
) {
  const origin = getAuthRedirectOrigin(request)
  const destination = resolvePostAuthPath(options.type, options.next)
  let response = NextResponse.redirect(`${origin}${destination}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            response.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  if (options.tokenHash && options.type) {
    const otpType =
      options.type === "recovery" ||
      options.type === "signup" ||
      options.type === "email"
        ? options.type
        : "email"

    const { error } = await supabase.auth.verifyOtp({
      token_hash: options.tokenHash,
      type: otpType,
    })

    if (error) {
      return redirectWithError(origin, error.message, options.type)
    }
  } else if (options.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(options.code)

    if (error) {
      return redirectWithError(origin, error.message, options.type)
    }
  } else {
    return redirectWithError(
      origin,
      "Missing or expired confirmation code. Request a new signup email or try signing in.",
      options.type
    )
  }

  return response
}

function resolvePostAuthPath(
  type: string | null | undefined,
  next: string | null | undefined
) {
  if (type === "recovery" || next === PASSWORD_RESET_NEXT) {
    return PASSWORD_RESET_NEXT
  }

  if (next && next.startsWith("/")) return next

  if (type === "signup") return "/onboarding"

  return "/dashboard"
}

function redirectWithError(
  origin: string,
  message: string,
  flowType?: string | null
) {
  const lower = message.toLowerCase()
  const isPkce =
    lower.includes("code challenge") || lower.includes("code verifier")
  const isRecovery =
    flowType === "recovery" ||
    lower.includes("password") ||
    lower.includes("recovery")

  const path = isRecovery || isPkce ? "forgot-password" : flowType === "signup" ? "signup" : "login"

  const hint = isPkce
    ? "Open the reset link in the same browser where you requested it, or request a new link in a private window."
    : message

  return NextResponse.redirect(
    `${origin}/${path}?error=${encodeURIComponent(hint)}`
  )
}

export function redirectAuthCallbackError(
  request: NextRequest,
  searchParams: URLSearchParams
) {
  const origin = getAuthRedirectOrigin(request)
  const message = formatSupabaseCallbackError(searchParams)
  return redirectWithError(origin, message, searchParams.get("type"))
}
