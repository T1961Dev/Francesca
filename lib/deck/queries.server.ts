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

/** Latest completed deck analysis with financial signals for model prefill. */
export async function fetchLatestDeckFinancialPrefill(): Promise<{
  summary: string | null
  financialSignals: Record<string, unknown> | null
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("deck_analyses")
    .select("summary, financial_signals")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    summary: data.summary ? String(data.summary) : null,
    financialSignals:
      data.financial_signals && typeof data.financial_signals === "object"
        ? (data.financial_signals as Record<string, unknown>)
        : null,
  }
}
