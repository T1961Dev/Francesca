"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type RaiseBriefDeckOption = {
  id: string
  label: string
}

export type RaiseBriefModelOption = {
  id: string
  label: string
}

export type RaiseBriefInvestorOption = {
  key: string
  jobId: string
  label: string
}

export function StartRaiseBriefForm({
  decks,
  models,
  investors,
}: {
  decks: RaiseBriefDeckOption[]
  models: RaiseBriefModelOption[]
  investors: RaiseBriefInvestorOption[]
}) {
  const router = useRouter()
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "")
  const [modelId, setModelId] = useState(models[0]?.id ?? "none")
  const [investorKey, setInvestorKey] = useState("none")
  const [founderNotes, setFounderNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    if (!deckId || busy) return
    setBusy(true)
    setError(null)

    const investor = investors.find((row) => row.key === investorKey)

    try {
      const response = await fetch("/api/raise-brief/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckAnalysisId: deckId,
          financialModelId: modelId === "none" ? null : modelId,
          investorMatchJobId: investor?.jobId ?? null,
          investorKey: investor?.key ?? null,
          founderNotes: founderNotes.trim() || null,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not start strategy.")
        setBusy(false)
        return
      }
      router.push(`/dashboard/raise-brief/${json.data.id}`)
    } catch {
      setError("Network error. Please try again.")
      setBusy(false)
    }
  }

  if (!decks.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <p className="text-sm text-muted-foreground">
          Complete a pitch deck analysis first. The Raise Brief needs your latest
          deck review (and preferably a financial model) before it can choose an
          investment angle.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <a href="/dashboard/deck-analyser">Analyse a deck</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div className="space-y-2">
        <Label>Pitch deck analysis</Label>
        <Select value={deckId} onValueChange={setDeckId}>
          <SelectTrigger>
            <SelectValue placeholder="Select deck analysis" />
          </SelectTrigger>
          <SelectContent>
            {decks.map((deck) => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Financial model (optional)</Label>
        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No financial model</SelectItem>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target investor (optional)</Label>
        <Select value={investorKey} onValueChange={setInvestorKey}>
          <SelectTrigger>
            <SelectValue placeholder="General Raise Brief" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">General Raise Brief (no specific investor)</SelectItem>
            {investors.map((investor) => (
              <SelectItem key={investor.key} value={investor.key}>
                {investor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Founder notes (optional)</Label>
        <Textarea
          value={founderNotes}
          onChange={(event) => setFounderNotes(event.target.value)}
          placeholder="Anything investors should know that is not in the deck or model yet."
          rows={3}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button onClick={start} disabled={busy || !deckId} className="w-full sm:w-auto">
        {busy ? (
          <>
            <LoaderCircleIcon className="size-4 animate-spin" />
            Running strategy…
          </>
        ) : (
          "Run Stage 1: Strategy"
        )}
      </Button>
    </div>
  )
}
