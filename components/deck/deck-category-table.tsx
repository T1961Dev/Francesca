import { enrichCategoryScoresWithWeights } from "@/lib/deck/weighted-scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DeckCategoryTable({
  categories,
  className,
}: {
  categories: { category: string; score: number; feedback: string }[]
  className?: string
}) {
  const enriched = enrichCategoryScoresWithWeights(categories)

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Category breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">
          Weighted investor dimensions — overall score is computed from these weights.
        </p>
      </CardHeader>
      <CardContent className="min-h-0 overflow-hidden pb-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:gap-2 lg:overflow-x-auto lg:pb-1">
          {enriched.map((item) => (
            <div
              key={item.category}
              className="min-w-0 rounded-lg bg-muted/35 p-3 ring-1 ring-border/55 lg:min-w-[14rem] lg:shrink-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{item.category}</p>
                <div className="shrink-0 text-right">
                  <span className="font-heading text-lg leading-none">
                    {item.score}
                  </span>
                  {item.weight != null ? (
                    <p className="text-[0.65rem] text-muted-foreground">{item.weight}% wt</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-sm bg-secondary">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground lg:line-clamp-3">
                {item.feedback}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
