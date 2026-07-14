import Link from "next/link"

import { FeaturePhotoCard } from "@/components/feature-photo-card"
import { Button } from "@/components/ui/button"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

export function DeckImproveFirstView({
  analysisId,
  score,
  challenge,
}: {
  analysisId: string
  score: number | null
  challenge: string
}) {
  const scoreLabel = score != null && Number.isFinite(score) ? Math.round(score) : "—"

  return (
    <main className={dashboardPageMainClass}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <FeaturePhotoCard
          eyebrow="Pitch deck review"
          title={`Your score is ${scoreLabel}/100.`}
          description={
            <>
              The first thing investors will challenge:{" "}
              <span className="font-medium text-[#F7F0E6]">{challenge}</span>
              <br />
              Let&apos;s improve that first.
            </>
          }
          className="min-h-0"
        />

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/dashboard/deck-analyser/${analysisId}?view=full`}>
              Improve this section
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/deck-analyser/${analysisId}?view=full`}>
              View full review
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export function pickFirstInvestorChallenge(input: {
  priorityActions?: Array<{ action?: string; reason?: string; priority?: string }>
  weaknesses?: string[]
  categories?: Array<{ category: string; score: number; feedback: string }>
}): string {
  const highPriority = input.priorityActions?.find(
    (item) => String(item.priority ?? "").toLowerCase() === "high"
  )
  if (highPriority?.action?.trim()) {
    return highPriority.action.trim()
  }

  const anyPriority = input.priorityActions?.find((item) => item.action?.trim())
  if (anyPriority?.action?.trim()) {
    return anyPriority.action.trim()
  }

  const weakest = [...(input.categories ?? [])]
    .filter((item) => item?.category)
    .sort((a, b) => a.score - b.score)[0]
  if (weakest?.category) {
    return weakest.category
  }

  const weakness = input.weaknesses?.find((item) => item?.trim())
  if (weakness) return weakness.trim()

  return "Revenue traction"
}
