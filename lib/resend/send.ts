import "server-only"

import { getResend } from "@/lib/resend/client"
import { htmlToPlainText } from "@/lib/resend/html-utils"
import { createAdminClient } from "@/lib/supabase/admin"

export type EmailTemplate = { subject: string; html: string }

export type EmailType =
  | "welcome"
  | "score_ready"
  | "upgrade_prompt"
  | "re_engagement"
  | "payment_failed"
  | "payment_failed_final"
  | "lifetime_refund_race"
  | "health_check"

type SendArgs = {
  /** Omit for system emails (e.g. admin health check) — must not be a fake UUID. */
  userId?: string | null
  to: string
  type: EmailType
  metadata?: Record<string, unknown>
  /** Resend idempotency key — prevents duplicate sends on retry (24h window). */
  idempotencyKey?: string
} & (
  | { subject: string; html: string; template?: never }
  | { template: EmailTemplate; subject?: never; html?: never }
)

export async function sendTrackedEmail(args: SendArgs) {
  const from = process.env.RESEND_FROM_EMAIL?.trim()

  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL")
  }

  const subject = "template" in args && args.template ? args.template.subject : args.subject
  const html = "template" in args && args.template ? args.template.html : args.html

  if (!subject || !html) {
    throw new Error("sendTrackedEmail requires subject + html or a template")
  }

  const text = htmlToPlainText(html)
  const idempotencyKey =
    args.idempotencyKey ??
    `${args.type}/${args.userId ?? "system"}/${subject.slice(0, 32)}`

  const replyTo =
    process.env.RESEND_REPLY_TO?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    undefined

  const resend = getResend()
  const supabase = createAdminClient()

  const { data, error } = await resend.emails.send(
    {
      from,
      to: args.to,
      subject,
      html,
      text,
      replyTo,
      tags: [
        { name: "email_type", value: args.type },
        ...(args.userId
          ? [{ name: "user_id", value: args.userId.slice(0, 36) }]
          : []),
      ],
    },
    { idempotencyKey }
  )

  const { error: insertError } = await supabase.from("email_events").insert({
    user_id: args.userId ?? null,
    email_type: args.type,
    sent_to: args.to,
    status: error ? "failed" : "sent",
    metadata: {
      ...args.metadata,
      resendId: data?.id,
      error: error ? { message: error.message, name: error.name } : null,
      idempotencyKey,
    },
  })

  if (insertError) {
    throw new Error(`email_events insert failed: ${insertError.message}`)
  }

  if (error) {
    throw new Error(error.message)
  }

  return data
}
