import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ success: false, error: "No Stripe customer found" }, { status: 400 })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    })

    await captureServerEvent("customer_portal_opened", user.id)
    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    captureError(error, { route: "stripe-portal" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Portal failed" }, { status: 400 })
  }
}
