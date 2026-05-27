import { NextResponse } from "next/server"

import { captureError } from "@/lib/sentry/capture"
import { getStripe } from "@/lib/stripe/client"
import { createAdminClient } from "@/lib/supabase/admin"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const provided =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      request.headers.get("x-cron-secret") ||
      ""
    if (provided !== secret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = createAdminClient()
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

    const { data: due } = await supabase
      .from("profiles")
      .select("id, stripe_subscription_id")
      .lt("deleted_at", cutoff)
      .limit(100)

    let deleted = 0
    for (const profile of due ?? []) {
      const id = String(profile.id)
      const subId = profile.stripe_subscription_id ? String(profile.stripe_subscription_id) : null

      if (subId) {
        try {
          await getStripe().subscriptions.cancel(subId)
        } catch (error) {
          captureError(error, { route: "hard-delete-cancel-sub", userId: id })
        }
      }

      // Hard delete via auth admin API — cascades to dependent rows via FKs.
      try {
        await supabase.auth.admin.deleteUser(id)
        deleted += 1
      } catch (error) {
        captureError(error, { route: "hard-delete-auth", userId: id })
      }
    }

    return NextResponse.json({ success: true, data: { deleted, considered: due?.length ?? 0 } })
  } catch (error) {
    captureError(error, { route: "cron-hard-delete" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
