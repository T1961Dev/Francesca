import Link from "next/link"

import { InvestorMatchesPanel } from "@/components/investors/investor-matches-panel"
import { MatchProgress } from "@/components/investors/match-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  canUseInvestorMatching,
  canViewInvestorOutreachTemplates,
  getUserPlan,
  limitInvestorMatchesForPlan,
} from "@/lib/access"
import { fetchLatestInvestorMatchesForDeck } from "@/lib/investors/queries.server"

export async function DeckInvestorMatchesSection({
  deckAnalysisId,
}: {
  deckAnalysisId: string
}) {
  const plan = await getUserPlan()
  if (!canUseInvestorMatching(plan)) return null

  const bundle = await fetchLatestInvestorMatchesForDeck(deckAnalysisId)
  if (!bundle) return null

  const matches = limitInvestorMatchesForPlan(bundle.matches, plan)
  const canView = canViewInvestorOutreachTemplates(plan)
  const isRunning = !["completed", "failed", "cancelled"].includes(bundle.jobStatus)

  if (!canView && !isRunning) return null

  return (
    <section className="px-5 pb-5 md:px-6 md:pb-6">
      <div className="space-y-4">
        {isRunning ? (
          <Card>
            <CardHeader>
              <CardTitle>Investor matching</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MatchProgress runId={bundle.jobId} initialStatus={bundle.jobStatus} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/investor-matching/${bundle.jobId}`}>View job</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {matches.length ? (
          <InvestorMatchesPanel
            jobId={bundle.jobId}
            matches={matches}
            title="Investor matches for this deck"
            description="Saved ranked leads for this pitch deck. Click a row to open the investor profile and outreach template."
          />
        ) : null}

        {!isRunning && !matches.length && bundle.jobStatus === "completed" ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Investor matching completed with no saved matches for this deck.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
