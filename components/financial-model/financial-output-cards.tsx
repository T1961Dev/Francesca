import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { stringArray } from "@/lib/financial/format"

function ProseBlock({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-muted/35 p-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-lg bg-muted/35 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

export function FinancialOutputCards({
  narrative,
  summary,
  risks,
  assumptions,
}: {
  narrative: string | null
  summary: string | null
  risks: unknown
  assumptions: unknown
}) {
  const riskItems = stringArray(risks)
  const assumptionItems = stringArray(assumptions)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="min-h-0">
        <CardHeader className="pb-2">
          <CardTitle>Funding narrative</CardTitle>
        </CardHeader>
        <CardContent>
          <ProseBlock>{narrative || "No narrative returned."}</ProseBlock>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader className="pb-2">
          <CardTitle>Investor summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ProseBlock>{summary || "No summary returned."}</ProseBlock>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader className="pb-2">
          <CardTitle>Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={riskItems} emptyLabel="No risks returned." />
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardHeader className="pb-2">
          <CardTitle>Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <BulletList items={assumptionItems} emptyLabel="No assumptions returned." />
        </CardContent>
      </Card>
    </div>
  )
}
