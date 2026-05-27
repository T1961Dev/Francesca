"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { CancelInvestorJobButton } from "@/components/investors/cancel-investor-job-button"
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
  const current = statusCopy[status] ?? { label: `Investor matching status: ${status}`, progress: 15 }

  useEffect(() => {
    if (status === "completed" || status === "failed" || status === "cancelled") return

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/investors/status/${runId}`, { cache: "no-store" })
      const json = await response.json().catch(() => null)
      const nextStatus = String(json?.data?.job?.status ?? status)
      setStatus(nextStatus)

      if (nextStatus === "completed" || nextStatus === "failed" || nextStatus === "cancelled") {
        router.refresh()
      }
    }, 3000)

    return () => window.clearInterval(interval)
  }, [router, runId, status])

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
