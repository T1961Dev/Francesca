import { NextResponse } from "next/server"

import { captureError } from "@/lib/sentry/capture"
import { authorizeCronRequest } from "@/lib/security/cron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Monthly reset cron. Schedule one of:
 *   - Supabase pg_cron (built in to the SQL migration when the extension is on).
 *   - Vercel Cron Jobs (vercel.json: `{ "crons": [{ "path": "/api/cron/monthly-reset", "schedule": "0 0 1 * *" }] }`).
 *   - External cron service hitting this endpoint with the CRON_SECRET header.
 *
 * Idempotent: callable multiple times safely (the SQL resets to 0).
 */
async function handle(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("reset_monthly_usage")
    if (error) throw error
    return NextResponse.json({ success: true, data: { rowsReset: data ?? 0 } })
  } catch (error) {
    captureError(error, { route: "cron-monthly-reset" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Reset failed" },
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
