import { NextResponse } from "next/server"

import { getAdminEmails } from "@/lib/admin/auth"
import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"
import { authorizeCronRequest } from "@/lib/security/cron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Daily 08:00 UTC health-check email to every ADMIN_EMAILS recipient.
 *
 * Schedule via:
 *   - Vercel cron: `0 8 * * *` against `/api/cron/health-check`
 *   - Supabase pg_cron + pg_net
 *   - External scheduler (e.g. cron-job.org)
 */
async function handle(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - DAY_MS).toISOString()

    const [{ count: signups }, { data: jobs }, { data: financials }, { data: decks }, { data: costs }, { count: failedJobs }] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("investor_matching_jobs").select("id, status, created_at").gte("created_at", since),
        supabase.from("financial_models").select("id, status, created_at").gte("created_at", since),
        supabase.from("deck_analyses").select("id, status, created_at").gte("created_at", since),
        supabase.from("api_costs").select("cost_usd, provider").gte("created_at", since),
        supabase.from("investor_matching_jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
      ])

    const totalCost = (costs ?? []).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0)
    const openAiCost = (costs ?? [])
      .filter((row) => row.provider === "openai")
      .reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0)
    const apifyCost = totalCost - openAiCost

    const html = `
      <p>RaiseWise — last 24h</p>
      <ul>
        <li>New signups: <strong>${signups ?? 0}</strong></li>
        <li>Deck analyses: ${decks?.length ?? 0}</li>
        <li>Financial models: ${financials?.length ?? 0}</li>
        <li>Investor matching jobs: ${jobs?.length ?? 0} (failed: ${failedJobs ?? 0})</li>
        <li>API spend: $${totalCost.toFixed(2)} (OpenAI $${openAiCost.toFixed(2)} · Apify $${apifyCost.toFixed(2)})</li>
      </ul>
    `

    const subject = `RaiseWise health check — ${new Date().toLocaleDateString("en-GB")}`
    const admins = getAdminEmails()
    for (const to of admins) {
      try {
        await sendTrackedEmail({
          userId: "00000000-0000-0000-0000-000000000000",
          to,
          type: "health_check",
          subject,
          html,
        })
      } catch (error) {
        captureError(error, { route: "cron-health-check-send", to })
      }
    }

    return NextResponse.json({ success: true, data: { admins: admins.length } })
  } catch (error) {
    captureError(error, { route: "cron-health-check" })
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
