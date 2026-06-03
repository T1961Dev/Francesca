import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Where password-reset emails should land after the code exchange. */
export const PASSWORD_RESET_NEXT = "/reset-password"

export function buildAuthCallbackUrl(type?: "recovery" | "signup") {
  const base = `${getPublicAppUrl()}/auth/callback`
  const params = new URLSearchParams()

  if (type === "recovery") {
    params.set("type", "recovery")
    params.set("next", PASSWORD_RESET_NEXT)
  } else if (type === "signup") {
    params.set("type", "signup")
  }

  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export function getPublicAppUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"

  return url.replace(/\/$/, "")
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
  const { origin } = request.nextUrl
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
      return redirectWithError(origin, error.message)
    }
  } else if (options.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(options.code)

    if (error) {
      return redirectWithError(origin, error.message)
    }
  } else {
    return redirectWithError(origin, "Missing or expired link")
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

function redirectWithError(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(message)}`
  )
}
