import type { Currency, StripePlan, StripePlanId } from "@/types/billing"

/**
 * Plan catalogue. Order = display order on pricing pages.
 *
 * Pricing (per client spec):
 *  - Starter:   £29  / €34  / $37   monthly
 *  - Pro:       £79  / €92  / $99   monthly
 *  - Lifetime:  £349 / €399 / $427  one-time
 */
export const plans: StripePlan[] = [
  {
    id: "starter",
    name: "Starter",
    description:
      "Full deck analysis and financial modelling. Everything you need before outreach.",
    mode: "subscription",
    prices: { gbp: 29, eur: 34, usd: 37 },
    priceIdEnv: {
      gbp: "STRIPE_PRICE_STARTER_GBP",
      eur: "STRIPE_PRICE_STARTER_EUR",
      usd: "STRIPE_PRICE_STARTER_USD",
    },
    features: [
      "Full deck analysis with investor feedback",
      "Deck PDF export",
      "36-month financial model",
      "Financial model PDF export",
    ],
    limits: {
      deckUploadsPerMonth: 10,
      financialModelRunsPerMonth: 10,
      investorMatchRunsPerMonth: 0,
      investorMatchesPerRun: 0,
    },
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Everything in Starter, plus ranked investor matching and personalised outreach.",
    mode: "subscription",
    prices: { gbp: 79, eur: 92, usd: 99 },
    priceIdEnv: {
      gbp: "STRIPE_PRICE_PRO_GBP",
      eur: "STRIPE_PRICE_PRO_EUR",
      usd: "STRIPE_PRICE_PRO_USD",
    },
    features: [
      "Everything in Starter",
      "25 ranked investors per run",
      "Personalised outreach emails",
      "Branded one-page teaser for investor outreach",
      "CSV and PDF export of matches",
    ],
    limits: {
      deckUploadsPerMonth: 25,
      financialModelRunsPerMonth: 25,
      investorMatchRunsPerMonth: 10,
      investorMatchesPerRun: 25,
    },
  },
  {
    id: "lifetime",
    name: "Lifetime",
    description:
      "Pay once. Keep RaiseWise forever. Limited to the first 30 founders.",
    mode: "payment",
    prices: { gbp: 349, eur: 399, usd: 427 },
    priceIdEnv: {
      gbp: "STRIPE_PRICE_LIFETIME_GBP",
      eur: "STRIPE_PRICE_LIFETIME_EUR",
      usd: "STRIPE_PRICE_LIFETIME_USD",
    },
    features: [
      "Everything in Pro",
      "25 ranked investors per run",
      "Pay once, no subscription",
      "Hard-capped at 30 founders globally",
      "Priority support",
    ],
    limits: {
      deckUploadsPerMonth: 5,
      financialModelRunsPerMonth: 5,
      investorMatchRunsPerMonth: 2,
      investorMatchesPerRun: 25,
    },
  },
]

export const LIFETIME_MAX_INVENTORY = 30 as const

export const FREE_DECK_UPLOAD_LIMIT = 1 as const

export function getPlan(planId: string): StripePlan | undefined {
  return plans.find((plan) => plan.id === planId)
}

export function getPriceId(planId: string, currency: Currency): string | undefined {
  const plan = getPlan(planId)
  if (!plan) return undefined
  return process.env[plan.priceIdEnv[currency]]?.trim() || undefined
}

export function requirePriceId(
  planId: StripePlanId,
  currency: Currency
): string {
  const id = getPriceId(planId, currency)
  if (!id) {
    const plan = getPlan(planId)
    const envName = plan?.priceIdEnv[currency] ?? "unknown"
    throw new Error(
      `Missing Stripe price ID for ${planId}/${currency}. Set the ${envName} env var.`
    )
  }
  return id
}

/** Reverse lookup: which plan does a given Stripe price ID belong to? */
export function planFromPriceId(priceId: string | null | undefined): StripePlanId | null {
  if (!priceId) return null
  const trimmed = priceId.trim()
  for (const plan of plans) {
    for (const env of Object.values(plan.priceIdEnv)) {
      if (process.env[env]?.trim() === trimmed) {
        return plan.id
      }
    }
  }
  return null
}

export function isPaidPlan(planId: string): boolean {
  return planId === "starter" || planId === "pro" || planId === "lifetime"
}

export function hasInvestorMatching(planId: string): boolean {
  return planId === "pro" || planId === "lifetime"
}

export function hasFullDeckAnalysis(planId: string): boolean {
  return isPaidPlan(planId)
}

export function hasFinancialModel(planId: string): boolean {
  return isPaidPlan(planId)
}

/**
 * How many ranked investors should the matching pipeline aim to return for
 * this plan? Used to size the GPT ranker schema cap and prompt target.
 * Free / Starter return 0 — they don't get investor matching at all.
 */
export function getInvestorMatchesPerRun(planId: string): number {
  const plan = getPlan(planId)
  return plan?.limits.investorMatchesPerRun ?? 0
}

/**
 * Per-run pipeline sizing for the investor matching funnel. We tune the
 * Apify fetch + shortlist budget around the plan's match cap so we don't
 * over-scrape (expensive) or under-scrape (can't hit the cap). All values
 * include a healthy buffer for dedup, filter, and ranker losses.
 *
 * Returns null for plans without investor matching.
 */
export function getInvestorMatchPipelineSizing(planId: string): {
  targetMatchCount: number
  leadsFinderFetchCount: number
  shortlistTarget: number
  partnersPerFirm: number
} | null {
  const target = getInvestorMatchesPerRun(planId)
  if (target <= 0) return null

  // ~3x fetch buffer covers: (a) leads without validated emails, (b) leads
  // that dedup into the same firm, (c) firms that fail Crunchbase/LinkedIn
  // enrichment, (d) firms the ranker rates as misfits.
  const leadsFinderFetchCount = Math.max(80, target * 3)

  // We enrich ~1.5x the target so the ranker has runway to pick the best.
  // 3 partners per firm gives ~targetMatchCount * 4.5 candidates entering
  // the ranker — plenty without blowing up LinkedIn cost.
  const shortlistTarget = Math.max(50, Math.ceil(target * 1.5))

  return {
    targetMatchCount: target,
    leadsFinderFetchCount,
    shortlistTarget,
    partnersPerFirm: 3,
  }
}
