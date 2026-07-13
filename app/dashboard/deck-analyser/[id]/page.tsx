import { notFound } from "next/navigation"

import { DeckAnalysisSlideshow } from "@/components/deck/deck-analysis-slideshow"
import { DeckLockedView } from "@/components/deck/deck-locked-view"
import { DeckProcessingState } from "@/components/deck/deck-processing-state"
import { DeckInvestorMatchesSection } from "@/components/investors/deck-investor-matches-section"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { canGenerateTeaser, canViewFullDeckAnalysis, getUserPlan } from "@/lib/access"
import { detectCurrencyFromRequest } from "@/lib/billing/currency.server"
import { extractDimensionNames } from "@/lib/deck/preview"
import { fetchDeckAnalysisById } from "@/lib/deck/queries.server"
import { plans } from "@/lib/stripe/plans"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

type CategoryScore = { category: string; score: number; feedback: string }
type SuggestedFix = { title?: string; explanation?: string; priority?: string }
type PriorityAction = { action?: string; reason?: string; priority?: string }

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function cardItems(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object")
      )
    : []
}

export default async function DeckAnalysisResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ checkout?: string }>
}) {
  const { id } = await params
  const { checkout } = await searchParams
  const analysis = await fetchDeckAnalysisById(id)

  if (!analysis) notFound()

  if (analysis.status !== "completed") {
    return (
      <main className={dashboardPageMainClass}>
        <DeckProcessingState analysisId={id} />
      </main>
    )
  }

  const [plan, currency] = await Promise.all([getUserPlan(), detectCurrencyFromRequest()])
  const checkoutSuccess = checkout === "success"

  if (!canViewFullDeckAnalysis(plan)) {
    const dimensionNames = extractDimensionNames(analysis.category_scores)
    return (
      <DeckLockedView
        analysisId={id}
        score={analysis.overall_score as number | null}
        dimensionNames={dimensionNames}
        plans={plans}
        currency={currency}
      />
    )
  }

  const categories = ((analysis.category_scores as CategoryScore[] | null) ?? [])
    .filter((item) => item?.category)
  const suggestedFixes = cardItems(analysis.suggested_fixes) as SuggestedFix[]
  const priorityActions = cardItems(analysis.priority_actions) as PriorityAction[]

  return (
    <>
      {checkoutSuccess ? (
        <div className="px-5 pt-5 md:px-6">
          <Alert className="border-[#1A3C2A]/25 bg-[#E8F0EB] text-[#1A3C2A]">
            <AlertDescription>
              Welcome to your full analysis. Everything below is now unlocked.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <DeckAnalysisSlideshow
        analysisId={id}
        canGenerateTeaser={canGenerateTeaser(plan)}
        score={analysis.overall_score as number | null}
        summary={analysis.summary as string | null}
        investorReadiness={analysis.investor_readiness as string | null}
        categories={categories}
        strengths={stringArray(analysis.strengths)}
        weaknesses={stringArray(analysis.weaknesses)}
        missingSections={stringArray(analysis.missing_sections)}
        fundraisingRisks={stringArray(analysis.fundraising_risks)}
        suggestedFixes={suggestedFixes}
        priorityActions={priorityActions}
      />
      <DeckInvestorMatchesSection deckAnalysisId={id} />
    </>
  )
}
