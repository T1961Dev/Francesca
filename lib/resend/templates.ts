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
      <p>Take 2 minutes to complete your founder profile, then upload your deck for an instant investor-readiness score.</p>
      <p>
        <a href="${appUrl()}/onboarding" style="display:inline-block;background:#1A3C2A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Start onboarding</a>
      </p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function scoreReadyEmail(score?: number | null): EmailTemplate {
  return {
    subject: "Your deck score is ready",
    html: `
      <p>Your investor-readiness report is ready${typeof score === "number" ? ` with a score of ${score}/100` : ""}.</p>
      <p>Log in to review your next steps.</p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function upgradePromptEmail(): EmailTemplate {
  return {
    subject: "Unlock your full investor-readiness report",
    html: `
      <p>Your free report shows the headline score. Upgrade to unlock category feedback, risks, fixes, exports, and investor matching.</p>
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
          : "Your latest payment didn't go through. We'll try again automatically."
      }</p>
      <p>
        <a href="${appUrl()}/dashboard/billing" style="display:inline-block;background:#1A3C2A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Update payment method</a>
      </p>
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
      <p>RaiseWise Lifetime is limited to 50 founders. Multiple people checked out at the same moment and unfortunately we couldn't grant your slot. We've refunded your payment in full.</p>
      <p>If you'd still like access, our Pro plan is available at any time.</p>
      <p>
        <a href="${appUrl()}/dashboard/billing" style="display:inline-block;background:#1A3C2A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View Pro plan</a>
      </p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

export function reEngagementEmail(args: {
  name?: string | null
  score?: number | null
  ctaPath?: string
}): EmailTemplate {
  const greeting = firstName(args.name) ?? "there"
  const score = typeof args.score === "number" ? args.score : null
  const cta = args.ctaPath?.startsWith("/")
    ? `${appUrl()}${args.ctaPath}`
    : `${appUrl()}/dashboard`
  return {
    subject:
      score !== null
        ? `Your readiness score: ${score}/100 — waiting for you`
        : "Your investor-readiness report is waiting",
    html: `
      <p>Hi ${greeting},</p>
      <p>You scored ${score ?? "—"}/100 on your fundraising readiness. There are specific things investors will push back on — and you can see exactly what they are inside the full analysis.</p>
      <p>
        <a href="${cta}" style="display:inline-block;background:#1A3C2A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Unlock your full analysis →</a>
      </p>
      <p>${BRAND_SIGNOFF}</p>
    `,
  }
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://raisewise.app"
  ).replace(/\/$/, "")
}
