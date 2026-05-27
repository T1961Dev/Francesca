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
