import Link from "next/link"

import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { CancelInvestorJobButton } from "@/components/investors/cancel-investor-job-button"
import {
  InvestorMatchLauncher,
  type DeckOption,
} from "@/components/investors/investor-match-launcher"
import { MatchProgress } from "@/components/investors/match-progress"
import { RetryInvestorJobButton } from "@/components/investors/retry-investor-job-button"
import { Button } from "@/components/ui/button"
import { ScrollableListCard } from "@/components/ui/scrollable-list-card"
import { getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { listDeckAnalyses } from "@/lib/deck/queries.server"
import { getPlan } from "@/lib/stripe/plans"
import { createClient } from "@/lib/supabase/server"
import { fetchUsageState } from "@/lib/usage/track"
import type { Plan } from "@/types/app"

function deckLabel(analysis: Record<string, unknown>) {
  const upload = Array.isArray(analysis.deck_uploads)
    ? analysis.deck_uploads[0]
    : analysis.deck_uploads
  const fileName =
    upload && typeof upload === "object" && "file_name" in upload
      ? String((upload as { file_name?: string }).file_name ?? "Pitch deck")
      : "Pitch deck"
  const created = analysis.created_at
    ? new Date(String(analysis.created_at)).toLocaleDateString("en-GB")
    : null
  return created ? `${fileName} · ${created}` : fileName
}

export default async function InvestorMatchingPage() {
  const user = await requireAuth()
  const plan = (await getUserPlan()) as Plan
  const usage = await fetchUsageState(user.id)
  const planMeta = getPlan(plan)
  const matchesLimit = planMeta?.limits.investorMatchRunsPerMonth ?? 0

  const supabase = await createClient()
  const [{ data: jobs }, analyses] = await Promise.all([
    supabase
      .from("investor_matching_jobs")
      .select("id, status, deck_analysis_id, limited_data, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    listDeckAnalyses(20),
  ])

  const deckLabelById = new Map(
    analyses.map((analysis) => [String(analysis.id), deckLabel(analysis)])
  )

  const completedDecks = analyses.filter((row) => String(row.status) === "completed")
  const jobByDeck = new Map<string, string>()
  for (const job of jobs ?? []) {
    const deckId = String(job.deck_analysis_id ?? "")
    if (deckId && !jobByDeck.has(deckId)) {
      jobByDeck.set(deckId, String(job.status))
    }
  }

  const deckOptions: DeckOption[] = completedDecks.map((analysis) => ({
    id: String(analysis.id),
    label: deckLabel(analysis),
    score:
      typeof analysis.overall_score === "number"
        ? analysis.overall_score
        : analysis.overall_score != null
          ? Number(analysis.overall_score)
          : null,
    jobStatus: jobByDeck.get(String(analysis.id)) ?? null,
  }))

  const terminalStatuses = ["completed", "failed", "cancelled"]
  const activeJob = jobs?.find((job) => !terminalStatuses.includes(String(job.status)))

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:p-6">
      <div className="shrink-0 space-y-4">
        <PageIntro />

        <InvestorMatchLauncher
          plan={plan}
          decks={deckOptions}
          matchesUsed={usage?.investorMatchRunsThisMonth ?? 0}
          matchesLimit={matchesLimit}
        />

        {activeJob ? (
          <MatchProgress runId={String(activeJob.id)} initialStatus={String(activeJob.status)} />
        ) : null}
      </div>

      <ScrollableListCard title="Recent jobs" contentClassName="space-y-3">
        {(jobs ?? []).map((job) => (
          <div
            key={String(job.id)}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {deckLabelById.get(String(job.deck_analysis_id ?? "")) ?? "Pitch deck"}
              </p>
              <p className="text-xs text-muted-foreground">
                {String(job.status)}
                {job.limited_data ? " · Limited data" : ""}
              </p>
            </div>
            <JobActions job={job} terminalStatuses={terminalStatuses} />
          </div>
        ))}
        {!jobs?.length ? <p className="text-sm text-muted-foreground">No jobs yet.</p> : null}
      </ScrollableListCard>
    </main>
  )
}

function PageIntro() {
  return (
    <>
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
          Investor Matching
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rank investors from a deck analysis, or let matching start automatically after upload on
          Pro and Lifetime. Searches active VC partners worldwide.
        </p>
      </div>
      <FeaturePhotoCard
        eyebrow="Outreach"
        title={
          <>
            Match the right investor before you <FeatureEm>pitch.</FeatureEm>
          </>
        }
        description="Rank relevant leads, explain fit, and shape the outreach angle from your deck analysis."
        cta={{ label: "Analyse deck first", href: "/dashboard/deck-analyser" }}
      />
    </>
  )
}

function JobActions({
  job,
  terminalStatuses,
}: {
  job: { id: unknown; status: unknown }
  terminalStatuses: string[]
}) {
  return (
    <div className="flex items-center gap-2">
      {String(job.status) === "failed" ? (
        <RetryInvestorJobButton jobId={String(job.id)} />
      ) : null}
      {!terminalStatuses.includes(String(job.status)) ? (
        <CancelInvestorJobButton jobId={String(job.id)} />
      ) : null}
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/investor-matching/${job.id}`}>Open</Link>
      </Button>
    </div>
  )
}
