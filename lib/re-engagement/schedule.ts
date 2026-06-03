import "server-only"

import { reEngagementEmail } from "@/lib/resend/templates"
import { createAdminClient } from "@/lib/supabase/admin"

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

/**
 * Schedule the one-and-only re-engagement email for a free user. The table has
 * a unique index on user_id, so duplicate scheduling attempts are a no-op.
 */
export async function scheduleReEngagementEmail({
  userId,
  name,
  score,
  analysisId,
}: {
  userId: string
  name: string | null
  score: number | null
  analysisId: string | null
}) {
  const supabase = createAdminClient()
  const template = reEngagementEmail({ name, score, analysisId })
  const scheduledFor = new Date(Date.now() + TWENTY_FOUR_HOURS_MS).toISOString()

  const { error } = await supabase
    .from("re_engagement_emails")
    .insert({
      user_id: userId,
      analysis_id: analysisId,
      scheduled_for: scheduledFor,
      subject: template.subject,
      body: { html: template.html },
    })

  if (error && error.code !== "23505") {
    // 23505 = unique violation (already queued). Safe to ignore.
    throw error
  }
}
