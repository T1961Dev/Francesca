import { InvestorTable } from "@/components/investors/investor-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InvestorMatchesPanel({
  deckAnalysisId,
  jobId,
  matches,
  title = "Investor matches",
  description,
}: {
  deckAnalysisId?: string | null
  jobId?: string | null
  matches: Record<string, unknown>[]
  title?: string
  description?: string
}) {
  if (!matches.length) return null

  return (
    <Card className="flex min-h-[20rem] flex-col md:min-h-0 md:flex-1">
      <CardHeader className="shrink-0">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-6">
        <InvestorTable deckAnalysisId={deckAnalysisId} jobId={jobId} matches={matches} scrollable />
      </CardContent>
    </Card>
  )
}
