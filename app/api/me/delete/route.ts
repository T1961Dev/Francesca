import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Permanently delete the calling user and all dependent app rows.
 * Uses Supabase Auth Admin `deleteUser` (hard delete) so FK cascades
 * remove related public rows (`profiles`, decks, models, matches, etc.).
 */
export async function POST() {
  try {
    const user = await requireAuth()
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle()

    const subscriptionId = profile?.stripe_subscription_id
      ? String(profile.stripe_subscription_id)
      : null

    if (subscriptionId) {
      try {
        await getStripe().subscriptions.cancel(subscriptionId)
      } catch (error) {
        captureError(error, { route: "me-delete-cancel-sub", userId: user.id })
      }
    }

    await admin.auth.admin.deleteUser(user.id)

    const supabase = await createClient()
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route: "me-delete" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not delete" },
      { status: 500 }
    )
  }
}
