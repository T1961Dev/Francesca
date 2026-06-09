import {
  FREE_DECK_UPLOAD_LIMIT,
  getPlan,
} from "@/lib/stripe/plans"
import type { Plan } from "@/types/app"

export type UsageAction =
  | "deck_upload"
  | "financial_model_run"
  | "investor_match_run"

export type LimitResolution = {
  action: UsageAction
  /** Numeric cap to pass to the SQL function. */
  limit: number
  /** True for Free plan deck uploads — compares against total_deck_uploads_ever. */
  useEverCounter: boolean
  /** Human label for the soft-block modal. */
  label: "deck_uploads" | "financial_models" | "investor_matches"
}

/**
 * Resolve the numeric limit + counter type for a given plan + action.
 * Free founders get exactly one deck upload ever.
 */
export function resolveUsageLimit(
  plan: Plan,
  action: UsageAction
): LimitResolution {
  const planConfig = plan === "free" ? null : getPlan(plan)

  switch (action) {
    case "deck_upload": {
      if (plan === "free") {
        return {
          action,
          limit: FREE_DECK_UPLOAD_LIMIT,
          useEverCounter: true,
          label: "deck_uploads",
        }
      }
      return {
        action,
        limit: planConfig?.limits.deckUploadsPerMonth ?? 0,
        useEverCounter: false,
        label: "deck_uploads",
      }
    }
    case "financial_model_run": {
      if (plan === "free") {
        return { action, limit: 0, useEverCounter: false, label: "financial_models" }
      }
      return {
        action,
        limit: planConfig?.limits.financialModelRunsPerMonth ?? 0,
        useEverCounter: false,
        label: "financial_models",
      }
    }
    case "investor_match_run": {
      if (plan === "free" || plan === "starter") {
        return { action, limit: 0, useEverCounter: false, label: "investor_matches" }
      }
      return {
        action,
        limit: planConfig?.limits.investorMatchRunsPerMonth ?? 0,
        useEverCounter: false,
        label: "investor_matches",
      }
    }
  }
}

/** Next monthly reset boundary, UTC. */
export function nextMonthlyResetAt(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return d
}
