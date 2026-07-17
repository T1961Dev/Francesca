import { redirect } from "next/navigation"

import { getProfile } from "@/lib/auth"
import { extractDimensionNames } from "@/lib/deck/preview"
import {
  hasFinancialModel,
  hasFullDeckAnalysis,
  hasInvestorMatching,
  isPaidPlan,
} from "@/lib/stripe/plans"
import type { Plan } from "@/types/app"

export async function getUserPlan(): Promise<Plan> {
  const profile = await getProfile()
  return (profile?.plan as Plan | undefined) ?? "free"
}

export async function requirePaid() {
  const plan = await getUserPlan()

  if (!isPaidPlan(plan)) {
    redirect("/pricing")
  }

  return plan
}

export async function requirePro() {
  const plan = await getUserPlan()

  if (!hasInvestorMatching(plan)) {
    redirect("/pricing")
  }

  return plan
}

export function canViewFullDeckAnalysis(plan: Plan) {
  return hasFullDeckAnalysis(plan)
}

export function canExportPdf(plan: Plan) {
  return isPaidPlan(plan)
}

export function canUseFinancialModel(plan: Plan) {
  return hasFinancialModel(plan)
}

export function canUseInvestorMatching(plan: Plan) {
  return hasInvestorMatching(plan)
}

export function canGenerateTeaser(plan: Plan) {
  return hasInvestorMatching(plan)
}

/** Raise Brief uses the same Pro/lifetime gate as the former teaser. */
export function canGenerateRaiseBrief(plan: Plan) {
  return hasInvestorMatching(plan)
}

export function canViewInvestorOutreachTemplates(plan: Plan) {
  return hasInvestorMatching(plan)
}

/**
 * Strip sensitive deck analysis fields before they reach the browser.
 * Free users only receive score + dimension names.
 */
export function limitDeckAnalysisForPlan<T extends Record<string, unknown>>(
  analysis: T,
  plan: Plan
): T | (Pick<T, "id"> & {
  overall_score: unknown
  status: unknown
  category_scores: unknown
  locked: true
}) {
  if (canViewFullDeckAnalysis(plan)) {
    return analysis
  }

  const categoryScores = extractDimensionNames(analysis.category_scores).map((category) => ({
    category,
    locked: true as const,
  }))

  return {
    id: analysis.id as T["id"],
    overall_score: analysis.overall_score,
    status: analysis.status,
    category_scores: categoryScores,
    locked: true,
  }
}

export function limitInvestorMatchesForPlan<T>(matches: T[], plan: Plan): T[] {
  if (canViewInvestorOutreachTemplates(plan)) return matches
  return []
}
