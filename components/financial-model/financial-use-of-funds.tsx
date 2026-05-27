import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, type UseOfFundsItem } from "@/lib/financial/format"

export function FinancialUseOfFunds({ items }: { items: UseOfFundsItem[] }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Use of funds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No allocation returned.</p>
        ) : (
          items.map((item) => {
            const share = total > 0 ? Math.round((item.amount / total) * 100) : 0
            return (
              <div
                key={item.category}
                className="rounded-xl bg-muted/35 p-4 ring-1 ring-border/55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.category}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.rationale || "No rationale provided."}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-heading text-xl leading-none">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{share}%</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-[#070605] to-[#DF9C4E] transition-all"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
