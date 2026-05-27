import { NextResponse } from "next/server"

import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Schedule this every 5 minutes (Vercel cron / pg_cron / external).
 *
 * Each tick:
 *   1. Pull all due rows where sent_at IS NULL AND cancelled_at IS NULL.
 *   2. For each, re-check the user is still on free.
 *   3. If still free, send via Resend, mark sent_at.
 *   4. Otherwise mark cancelled_at and skip.
 */
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

    const { data: due } = await supabase
      .from("re_engagement_emails")
      .select("id, user_id, subject, body")
      .lte("scheduled_for", new Date().toISOString())
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(200)

    let sent = 0
    let cancelled = 0

    for (const row of due ?? []) {
      const userId = row.user_id as string
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, email")
        .eq("id", userId)
        .maybeSingle()

      if (!profile || profile.plan !== "free" || !profile.email) {
        await supabase
          .from("re_engagement_emails")
          .update({ cancelled_at: new Date().toISOString() })
          .eq("id", row.id as string)
        cancelled += 1
        continue
      }

      try {
        const body = row.body as { html?: string } | null
        await sendTrackedEmail({
          userId,
          to: profile.email,
          type: "re_engagement",
          subject: String(row.subject),
          html: body?.html ?? "",
        })
        await supabase
          .from("re_engagement_emails")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", row.id as string)
        sent += 1
      } catch (error) {
        captureError(error, { route: "cron-re-engagement-send", userId })
      }
    }

    return NextResponse.json({ success: true, data: { sent, cancelled, considered: due?.length ?? 0 } })
  } catch (error) {
    captureError(error, { route: "cron-re-engagement" })
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
