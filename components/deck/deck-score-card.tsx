import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DeckScoreCard({
  score,
  summary,
}: {
  score: number | null
  summary: string | null
}) {
  const value = score ?? 0
  const label =
    value >= 80 ? "Strong" : value >= 60 ? "Needs refinement" : "Not ready yet"

  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle>Investor-readiness score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-3 rounded-lg bg-card p-3 ring-1 ring-border/55">
          <div>
            <p className="font-heading text-4xl leading-none">
              {score ?? "-"}
              <span className="ml-1 font-sans text-sm text-muted-foreground">
                /100
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {label}
            </p>
          </div>
          <div className="mb-1 h-1.5 w-20 overflow-hidden rounded-sm bg-secondary">
            <div
              className="h-full bg-foreground"
              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
          </div>
        </div>
        <p className="h-12 overflow-hidden text-xs leading-relaxed text-muted-foreground">
          {summary || "No summary returned."}
        </p>
      </CardContent>
    </Card>
  )
}
