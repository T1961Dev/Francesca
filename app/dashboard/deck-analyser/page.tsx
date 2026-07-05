import Link from "next/link"

import { DeckUploadCard } from "@/components/deck/deck-upload-card"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollableListCard } from "@/components/ui/scrollable-list-card"
import { canViewFullDeckAnalysis, getUserPlan } from "@/lib/access"
import { detectCurrencyFromRequest } from "@/lib/billing/currency.server"
import { FREE_DECK_PREVIEW_TAGLINE } from "@/lib/deck/preview"
import { listDeckAnalyses } from "@/lib/deck/queries.server"
import { requireAuth } from "@/lib/auth"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import { plans } from "@/lib/stripe/plans"
import { fetchUsageState } from "@/lib/usage/track"

export default async function DeckAnalyserPage() {
  const user = await requireAuth()
  const [plan, usage, currency, analyses] = await Promise.all([
    getUserPlan(),
    fetchUsageState(user.id),
    detectCurrencyFromRequest(),
    listDeckAnalyses(8),
  ])
  const showFullPreviews = canViewFullDeckAnalysis(plan)

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            Deck Analyser
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your pitch deck to generate an investor-readiness report.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <DeckUploadCard
            plan={plan}
            totalDeckUploadsEver={usage?.totalDeckUploadsEver ?? 0}
            plans={plans}
            currency={currency}
          />
          <FeaturePhotoCard
            eyebrow="Review"
            title={
              <>
                Find what investors will <FeatureEm>question.</FeatureEm>
              </>
            }
            description="A focused pass over narrative, traction, market, raise logic, and the missing proof points that slow a round down."
          />
        </div>
      </div>

      <ScrollableListCard
        title="Analysis history"
        description="Reopen previous deck reports and export them again any time."
        headerAddon={<Badge variant="neutral">{analyses.length} recent</Badge>}
      >
        {analyses.length ? (
          <div className="grid gap-2">
            {analyses.map((analysis) => {
              const upload = Array.isArray(analysis.deck_uploads)
                ? analysis.deck_uploads[0]
                : analysis.deck_uploads
              const fileName =
                upload && typeof upload === "object" && "file_name" in upload
                  ? String((upload as { file_name?: string }).file_name ?? "Pitch deck")
                  : "Pitch deck"

              return (
                <Link
                  key={String(analysis.id)}
                  href={`/dashboard/deck-analyser/${String(analysis.id)}`}
                  className="group grid gap-3 rounded-lg bg-muted/30 p-3 ring-1 ring-border/55 transition-colors hover:bg-muted/45 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{fileName}</p>
                      <Badge variant={analysis.status === "completed" ? "success" : "neutral"}>
                        {String(analysis.status ?? "pending")}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {showFullPreviews
                        ? String(analysis.summary ?? "Report is still being prepared.")
                        : FREE_DECK_PREVIEW_TAGLINE}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <p className="font-heading text-2xl leading-none">
                      {analysis.overall_score != null ? String(analysis.overall_score) : "-"}
                      <span className="ml-1 font-sans text-xs text-muted-foreground">
                        /100
                      </span>
                    </p>
                    <span className="inline-flex h-7 items-center rounded-md border border-border/80 bg-card px-3 text-[0.8rem] font-medium">
                      Open
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground ring-1 ring-border/55">
            No deck analyses yet. Upload your first PDF or PPTX above.
          </div>
        )}
      </ScrollableListCard>
    </main>
  )
}
