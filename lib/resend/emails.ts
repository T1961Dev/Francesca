import "server-only"

import {
  reEngagementEmail,
  scoreReadyEmail,
  upgradePromptEmail,
  welcomeEmail,
} from "@/lib/resend/templates"
import { sendTrackedEmail, type EmailType } from "@/lib/resend/send"
import { createAdminClient } from "@/lib/supabase/admin"

async function hasEmailEvent(
  userId: string,
  emailType: EmailType,
  analysisId?: string | null
) {
  const admin = createAdminClient()
  let query = admin
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", emailType)

  if (analysisId) {
    query = query.filter("metadata->>analysisId", "eq", analysisId)
  }

  const { data } = await query.maybeSingle()
  return Boolean(data)
}

export async function sendWelcomeEmail(args: {
  userId: string
  to: string
  name?: string | null
}) {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("welcome_email_sent")
    .eq("id", args.userId)
    .maybeSingle()

  if (profile?.welcome_email_sent) {
    return { skipped: true as const }
  }

  await sendTrackedEmail({
    userId: args.userId,
    to: args.to,
    type: "welcome",
    template: welcomeEmail(args.name),
    idempotencyKey: `welcome/${args.userId}`,
  })

  await admin
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", args.userId)

  return { skipped: false as const }
}

/** Called after onboarding step 5 and from dashboard bootstrap. */
export async function queueWelcomeEmailIfNeeded(args: {
  userId: string
  email: string
  name?: string | null
  welcomeEmailSent?: boolean | null
}) {
  if (args.welcomeEmailSent || !args.email.trim()) {
    return { skipped: true as const }
  }

  return sendWelcomeEmail({
    userId: args.userId,
    to: args.email.trim(),
    name: args.name,
  })
}

export async function sendScoreReadyEmail(args: {
  userId: string
  to: string
  score?: number | null
  analysisId: string
}) {
  const idempotencyKey = `score_ready/${args.userId}/${args.analysisId}`

  const admin = createAdminClient()
  if (await hasEmailEvent(args.userId, "score_ready", args.analysisId)) {
    return { skipped: true as const }
  }

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
    if (await hasEmailEvent(args.userId, "upgrade_prompt", args.analysisId)) {
      return { skipped: true as const }
    }
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
  return hasEmailEvent(userId, "score_ready", analysisId)
}

export { reEngagementEmail }
