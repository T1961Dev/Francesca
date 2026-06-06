import { appUrl, emailButton } from "@/lib/resend/html-utils"
import type { EmailTemplate } from "@/lib/resend/send"

const BRAND_SIGNOFF = "— The RaiseWise team"

function firstName(name?: string | null) {
  if (!name) return null
  return name.trim().split(/\s+/)[0] || null
}

export function welcomeEmail(name?: string | null): EmailTemplate {
  const greeting = firstName(name) ? `, ${firstName(name)}` : ""
  return {
    subject: "Welcome to RaiseWise",
    html: `
      <p>Welcome${greeting}.</p>
      <p>Your founder profile is set. Upload your pitch deck next to get an instant investor-readiness score and see what to fix before you fundraise.</p>
      <p>${emailButton("Upload your deck", appUrl("/dashboard/deck-analyser"))}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function scoreReadyEmail(args: {
  score?: number | null
  analysisId?: string | null
}): EmailTemplate {
  const score = typeof args.score === "number" ? args.score : null
  const href = args.analysisId
    ? appUrl(`/dashboard/deck-analyser/${args.analysisId}`)
    : appUrl("/dashboard/deck-analyser")

  return {
    subject: "Your deck score is ready",
    html: `
      <p>Your investor-readiness report is ready${score !== null ? ` with a score of <strong>${score}/100</strong>` : ""}.</p>
      <p>${emailButton("View your score", href)}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function upgradePromptEmail(args: { analysisId?: string | null }): EmailTemplate {
  const href = args.analysisId
    ? appUrl(`/dashboard/deck-analyser/${args.analysisId}`)
    : appUrl("/pricing")

  return {
    subject: "Unlock your full investor-readiness report",
    html: `
      <p>Your free report shows the headline score. Upgrade to unlock category feedback, risks, fixes, exports, and investor matching.</p>
      <p>${emailButton("Unlock full analysis", href)}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function paymentFailedEmail(args: { name?: string | null; attempt: number }): EmailTemplate {
  const greeting = firstName(args.name) ?? "there"
  const final = args.attempt >= 3
  return {
    subject: final
      ? "Your RaiseWise subscription was paused"
      : "We couldn't process your last payment",
    html: `
      <p>Hi ${greeting},</p>
      <p>${
        final
          ? "We tried 3 times to charge your card and couldn't get through. Your account has been moved back to the free plan."
          : `Your latest payment didn't go through (attempt ${args.attempt} of 3). We'll try again automatically — please update your card if anything changed.`
      }</p>
      <p>${emailButton("Update payment method", appUrl("/dashboard/billing"))}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function lifetimeRefundEmail(args: { name?: string | null }): EmailTemplate {
  const greeting = firstName(args.name) ?? "there"
  return {
    subject: "We had to refund your Lifetime purchase",
    html: `
      <p>Hi ${greeting},</p>
      <p>RaiseWise Lifetime is limited to 30 founders. Multiple people checked out at the same moment and unfortunately we couldn't grant your slot. We've refunded your payment in full.</p>
      <p>If you'd still like access, our Pro plan is available at any time.</p>
      <p>${emailButton("View Pro plan", appUrl("/dashboard/billing"))}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function reEngagementEmail(args: {
  name?: string | null
  score?: number | null
  analysisId?: string | null
}): EmailTemplate {
  const greeting = firstName(args.name) ?? "there"
  const score = typeof args.score === "number" ? args.score : null
  const href = args.analysisId
    ? appUrl(`/dashboard/deck-analyser/${args.analysisId}`)
    : appUrl("/dashboard")

  return {
    subject:
      score !== null
        ? `Your readiness score: ${score}/100 — waiting for you`
        : "Your investor-readiness report is waiting",
    html: `
      <p>Hi ${greeting},</p>
      <p>You scored ${score ?? "—"}/100 on your fundraising readiness. There are specific things investors will push back on — and you can see exactly what they are inside the full analysis.</p>
      <p>${emailButton("Unlock your full analysis", href)}</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}
