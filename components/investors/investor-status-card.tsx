import { RetryInvestorJobButton } from "@/components/investors/retry-investor-job-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function InvestorStatusCard({
  status,
  error,
  jobId,
}: {
  status: string
  error?: string | null
  jobId?: string
}) {
  const progress =
    status === "completed" ? 100 :
    status === "ranking" || status === "scoring" ? 85 :
    status === "linkedin_running" || status === "activity_signals" ? 65 :
    status === "enriching" || status === "discovery" ? 25 :
    status === "crunchbase_running" || status === "scraping" ? 45 :
    15

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Investor matching failed</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error ?? "Something went wrong."}</p>
          {jobId ? (
            <RetryInvestorJobButton jobId={jobId} variant="default" label="Retry pipeline" />
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "cancelled") {
    return (
      <Alert>
        <AlertTitle>Investor matching cancelled</AlertTitle>
        <AlertDescription>This run was cancelled and can be retried later.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor matching status: {status}</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} />
      </CardContent>
    </Card>
  )
}
