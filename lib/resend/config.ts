import "server-only"

export function getResendConfigStatus() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const replyTo =
    process.env.RESEND_REPLY_TO?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    null
  const cronSecret = Boolean(process.env.CRON_SECRET?.trim())

  const usingTestFrom = from?.includes("@resend.dev") ?? false

  return {
    ready: Boolean(apiKey && from),
    apiKeyPresent: Boolean(apiKey),
    fromPresent: Boolean(from),
    fromAddress: from ? from.replace(/<[^>]+>/, "(hidden)").trim() : null,
    usingTestFrom,
    replyToPresent: Boolean(replyTo),
    cronSecretPresent: cronSecret,
    hints: [
      !apiKey && "Set RESEND_API_KEY on Render and in .env.local.",
      !from && 'Set RESEND_FROM_EMAIL e.g. "RaiseWise <hello@yourdomain.com>" (domain verified in Resend).',
      usingTestFrom &&
        "onboarding@resend.dev is for testing only — use a verified domain in production.",
      !cronSecret &&
        "Set CRON_SECRET for /api/cron/re-engagement and /api/cron/health-check (required on Render).",
    ].filter(Boolean) as string[],
  }
}
