import "server-only"

import { getResend } from "@/lib/resend/client"
import { createAdminClient } from "@/lib/supabase/admin"

export type EmailTemplate = { subject: string; html: string }

type SendArgs = {
  userId: string
  to: string
  type: string
  metadata?: Record<string, unknown>
} & ({ subject: string; html: string; template?: never } | { template: EmailTemplate; subject?: never; html?: never })

export async function sendTrackedEmail(args: SendArgs) {
  const from = process.env.RESEND_FROM_EMAIL

  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL")
  }

  const subject = "template" in args && args.template ? args.template.subject : args.subject
  const html = "template" in args && args.template ? args.template.html : args.html

  if (!subject || !html) {
    throw new Error("sendTrackedEmail requires subject + html or a template")
  }

  const resend = getResend()
  const supabase = createAdminClient()
  const response = await resend.emails.send({ from, to: args.to, subject, html })

  await supabase.from("email_events").insert({
    user_id: args.userId,
    email_type: args.type,
    sent_to: args.to,
    status: response.error ? "failed" : "sent",
    metadata: {
      ...args.metadata,
      resendId: response.data?.id,
      error: response.error,
    },
  })

  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.data
}
