"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LockIcon } from "lucide-react"

import { DeckLockedSection } from "@/components/deck/deck-locked-section"
import { PaywallModal } from "@/components/billing/paywall-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FREE_DECK_PREVIEW_TAGLINE } from "@/lib/deck/preview"
import type { Currency, StripePlan } from "@/types/billing"

type LockedView = {
  analysisId: string
  score: number | null
  /** Dimension names only (no scores or feedback). */
  dimensionNames: string[]
  plans: StripePlan[]
  currency: Currency
}

const DEFAULT_DIMENSIONS = [
  "Problem clarity",
  "Solution strength",
  "Market size",
  "Business model",
  "Traction",
  "Team",
  "Financial ask",
  "Narrative",
]

export function DeckLockedView({
  analysisId,
  score,
  dimensionNames,
  plans,
  currency,
}: LockedView) {
  const [paywallOpen, setPaywallOpen] = useState(false)
  const scheduled = useRef(false)
  const names = dimensionNames.length ? dimensionNames : DEFAULT_DIMENSIONS

  // Schedule the re-engagement email shortly after the score is rendered.
  useEffect(() => {
    if (scheduled.current) return
    scheduled.current = true
    fetch("/api/paywall/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, score }),
    }).catch(() => undefined)
  }, [analysisId, score])

  const onDismiss = useCallback(() => {
    fetch("/api/paywall/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, score }),
    }).catch(() => undefined)
  }, [analysisId, score])

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">
                {score ?? "—"} <span className="text-base font-normal text-muted-foreground">/100</span>
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {FREE_DECK_PREVIEW_TAGLINE}
              </p>
            </div>
            <Badge variant="accent">Free preview</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Dimensions analysed
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {names.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-md border border-border/55 bg-card px-3 py-2 text-sm"
              >
                <span>{name}</span>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-10 rounded-md bg-muted/80"
                    aria-hidden
                  />
                  <LockIcon className="size-3.5 text-muted-foreground" aria-label="Locked" />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockIcon className="size-3.5" />
            Upgrade to see investor feedback for every dimension.
          </p>
        </CardContent>
      </Card>

      <DeckLockedSection />

      <div className="flex justify-center">
        <Button size="lg" onClick={() => setPaywallOpen(true)}>
          Upgrade now
        </Button>
      </div>

      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        plans={plans}
        currency={currency}
        returnPath={`/dashboard/deck-analyser/${analysisId}`}
        onDismiss={onDismiss}
      />
    </main>
  )
}
