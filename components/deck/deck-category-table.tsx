import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DeckCategoryTable({
  categories,
  className,
}: {
  categories: { category: string; score: number; feedback: string }[]
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Category breakdown</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 overflow-hidden pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <div
              key={item.category}
              className="min-w-[14rem] rounded-lg bg-muted/35 p-3 ring-1 ring-border/55"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{item.category}</p>
                <span className="font-heading text-lg leading-none">
                  {item.score}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-sm bg-secondary">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                />
              </div>
              <p className="mt-2 h-11 overflow-hidden text-xs leading-relaxed text-muted-foreground">
                {item.feedback}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
