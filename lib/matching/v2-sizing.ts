import { getInvestorMatchesPerRun } from "@/lib/stripe/plans"

/** Plan-aware budgets for investor pipeline v2. */
export type InvestorPipelineV2Sizing = {
  targetMatchCount: number
  leadsFinderFetchCount: number
  preFilterKeep: number
  linkedinProfileCap: number
  linkedinPostsCap: number
}

export function getInvestorPipelineV2Sizing(planId: string): InvestorPipelineV2Sizing | null {
  const target = getInvestorMatchesPerRun(planId)
  if (target <= 0) return null

  const leadsFinderFetchCount = Math.max(80, target * 4)
  const preFilterKeep = target + 15
  const linkedinProfileCap = Math.min(50, preFilterKeep)
  const linkedinPostsCap = target

  return {
    targetMatchCount: target,
    leadsFinderFetchCount,
    preFilterKeep,
    linkedinProfileCap,
    linkedinPostsCap,
  }
}
