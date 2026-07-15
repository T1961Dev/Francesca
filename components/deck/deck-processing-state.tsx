"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LoaderCircleIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const REVIEW_STEPS = [
  "Reading your slides",
  "Understanding your business",
  "Evaluating your narrative",
  "Comparing against successful fundraising decks",
  "Preparing recommendations",
]

export function DeckProcessingState({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState("pending")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewTick, setReviewTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReviewTick((value) => Math.min(value + 1, REVIEW_STEPS.length))
    }, 1600)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (status === "completed" || status === "failed") return

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
        const response = await fetch(`/api/deck/status/${analysisId}`, { cache: "no-store" })
        const json = await response.json().catch(() => null)
        if (cancelled || !json?.success) {
          delay = Math.min(delay * 1.5, 15000)
          timeoutId = setTimeout(poll, delay)
          return
        }

        const nextStatus = String(json.data?.status ?? status)
        setStatus(nextStatus)

        if (nextStatus === "failed") {
          setErrorMessage(
            String(json.data?.error ?? "Something went wrong while reviewing your deck.")
          )
          return
        }

        if (nextStatus === "completed") {
          setReviewTick(REVIEW_STEPS.length)
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
  }, [analysisId, router, status])

  if (status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Deck review failed</AlertTitle>
        <AlertDescription>
          {errorMessage ?? "Something went wrong while reviewing your deck."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviewing your pitch deck…</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2.5">
          {REVIEW_STEPS.map((step, index) => {
            const done = index < reviewTick || status === "completed"
            const active = !done && index === Math.min(reviewTick, REVIEW_STEPS.length - 1)
            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-2.5 text-sm",
                  done || active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {done ? (
                  <CheckIcon className="size-4 shrink-0 text-primary" />
                ) : active ? (
                  <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border" />
                )}
                <span>
                  {done ? "✓ " : ""}
                  {step}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Average review time: under 2 minutes. Your deck remains private and is never shared.
        </p>
      </CardContent>
    </Card>
  )
}
