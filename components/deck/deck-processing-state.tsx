"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

const statusCopy: Record<string, { label: string; progress: number }> = {
  pending: { label: "Analysing investor-readiness with AI...", progress: 45 },
  analysing: { label: "Scoring categories and drafting recommendations...", progress: 72 },
  completed: { label: "Analysis ready.", progress: 100 },
  failed: { label: "Deck analysis failed.", progress: 100 },
}

export function DeckProcessingState({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState("pending")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const current = statusCopy[status] ?? statusCopy.pending

  useEffect(() => {
    if (status === "completed" || status === "failed") return

    let cancelled = false

    async function poll() {
      const response = await fetch(`/api/deck/status/${analysisId}`, { cache: "no-store" })
      const json = await response.json().catch(() => null)
      if (cancelled || !json?.success) return

      const nextStatus = String(json.data?.status ?? status)
      setStatus(nextStatus)

      if (nextStatus === "failed") {
        setErrorMessage(
          String(json.data?.error ?? "Something went wrong while analysing your deck.")
        )
        return
      }

      if (nextStatus === "completed") {
        const matching = json.data?.investorMatching as
          | { started: true; jobId: string }
          | { started: false }
          | undefined

        if (matching?.started) {
          router.replace(`/dashboard/investor-matching/${matching.jobId}`)
          return
        }

        router.refresh()
      }
    }

    void poll()
    const interval = window.setInterval(() => {
      void poll()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [analysisId, router, status])

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Deck analysis failed</AlertTitle>
        <AlertDescription>
          {errorMessage ?? "Something went wrong while analysing your deck."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing deck</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={current.progress} />
        <p className="text-sm text-muted-foreground">{current.label}</p>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}
