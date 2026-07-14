"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Plan } from "@/types/app"

export type DeckOption = {
  id: string
  label: string
  score: number | null
  jobStatus: string | null
}

export function InvestorMatchLauncher({
  plan,
  decks,
  matchesUsed,
  matchesLimit,
}: {
  plan: Plan
  decks: DeckOption[]
  matchesUsed: number
  matchesLimit: number
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(decks[0]?.id ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const canRun = plan === "pro" || plan === "lifetime"
  const atLimit = matchesUsed >= matchesLimit

  async function runMatching() {
    if (!selectedId || pending) return
    setPending(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/investors/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckAnalysisId: selectedId }),
      })
      const json = await response.json()

      if (!json.success) {
        setError(json.error ?? "Could not start investor matching")
        return
      }

      setMessage("Investor matching started. Track progress below.")
      router.push(`/dashboard/investor-matching/${json.data.jobId}`)
    } catch {
      setError("Could not start investor matching")
    } finally {
      setPending(false)
    }
  }

  if (!canRun) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run investor matching</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upgrade to Pro or Lifetime to rank investors and generate outreach emails from your deck
          analysis.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run investor matching</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a completed deck analysis, then start a matching run. Uses{" "}
          {matchesUsed}/{matchesLimit} matches this month. Partners must have validated emails.
        </p>

        {decks.length ? (
          <DeckSelectField
            decks={decks}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No completed deck analyses yet. Upload a deck in Pitch Deck first.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={runMatching}
            disabled={pending || !selectedId || atLimit || !decks.length}
          >
            {pending ? "Starting…" : "Start matching"}
          </Button>
          {atLimit ? (
            <p className="text-xs text-muted-foreground">Monthly match limit reached.</p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-[#1A3C2A]">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function DeckSelectField({
  decks,
  selectedId,
  onSelect,
}: {
  decks: DeckOption[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="deck-analysis">Deck analysis</Label>
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger id="deck-analysis">
          <SelectValue placeholder="Select a deck" />
        </SelectTrigger>
        <SelectContent>
          {decks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id}>
              {deck.label}
              {deck.score != null ? ` · ${deck.score}/100` : ""}
              {deck.jobStatus ? ` · ${deck.jobStatus}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
