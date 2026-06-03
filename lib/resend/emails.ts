import "server-only"

import {
  reEngagementEmail,
  scoreReadyEmail,
  upgradePromptEmail,
  welcomeEmail,
} from "@/lib/resend/templates"
import { sendTrackedEmail } from "@/lib/resend/send"
import { createAdminClient } from "@/lib/supabase/admin"

export async function sendWelcomeEmail(args: {
  userId: string
  to: string
  name?: string | null
}) {
  await sendTrackedEmail({
    userId: args.userId,
    to: args.to,
    type: "welcome",
    template: welcomeEmail(args.name),
    idempotencyKey: `welcome/${args.userId}`,
  })

  const admin = createAdminClient()
  await admin
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", args.userId)
}

export async function sendScoreReadyEmail(args: {
  userId: string
  to: string
  score?: number | null
  analysisId: string
}) {
  const idempotencyKey = `score_ready/${args.userId}/${args.analysisId}`

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("user_id", args.userId)
    .eq("email_type", "score_ready")
    .contains("metadata", { analysisId: args.analysisId })
    .maybeSingle()

  if (existing) return { skipped: true as const }

  await sendTrackedEmail({
    userId: args.userId,
    to: args.to,
    type: "score_ready",
    template: scoreReadyEmail({
      score: args.score,
      analysisId: args.analysisId,
    }),
    idempotencyKey,
    metadata: { analysisId: args.analysisId, score: args.score },
  })

  return { skipped: false as const }
}

/**
 * Sent once when a free user dismisses the paywall (Maybe later / close).
 * Deduped per deck analysis.
 */
export async function sendUpgradePromptEmail(args: {
  userId: string
  to: string
  analysisId?: string | null
}) {
  const admin = createAdminClient()

  if (args.analysisId) {
    const { data: existing } = await admin
      .from("email_events")
      .select("id")
      .eq("user_id", args.userId)
      .eq("email_type", "upgrade_prompt")
      .contains("metadata", { analysisId: args.analysisId })
      .maybeSingle()

    if (existing) return { skipped: true as const }
  } else {
    const { data: profile } = await admin
      .from("profiles")
      .select("upgrade_prompt_sent")
      .eq("id", args.userId)
      .maybeSingle()

    if (profile?.upgrade_prompt_sent) return { skipped: true as const }
  }

  const idempotencyKey = args.analysisId
    ? `upgrade_prompt/${args.userId}/${args.analysisId}`
    : `upgrade_prompt/${args.userId}`

  await sendTrackedEmail({
    userId: args.userId,
    to: args.to,
    type: "upgrade_prompt",
    template: upgradePromptEmail({ analysisId: args.analysisId }),
    idempotencyKey,
    metadata: args.analysisId ? { analysisId: args.analysisId } : {},
  })

  await admin
    .from("profiles")
    .update({ upgrade_prompt_sent: true })
    .eq("id", args.userId)

  return { skipped: false as const }
}

export async function hasSentScoreReady(userId: string, analysisId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", "score_ready")
    .contains("metadata", { analysisId })
    .maybeSingle()

  return Boolean(data)
}

export { reEngagementEmail }
