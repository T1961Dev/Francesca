import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { buildPublicAuthCallbackRedirect } from "@/lib/app-url"
import { isOnboardingComplete } from "@/lib/onboarding"
import { rememberAuthReturnPage } from "@/lib/routing/auth-return"
import { resolveLegacyPathRedirect } from "@/lib/routing/legacy-paths"

const protectedPrefixes = [
  "/dashboard",
  "/onboarding",
  "/admin",
  "/api/deck",
  "/api/financial-model",
  "/api/investors",
  "/api/stripe/checkout",
  "/api/stripe/portal",
  "/api/resend",
]

const authRoutes = ["/login", "/signup"]

/**
 * Paths that authenticated users may visit even if their onboarding is
 * incomplete. The onboarding form itself, its server action, auth callback,
 * and sign-out are always reachable.
 */
const onboardingExempt = [
  "/onboarding",
  "/auth/",
  "/api/auth/",
  "/api/cron/",
  "/api/stripe/webhook",
  "/api/webhooks/",
]

function isExemptFromOnboarding(pathname: string) {
  return onboardingExempt.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Forward only Supabase auth query params to /auth/callback.
 * Do NOT treat app form messages (`?error=`) as auth callbacks — that caused
 * /forgot-password?error=… → /auth/callback → /login?error=… loops.
 */
function shouldForwardSupabaseAuthQueryToCallback(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  if (pathname.startsWith("/auth/callback")) return false

  const hasCode = searchParams.has("code")
  const hasTokenHash = searchParams.has("token_hash")
  const hasErrorCode = searchParams.has("error_code")

  if (!hasCode && !hasTokenHash && !hasErrorCode) return false

  // App routes use ?error= for validation; never hijack those unless Supabase sent code/token
  const appFormPaths = ["/forgot-password", "/reset-password", "/onboarding"]
  if (appFormPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return hasCode || hasTokenHash
  }

  return true
}

function inferAuthCallbackType(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  if (searchParams.get("type")) return searchParams.get("type")

  if (searchParams.get("next") === "/reset-password") return "recovery"

  if (pathname.startsWith("/signup")) return "signup"
  if (pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return "recovery"
  }

  return null
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const legacyTarget = resolveLegacyPathRedirect(pathname)
  if (legacyTarget && legacyTarget !== pathname) {
    const legacyUrl = request.nextUrl.clone()
    legacyUrl.pathname = legacyTarget
    return NextResponse.redirect(legacyUrl)
  }

  if (shouldForwardSupabaseAuthQueryToCallback(request)) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = "/auth/callback"

    const authCode = request.nextUrl.searchParams.get("code")
    if (authCode && !callbackUrl.searchParams.get("type")) {
      const inferred = inferAuthCallbackType(request)
      if (inferred) {
        callbackUrl.searchParams.set("type", inferred)
      }
      if (
        inferred === "recovery" &&
        !callbackUrl.searchParams.get("next")
      ) {
        callbackUrl.searchParams.set("next", "/reset-password")
      }
    }

    const tokenHash = request.nextUrl.searchParams.get("token_hash")
    if (tokenHash && !callbackUrl.searchParams.get("type")) {
      callbackUrl.searchParams.set(
        "type",
        request.nextUrl.searchParams.get("type") ?? "email"
      )
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.redirect(callbackUrl)
    }

    try {
      const inferred = inferAuthCallbackType(request)
      const type =
        callbackUrl.searchParams.get("type") ?? inferred ?? undefined
      const target = buildPublicAuthCallbackRedirect(
        callbackUrl.searchParams,
        type ? { type } : undefined
      )
      return NextResponse.redirect(target)
    } catch {
      return NextResponse.redirect(callbackUrl)
    }
  }

  rememberAuthReturnPage(request, response, pathname)

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = authRoutes.includes(pathname)

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  const isAppPage = pathname.startsWith("/dashboard") || pathname.startsWith("/admin")

  // Force onboarding only on app pages. Skipping this DB check for API calls
  // keeps button clicks and background requests fast.
  if (user && isAppPage && !isExemptFromOnboarding(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "company_name, sector, stage, target_raise, target_raise_currency, geography, industry, funding_stage, location, deleted_at"
      )
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.deleted_at) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("error", "Account deleted")
      return NextResponse.redirect(url)
    }

    if (!isOnboardingComplete(profile)) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  return response
}
