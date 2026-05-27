import { InvestorTable } from "@/components/investors/investor-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InvestorMatchesPanel({
  jobId,
  matches,
  title = "Investor matches",
  description,
}: {
  jobId?: string | null
  matches: Record<string, unknown>[]
  title?: string
  description?: string
}) {
  if (!matches.length) return null

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6">
        <InvestorTable jobId={jobId} matches={matches} scrollable />
      </CardContent>
    </Card>
  )
}
