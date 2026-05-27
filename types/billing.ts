import type { Plan } from "@/types/app"

export type Currency = "gbp" | "eur" | "usd"

export type StripePlanId = Exclude<Plan, "free">

export type StripePlanMode = "subscription" | "payment"

export type StripePlan = {
  id: StripePlanId
  name: string
  description: string
  mode: StripePlanMode
  /** Display prices keyed by currency. Amount is the unit in the currency (e.g. £29 = 29). */
  prices: Record<Currency, number>
  /** Env var names for the Stripe price IDs, keyed by currency. */
  priceIdEnv: Record<Currency, string>
  features: string[]
  /** Soft monthly caps, used by the usage tracker. */
  limits: {
    deckUploadsPerMonth: number
    financialModelRunsPerMonth: number
    investorMatchRunsPerMonth: number
  }
}
