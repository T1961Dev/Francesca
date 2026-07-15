import { notFound } from "next/navigation"

import { InvestorExportButtons } from "@/components/investors/investor-export-buttons"
import { InvestorLockedState } from "@/components/investors/investor-locked-state"
import { InvestorMatchesPanel } from "@/components/investors/investor-matches-panel"
import { InvestorStatusCard } from "@/components/investors/investor-status-card"
import { MatchProgress } from "@/components/investors/match-progress"
import {
  canViewInvestorOutreachTemplates,
  limitInvestorMatchesForPlan,
} from "@/lib/access"
import { getProfile } from "@/lib/auth"
import { fetchInvestorMatchesForJob } from "@/lib/investors/queries.server"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import { createClient } from "@/lib/supabase/server"
import type { Plan } from "@/types/app"

export default async function InvestorMatchingResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profile, supabase] = await Promise.all([
    getProfile(),
    createClient(),
  ])
  const plan = (profile?.plan as Plan | undefined) ?? "free"

  const { data: job } = await supabase
    .from("investor_matching_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!job) notFound()

  const deckAnalysisId = String(job.deck_analysis_id ?? "")
  let deckLabel = "Pitch deck"

  const [deckResult, matchResult] = await Promise.all([
    deckAnalysisId
      ? supabase
          .from("deck_analyses")
          .select("deck_uploads(file_name)")
          .eq("id", deckAnalysisId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchInvestorMatchesForJob(id),
  ])

  if (deckResult.data) {
    const upload = Array.isArray(deckResult.data.deck_uploads)
      ? deckResult.data.deck_uploads[0]
      : deckResult.data.deck_uploads
    const fileName =
      upload && typeof upload === "object" && "file_name" in upload
        ? String((upload as { file_name?: string }).file_name ?? "")
        : ""
    if (fileName) deckLabel = fileName
  }

  const matches = limitInvestorMatchesForPlan(matchResult.matches, plan)
  const canExport = canViewInvestorOutreachTemplates(plan)
  const jobStatus = String(job.status)

  return (
    <main className={dashboardPageMainClass}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            Investor matches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved results for {deckLabel}. Ranked investor fit and outreach angles.
          </p>
        </div>
        {canExport && jobStatus === "completed" ? (
          <InvestorExportButtons jobId={id} />
        ) : null}
      </div>

      <div className="shrink-0 space-y-4">
        <InvestorStatusCard
          jobId={id}
          status={jobStatus}
          error={job.error as string | null}
        />
        {!["completed", "failed", "cancelled"].includes(jobStatus) ? (
          <MatchProgress runId={id} initialStatus={jobStatus} />
        ) : null}
      </div>
      {matches.length ? (
        <div className="flex min-h-[20rem] min-w-0 flex-col md:min-h-[28rem] md:flex-1">
          <InvestorMatchesPanel
            deckAnalysisId={deckAnalysisId || null}
            jobId={id}
            matches={matches}
            title="Saved investor matches"
            description={`Ranked leads for ${deckLabel}. Click any row to view the investor profile and outreach template.`}
          />
        </div>
      ) : null}
      {!canExport ? <InvestorLockedState /> : null}
    </main>
  )
}
