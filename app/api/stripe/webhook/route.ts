import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { handleStripeEvent } from "@/lib/stripe/webhook"

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET")

    const signature = (await headers()).get("stripe-signature")
    if (!signature) throw new Error("Missing stripe-signature header")

    const body = await request.text()
    const event = getStripe().webhooks.constructEvent(body, signature, secret)

    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    captureError(error, { route: "stripe-webhook" })
    return NextResponse.json({ success: false, error: "Webhook verification failed" }, { status: 400 })
  }
}
