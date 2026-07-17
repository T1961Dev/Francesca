import Link from "next/link"
import { redirect } from "next/navigation"

import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import {
  StartRaiseBriefForm,
  type RaiseBriefDeckOption,
  type RaiseBriefInvestorOption,
  type RaiseBriefModelOption,
} from "@/components/raise-brief/start-raise-brief-form"
import { Button } from "@/components/ui/button"
import { ScrollableListCard } from "@/components/ui/scrollable-list-card"
import { canGenerateRaiseBrief } from "@/lib/access"
import { requireAuth, getProfile } from "@/lib/auth"
import { listDeckAnalyses } from "@/lib/deck/queries.server"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import { createClient } from "@/lib/supabase/server"
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

export default async function RaiseBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; job?: string }>
}) {
  const user = await requireAuth()
  const profile = await getProfile()
  const plan = (profile?.plan as Plan | undefined) ?? "free"
  const query = await searchParams

  if (!canGenerateRaiseBrief(plan)) {
    redirect("/pricing")
  }

  const supabase = await createClient()
  const [analyses, { data: models }, { data: briefs }, { data: matchRows }] =
    await Promise.all([
      listDeckAnalyses(20),
      supabase
        .from("financial_models")
        .select("id, status, inputs, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("raise_briefs")
        .select("id, status, created_at, strategy, error")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("investor_matches")
        .select("job_id, matches, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ])

  const completedDecks = analyses.filter((row) => String(row.status) === "completed")
  const preferredDeckId =
    query.deck && completedDecks.some((row) => String(row.id) === query.deck)
      ? query.deck
      : null

  const decks: RaiseBriefDeckOption[] = [
    ...(preferredDeckId
      ? completedDecks.filter((row) => String(row.id) === preferredDeckId)
      : []),
    ...completedDecks.filter((row) => String(row.id) !== preferredDeckId),
  ].map((row) => ({
    id: String(row.id),
    label: deckLabel(row),
  }))

  const modelOptions: RaiseBriefModelOption[] = (models ?? [])
    .filter((row) => String(row.status) === "completed")
    .map((row) => {
      const inputs = (row.inputs as Record<string, unknown> | null) ?? {}
      const name = String(inputs.companyName ?? "Financial model")
      const created = row.created_at
        ? new Date(String(row.created_at)).toLocaleDateString("en-GB")
        : ""
      return {
        id: String(row.id),
        label: created ? `${name} · ${created}` : name,
      }
    })

  const investors: RaiseBriefInvestorOption[] = []
  for (const row of matchRows ?? []) {
    const matches = Array.isArray(row.matches)
      ? (row.matches as Record<string, unknown>[])
      : []
    matches.slice(0, 10).forEach((match, index) => {
      const key = String(match.id ?? match.email ?? `${match.investorName}-${index}`)
      investors.push({
        key,
        jobId: String(row.job_id),
        label: `${String(match.investorName ?? "Investor")} · ${String(match.firmName ?? "")}`,
      })
    })
  }

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            Raise Brief
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            A strategically written investor teaser designed to earn the
            conversation—without giving away your full pitch.
          </p>
        </div>

        <FeaturePhotoCard
          eyebrow="Outreach asset"
          title={
            <>
              One investment angle. One brief. One coordinated <FeatureEm>email.</FeatureEm>
            </>
          }
          description="Stage 1 chooses what to reveal and preserve. Stage 2 writes the Raise Brief and outreach from that strategy — never a deck summary."
        />

        <StartRaiseBriefForm
          decks={decks}
          models={modelOptions}
          investors={investors}
        />
      </div>

      <ScrollableListCard title="Saved versions" contentClassName="space-y-3">
        {(briefs ?? []).map((brief) => {
          const strategy = brief.strategy as { primary_investment_angle?: string } | null
          return (
            <div
              key={String(brief.id)}
              className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {strategy?.primary_investment_angle || "Raise Brief draft"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {String(brief.status)}
                  {brief.created_at
                    ? ` · ${new Date(String(brief.created_at)).toLocaleString("en-GB")}`
                    : ""}
                  {brief.error ? ` · ${String(brief.error)}` : ""}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/raise-brief/${brief.id}`}>Open</Link>
              </Button>
            </div>
          )
        })}
        {!briefs?.length ? (
          <p className="text-sm text-muted-foreground">No Raise Briefs yet.</p>
        ) : null}
      </ScrollableListCard>
    </main>
  )
}
