import type { analyseDeckText } from "@/lib/openai/deck-analysis"

type DeckAnalysisResult = Awaited<ReturnType<typeof analyseDeckText>>

/** Build an in-memory deck_analyses row after insert (no SELECT RETURNING needed). */
export function buildDeckAnalysisRecord(input: {
  id: string
  userId: string
  deckUploadId: string
  analysis: DeckAnalysisResult
}) {
  const { id, userId, deckUploadId, analysis } = input

  return {
    id,
    user_id: userId,
    deck_upload_id: deckUploadId,
    overall_score: analysis.parsed.overallScore,
    summary: analysis.parsed.summary,
    category_scores: analysis.parsed.categoryScores,
    financial_signals: analysis.parsed.financialSignals,
    strengths: analysis.parsed.strengths,
    weaknesses: analysis.parsed.weaknesses,
    missing_sections: analysis.parsed.missingSections,
    investor_readiness: analysis.parsed.investorReadiness,
    suggested_fixes: analysis.parsed.suggestedFixes,
    priority_actions: analysis.parsed.priorityActions,
    fundraising_risks: analysis.parsed.fundraisingRisks,
    raw_openai_response: analysis.raw as unknown as Record<string, unknown>,
    status: "completed" as const,
  }
}

export function buildDeckAnalysisInsert(input: {
  id: string
  userId: string
  deckUploadId: string
  analysis: DeckAnalysisResult
}) {
  return buildDeckAnalysisRecord(input)
}
