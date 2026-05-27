import { NextResponse, type NextRequest } from "next/server"

import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { applyCheckoutSession } from "@/lib/stripe/webhook"

/**
 * Synchronous post-checkout finalisation.
 *
 * Stripe redirects users here after a successful Checkout Session
 * (`success_url`). We retrieve the session via the Stripe API and apply the
 * resulting plan/subscription to the user's profile immediately, so the app
 * works correctly without a webhook configured.
 *
 * If you later set up Stripe webhooks, this endpoint is still safe to hit
 * because `applyCheckoutSession` is idempotent via `billing_events`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get("session_id")
  const next = url.searchParams.get("next") || "/dashboard/billing"
  const safeNext = next.startsWith("/") ? next : "/dashboard/billing"

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    url.origin

  const finalRedirect = (status: "success" | "pending" | "error") => {
    const target = new URL(safeNext, appUrl)
    target.searchParams.set("checkout", status)
    return NextResponse.redirect(target.toString())
  }

  if (!sessionId) {
    return finalRedirect("error")
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "payment_intent"],
    })

    // Payment hasn't actually succeeded yet — let the user try again rather
    // than awarding a plan they didn't pay for.
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      return finalRedirect("pending")
    }

    await applyCheckoutSession(session)

    const userId =
      session.client_reference_id ||
      (typeof session.metadata?.user_id === "string"
        ? session.metadata.user_id
        : null)

    if (userId) {
      await captureServerEvent("checkout_completed", userId, {
        plan: typeof session.metadata?.plan === "string" ? session.metadata.plan : null,
        currency: session.currency ?? null,
        amount_total: session.amount_total ?? null,
      })
    }

    return finalRedirect("success")
  } catch (error) {
    captureError(error, { route: "stripe-complete", sessionId })
    return finalRedirect("error")
  }
}
