import "server-only"

import { createClient } from "@/lib/supabase/server"

type DeckAnalysisRow = Record<string, unknown>

export async function fetchDeckAnalysisById(
  analysisId: string
): Promise<DeckAnalysisRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fetch_deck_analysis_row", {
    p_analysis_id: analysisId,
  })

  if (error) throw error
  if (!data || typeof data !== "object") return null
  return data as DeckAnalysisRow
}

export async function listDeckAnalyses(limit = 8): Promise<DeckAnalysisRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("list_deck_analysis_rows", {
    p_limit: limit,
  })

  if (error) throw error
  return Array.isArray(data) ? (data as DeckAnalysisRow[]) : []
}

/** Latest completed deck analysis with financial signals for model prefill (paid plans). */
export async function fetchLatestDeckFinancialPrefill(): Promise<{
  summary: string | null
  financialSignals: Record<string, unknown> | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fetch_latest_deck_financial_prefill")

  if (error) throw error
  if (!data || typeof data !== "object") return null

  const row = data as {
    summary?: unknown
    financial_signals?: unknown
  }

  return {
    summary: row.summary ? String(row.summary) : null,
    financialSignals:
      row.financial_signals && typeof row.financial_signals === "object"
        ? (row.financial_signals as Record<string, unknown>)
        : null,
  }
}
