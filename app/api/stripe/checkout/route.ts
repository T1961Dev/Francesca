import { NextResponse } from "next/server"
import { z } from "zod"

import { getPublicAppUrl } from "@/lib/app-url"
import { requireAuth } from "@/lib/auth"
import { DEFAULT_CURRENCY, isSupportedCurrency } from "@/lib/billing/currency"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { fetchLifetimeInventory } from "@/lib/stripe/lifetime-inventory"
import { getPlan, requirePriceId } from "@/lib/stripe/plans"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Currency } from "@/types/billing"

const schema = z.object({
  plan: z.enum(["starter", "pro", "lifetime"]),
  currency: z
    .union([z.literal("gbp"), z.literal("eur"), z.literal("usd")])
    .optional(),
  returnPath: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const parsed = schema.parse(await request.json())
    const currency: Currency = isSupportedCurrency(parsed.currency)
      ? parsed.currency
      : DEFAULT_CURRENCY

    const plan = getPlan(parsed.plan)
    if (!plan) throw new Error(`Unknown plan: ${parsed.plan}`)

    const price = requirePriceId(plan.id, currency)

    // For Lifetime: race-safe pre-check via FOR UPDATE inside a single SQL call.
    // The webhook is still the authoritative gate that refunds on a true race.
    if (plan.id === "lifetime") {
      const admin = createAdminClient()
      const { data, error } = await admin.rpc("lifetime_slot_available")
      if (error) throw error
      if (data === false) {
        return NextResponse.json(
          { success: false, error: "Lifetime is sold out." },
          { status: 409 }
        )
      }
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle()

    const appUrl = getPublicAppUrl()

    const returnPath =
      parsed.returnPath && parsed.returnPath.startsWith("/")
        ? parsed.returnPath
        : "/dashboard/billing"

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      client_reference_id: user.id,
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id
        ? undefined
        : (profile?.email ?? user.email ?? undefined),
      line_items: [{ price, quantity: 1 }],
      // Send the user through our `/api/stripe/complete` endpoint so the plan
      // is upgraded synchronously via the Stripe API — no webhook required.
      success_url: `${appUrl}/api/stripe/complete?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnPath)}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan: plan.id,
        currency,
      },
      ...(plan.mode === "subscription"
        ? {
            subscription_data: {
              metadata: { user_id: user.id, plan: plan.id, currency },
            },
          }
        : {
            payment_intent_data: {
              metadata: { user_id: user.id, plan: plan.id, currency },
            },
          }),
    })

    await captureServerEvent("checkout_started", user.id, {
      plan: plan.id,
      currency,
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    captureError(error, { route: "stripe-checkout" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout failed",
      },
      { status: 400 }
    )
  }
}

/** Public inventory probe (used by the paywall modal). */
export async function GET() {
  const inventory = await fetchLifetimeInventory()
  return NextResponse.json({ success: true, data: inventory })
}
