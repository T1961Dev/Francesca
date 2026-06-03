import "server-only"

import type Stripe from "stripe"

import { SUPPORTED_CURRENCIES } from "@/lib/billing/currency"
import { sendTrackedEmail } from "@/lib/resend/send"
import { lifetimeRefundEmail, paymentFailedEmail } from "@/lib/resend/templates"
import { getStripe } from "@/lib/stripe/client"
import {
  LIFETIME_MAX_INVENTORY,
  planFromPriceId,
  requirePriceId,
} from "@/lib/stripe/plans"
import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

const FAILED_PAYMENT_LIMIT = 3

/**
 * Top-level Stripe event handler.
 *
 * - Idempotent: every event is keyed by Stripe event id in `billing_events`.
 * - Resilient: any handler error throws and Stripe will retry the webhook.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  const supabase = createAdminClient()

  // Idempotency: if we've already recorded this event id, return immediately.
  const { data: existing } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existing?.id) {
    return
  }

  // Record the event row up front. The unique index on stripe_event_id means a
  // duplicate concurrent delivery will fail-fast here too.
  const { error: insertError } = await supabase.from("billing_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  if (insertError && insertError.code !== "23505") {
    // 23505 = unique violation from a concurrent insert — safe to ignore.
    throw insertError
  }

  switch (event.type) {
    case "checkout.session.completed":
      await applyCheckoutSession(event.data.object as Stripe.Checkout.Session, {
        supabase,
        skipIdempotencyCheck: true, // event row already inserted above
      })
      return
    case "customer.subscription.updated":
      await onSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
      return
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription)
      return
    case "invoice.payment_failed":
      await onInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
      return
    case "invoice.payment_succeeded":
      await onInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice)
      return
    default:
      return
  }
}

/**
 * Apply a completed Stripe Checkout Session to the user's profile.
 *
 * Used both by the webhook handler and by the synchronous success-redirect
 * endpoint (`/api/stripe/complete`), so the app works correctly even without
 * webhooks configured. Idempotent via the `billing_events` table.
 */
export async function applyCheckoutSession(
  session: Stripe.Checkout.Session,
  opts: { supabase?: AdminClient; skipIdempotencyCheck?: boolean } = {}
) {
  const supabase = opts.supabase ?? createAdminClient()

  if (!opts.skipIdempotencyCheck) {
    const { data: existing } = await supabase
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", session.id)
      .maybeSingle()

    if (existing?.id) return

    const { error: insertError } = await supabase.from("billing_events").insert({
      stripe_event_id: session.id,
      event_type: "checkout.session.completed.sync",
      payload: session as unknown as Record<string, unknown>,
    })

    if (insertError && insertError.code !== "23505") {
      throw insertError
    }
  }

  const userId =
    session.client_reference_id ||
    (typeof session.metadata?.user_id === "string" ? session.metadata.user_id : null)

  if (!userId) {
    console.warn("[stripe] checkout.session.completed without user id", session.id)
    return
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null

  if (customerId) {
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId)
  }

  // Subscription mode: starter / pro.
  if (session.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id

    if (!subscriptionId) return

    const stripe = getStripe()
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0]?.price.id ?? null
    const plan = planFromPriceId(priceId) ?? "free"

    await supabase
      .from("profiles")
      .update({
        plan,
        stripe_subscription_id: subscriptionId,
        subscription_status: subscription.status ?? "active",
        plan_cancels_at: null,
        failed_payment_count: 0,
      })
      .eq("id", userId)

    await cancelPendingReEngagementEmail(supabase, userId)
    return
  }

  // Payment mode: lifetime.
  if (session.mode === "payment") {
    const { data: confirmed, error } = await supabase.rpc("confirm_lifetime_purchase")

    if (error) {
      throw error
    }

    if (typeof confirmed !== "number" || confirmed === -1) {
      // Race lost — refund and apologise.
      await refundLifetimePurchase(session, userId)
      return
    }

    await supabase
      .from("profiles")
      .update({
        plan: "lifetime",
        subscription_status: "active",
        lifetime_purchased_at: new Date().toISOString(),
        failed_payment_count: 0,
      })
      .eq("id", userId)

    await cancelPendingReEngagementEmail(supabase, userId)

    // If we just hit the cap, deactivate the Stripe price so no further
    // checkouts can be created. Currency is read from session.currency.
    if (confirmed >= LIFETIME_MAX_INVENTORY) {
      await deactivateLifetimePrices()
    }
  }
}

async function onSubscriptionUpdated(supabase: AdminClient, subscription: Stripe.Subscription) {
  const userId = await findUserForCustomer(supabase, subscription.customer)
  if (!userId) return

  const priceId = subscription.items.data[0]?.price.id ?? null
  const plan = planFromPriceId(priceId) ?? "free"

  // If the user cancelled, leave plan in place until period end. Otherwise
  // reflect the new plan immediately.
  const cancelsAt =
    subscription.cancel_at && subscription.cancel_at_period_end
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null

  await supabase
    .from("profiles")
    .update({
      plan: cancelsAt ? undefined : plan,
      subscription_status: subscription.status ?? "active",
      stripe_subscription_id: subscription.id,
      plan_cancels_at: cancelsAt,
    })
    .eq("id", userId)
}

async function onSubscriptionDeleted(supabase: AdminClient, subscription: Stripe.Subscription) {
  const userId = await findUserForCustomer(supabase, subscription.customer)
  if (!userId) return

  // Revert to free immediately once Stripe says the subscription is gone.
  await supabase
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: "canceled",
      stripe_subscription_id: null,
      plan_cancels_at: null,
    })
    .eq("id", userId)
}

async function onInvoicePaymentFailed(supabase: AdminClient, invoice: Stripe.Invoice) {
  const userId = await findUserForCustomer(supabase, invoice.customer)
  if (!userId) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("failed_payment_count, email, full_name")
    .eq("id", userId)
    .maybeSingle()

  const next = (profile?.failed_payment_count ?? 0) + 1

  if (next >= FAILED_PAYMENT_LIMIT) {
    await supabase
      .from("profiles")
      .update({
        plan: "free",
        subscription_status: "past_due",
        failed_payment_count: next,
      })
      .eq("id", userId)
  } else {
    await supabase
      .from("profiles")
      .update({ failed_payment_count: next, subscription_status: "past_due" })
      .eq("id", userId)
  }

  if (profile?.email) {
    const emailType = next >= FAILED_PAYMENT_LIMIT ? "payment_failed_final" : "payment_failed"
    await sendTrackedEmail({
      userId,
      type: emailType,
      to: profile.email,
      template: paymentFailedEmail({
        name: profile.full_name ?? null,
        attempt: next,
      }),
      idempotencyKey: `${emailType}/${userId}/${next}`,
    }).catch(() => undefined)
  }

  if (next >= FAILED_PAYMENT_LIMIT) {
    return
  }
}

async function onInvoicePaymentSucceeded(supabase: AdminClient, invoice: Stripe.Invoice) {
  const userId = await findUserForCustomer(supabase, invoice.customer)
  if (!userId) return

  await supabase
    .from("profiles")
    .update({ failed_payment_count: 0, subscription_status: "active" })
    .eq("id", userId)
}

async function findUserForCustomer(
  supabase: AdminClient,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
) {
  const customerId =
    typeof customer === "string" ? customer : customer && "id" in customer ? customer.id : null
  if (!customerId) return null

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  return data?.id ?? null
}

async function refundLifetimePurchase(session: Stripe.Checkout.Session, userId: string) {
  try {
    const stripe = getStripe()
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id

    if (paymentIntentId) {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    }

    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle()

    if (profile?.email) {
      await sendTrackedEmail({
        userId,
        type: "lifetime_refund_race",
        to: profile.email,
        template: lifetimeRefundEmail({ name: profile.full_name ?? null }),
      }).catch(() => undefined)
    }
  } catch (error) {
    console.error("[stripe-webhook] failed to refund lost lifetime race", error)
  }
}

async function deactivateLifetimePrices() {
  // Only deactivate currencies that have a configured price id. Skip silently
  // for any currency whose env var is missing (e.g. only USD is configured
  // at launch).
  const stripe = getStripe()
  for (const currency of SUPPORTED_CURRENCIES) {
    try {
      const priceId = requirePriceId("lifetime", currency)
      await stripe.prices.update(priceId, { active: false })
    } catch (error) {
      console.warn(
        `[stripe] failed to deactivate lifetime price (${currency})`,
        error instanceof Error ? error.message : error
      )
    }
  }
}

async function cancelPendingReEngagementEmail(supabase: AdminClient, userId: string) {
  // Best-effort: the table may not exist yet in older environments.
  try {
    await supabase
      .from("re_engagement_emails")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("sent_at", null)
      .is("cancelled_at", null)
  } catch (error) {
    console.warn(
      "[stripe-webhook] could not cancel re-engagement emails",
      error instanceof Error ? error.message : error
    )
  }
}
