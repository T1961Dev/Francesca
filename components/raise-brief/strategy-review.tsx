"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RaiseBriefStrategy } from "@/lib/raise-brief/schemas"
import { hasUnresolvedCriticalFacts } from "@/lib/raise-brief/schemas"

export function StrategyReview({
  briefId,
  initialStrategy,
}: {
  briefId: string
  initialStrategy: RaiseBriefStrategy
}) {
  const router = useRouter()
  const [strategy, setStrategy] = useState(initialStrategy)
  const [busy, setBusy] = useState<"save" | "produce" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unresolved = hasUnresolvedCriticalFacts(strategy)

  function updateConfirmation(
    key: string,
    patch: Partial<(typeof strategy.facts_requiring_founder_confirmation)[number]>
  ) {
    setStrategy((prev) => ({
      ...prev,
      facts_requiring_founder_confirmation: prev.facts_requiring_founder_confirmation.map(
        (fact) => (fact.key === key ? { ...fact, ...patch } : fact)
      ),
    }))
  }

  async function saveStrategy() {
    setBusy("save")
    setError(null)
    try {
      const response = await fetch(`/api/raise-brief/${briefId}/strategy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_investment_angle: strategy.primary_investment_angle,
          why_this_angle_wins: strategy.why_this_angle_wins,
          recommended_outreach_angle: strategy.recommended_outreach_angle,
          facts_requiring_founder_confirmation:
            strategy.facts_requiring_founder_confirmation,
          disclosure_strategy: strategy.disclosure_strategy,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not save strategy.")
        setBusy(null)
        return false
      }
      setStrategy(json.data.strategy)
      setBusy(null)
      return true
    } catch {
      setError("Network error while saving.")
      setBusy(null)
      return false
    }
  }

  async function produce() {
    const saved = await saveStrategy()
    if (!saved) return
    if (hasUnresolvedCriticalFacts(strategy)) {
      setError("Resolve all critical facts before producing the Raise Brief.")
      return
    }
    setBusy("produce")
    try {
      const response = await fetch(`/api/raise-brief/${briefId}/produce`, {
        method: "POST",
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Production failed.")
        setBusy(null)
        return
      }
      router.refresh()
    } catch {
      setError("Network error during production.")
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Primary investment angle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Angle</Label>
            <Input
              value={strategy.primary_investment_angle}
              onChange={(event) =>
                setStrategy((prev) => ({
                  ...prev,
                  primary_investment_angle: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Why this angle wins</Label>
            <Textarea
              value={strategy.why_this_angle_wins}
              onChange={(event) =>
                setStrategy((prev) => ({
                  ...prev,
                  why_this_angle_wins: event.target.value,
                }))
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Recommended outreach angle</Label>
            <Textarea
              value={strategy.recommended_outreach_angle}
              onChange={(event) =>
                setStrategy((prev) => ({
                  ...prev,
                  recommended_outreach_angle: event.target.value,
                }))
              }
              rows={2}
            />
          </div>
          {strategy.investor_fit_summary ? (
            <p className="text-sm text-muted-foreground">{strategy.investor_fit_summary}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <DisclosureCard
          title="Reveal"
          items={strategy.disclosure_strategy.reveal.map((row) => row.item)}
        />
        <DisclosureCard
          title="Reveal partially"
          items={strategy.disclosure_strategy.reveal_partially.map((row) => row.item)}
        />
        <DisclosureCard
          title="Preserve for the meeting"
          items={strategy.disclosure_strategy.preserve_for_meeting.map((row) => row.item)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facts requiring confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!strategy.facts_requiring_founder_confirmation.length ? (
            <p className="text-sm text-muted-foreground">
              No conflicting or unconfirmed facts flagged. You can proceed to production.
            </p>
          ) : (
            strategy.facts_requiring_founder_confirmation.map((fact) => (
              <div
                key={fact.key}
                className="space-y-2 rounded-lg border border-border/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{fact.label}</p>
                  <Badge variant="outline">{fact.status}</Badge>
                  {fact.critical ? <Badge variant="destructive">Critical</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{fact.value}</p>
                {fact.founderDecision === "edited" ? (
                  <Input
                    value={fact.editedValue ?? ""}
                    onChange={(event) =>
                      updateConfirmation(fact.key, { editedValue: event.target.value })
                    }
                    placeholder="Edited value to use"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={fact.founderDecision === "approved" ? "default" : "outline"}
                    onClick={() =>
                      updateConfirmation(fact.key, { founderDecision: "approved" })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant={fact.founderDecision === "edited" ? "default" : "outline"}
                    onClick={() =>
                      updateConfirmation(fact.key, {
                        founderDecision: "edited",
                        editedValue: fact.editedValue ?? fact.value,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={fact.founderDecision === "do_not_use" ? "destructive" : "outline"}
                    onClick={() =>
                      updateConfirmation(fact.key, { founderDecision: "do_not_use" })
                    }
                  >
                    Do not use
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {unresolved ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Critical facts still need a decision before Stage 2 can run.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={saveStrategy} disabled={Boolean(busy)}>
          {busy === "save" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save strategy"
          )}
        </Button>
        <Button onClick={produce} disabled={Boolean(busy) || unresolved}>
          {busy === "produce" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Producing Raise Brief…
            </>
          ) : (
            "Approve & run Stage 2: Production"
          )}
        </Button>
      </div>
    </div>
  )
}

function DisclosureCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
