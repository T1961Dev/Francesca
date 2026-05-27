import "server-only"

import { startInvestorMatchingJob } from "@/lib/investors/pipeline"
import { createAdminClient } from "@/lib/supabase/admin"

/** Load job context and execute the full investor matching pipeline (admin client). */
export async function runInvestorMatchingJob(jobId: string) {
  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from("investor_matching_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  if (jobError) throw jobError

  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  const userId = String(job.user_id ?? "")

  const [{ data: profile }, { data: deckAnalysis, error: deckError }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin
      .from("deck_analyses")
      .select("*")
      .eq("id", deckAnalysisId)
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (deckError) throw deckError
  if (!deckAnalysis) {
    throw new Error("Deck analysis not found for this matching job")
  }

  await startInvestorMatchingJob({
    supabase: admin,
    jobId,
    profile: profile ?? {},
    deckAnalysis,
  })
}
