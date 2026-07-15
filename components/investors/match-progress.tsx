"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { CancelInvestorJobButton } from "@/components/investors/cancel-investor-job-button"
import { RetryInvestorJobButton } from "@/components/investors/retry-investor-job-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const statusCopy: Record<string, { label: string; progress: number }> = {
  pending: { label: "Starting up...", progress: 10 },
  discovery: { label: "Finding VC partners with validated emails...", progress: 25 },
  crunchbase_running: { label: "Enriching firm deal history...", progress: 45 },
  enriching: { label: "Finding VC partners with validated emails...", progress: 25 },
  linkedin_running: { label: "Reading partner signals on LinkedIn...", progress: 65 },
  ranking: { label: "Scoring and ranking your top matches...", progress: 85 },
  completed: { label: "Matches ready.", progress: 100 },
  failed: { label: "Investor matching failed.", progress: 100 },
  cancelled: { label: "Investor matching cancelled.", progress: 100 },
}

export function MatchProgress({
  runId,
  initialStatus,
}: {
  runId: string
  initialStatus: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const current = statusCopy[status] ?? { label: `Investor matching status: ${status}`, progress: 15 }

  useEffect(() => {
    if (status === "completed" || status === "failed" || status === "cancelled") return

    let refreshed = false
    let cancelled = false
    let delay = 3000
    let timeoutId: ReturnType<typeof setTimeout>

    async function poll() {
      if (cancelled) return
      if (document.hidden) {
        timeoutId = setTimeout(poll, delay)
        return
      }

      try {
        const response = await fetch(`/api/investors/status/${runId}`, { cache: "no-store" })
        const json = await response.json().catch(() => null)
        const job = json?.data?.job as { status?: string; error?: string | null } | undefined
        const nextStatus = String(job?.status ?? status)
        setStatus(nextStatus)

        if (nextStatus === "failed" && job?.error) {
          setErrorMessage(String(job.error))
        }

        if (
          !refreshed &&
          (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled")
        ) {
          refreshed = true
          router.refresh()
          return
        }
      } catch {
        delay = Math.min(delay * 1.5, 15000)
      }

      timeoutId = setTimeout(poll, delay)
    }

    void poll()

    function onVisibilityChange() {
      if (!document.hidden) {
        delay = 3000
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router, runId, status])

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Investor matching failed</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{errorMessage ?? "Something went wrong while finding investors."}</p>
          <RetryInvestorJobButton jobId={runId} variant="default" label="Try again" />
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "cancelled") {
    return (
      <Alert>
        <AlertTitle>Investor matching cancelled</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>This run was cancelled. You can start a new matching run when ready.</p>
          <RetryInvestorJobButton jobId={runId} variant="outline" label="Retry" />
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor matching in progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={current.progress} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{current.label}</p>
          {!["completed", "failed", "cancelled"].includes(status) ? (
            <CancelInvestorJobButton jobId={runId} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
