import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { isOnboardingComplete } from "@/lib/onboarding"

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

  // Force onboarding on first dashboard visit (or any protected page) until
  // the founder profile is populated.
  if (user && isProtected && !isExemptFromOnboarding(pathname)) {
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
