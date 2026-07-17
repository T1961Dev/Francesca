"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RaiseBriefProduction } from "@/lib/raise-brief/schemas"

export function RaiseBriefEditor({
  briefId,
  initialProduction,
}: {
  briefId: string
  initialProduction: RaiseBriefProduction
}) {
  const router = useRouter()
  const [production, setProduction] = useState(initialProduction)
  const [tab, setTab] = useState<"brief" | "email" | "deck">("brief")
  const [busy, setBusy] = useState<"save" | "regen" | "pdf" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const brief = production.raise_brief
  const email = production.email

  async function save() {
    setBusy("save")
    setError(null)
    try {
      const response = await fetch(`/api/raise-brief/${briefId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raise_brief: production.raise_brief,
          email: production.email,
          deck_request_response: production.deck_request_response,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not save.")
        setBusy(null)
        return
      }
      setProduction(json.data.production)
      setBusy(null)
    } catch {
      setError("Network error while saving.")
      setBusy(null)
    }
  }

  async function regenerate() {
    setBusy("regen")
    setError(null)
    try {
      const response = await fetch(`/api/raise-brief/${briefId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "production" }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Regeneration failed.")
        setBusy(null)
        return
      }
      setProduction(json.data.production)
      setBusy(null)
      router.refresh()
    } catch {
      setError("Network error during regeneration.")
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy("pdf")
    setError(null)
    try {
      await save()
      const response = await fetch(`/api/raise-brief/${briefId}/export-pdf`, {
        method: "POST",
      })
      const json = await response.json()
      if (!json.success || !json.data?.url) {
        setError(json.error ?? "PDF export failed.")
        setBusy(null)
        return
      }
      window.open(json.data.url, "_blank", "noopener,noreferrer")
      setBusy(null)
    } catch {
      setError("Network error during PDF export.")
      setBusy(null)
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      setError("Could not copy to clipboard.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["brief", "Raise Brief"],
            ["email", "Outreach email"],
            ["deck", "Deck-request replies"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "default" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "brief" ? (
        <Card>
          <CardHeader>
            <CardTitle>Raise Brief copy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Headline">
              <Input
                value={brief.headline}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: { ...prev.raise_brief, headline: event.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Company category">
              <Input
                value={brief.company_category}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: {
                      ...prev.raise_brief,
                      company_category: event.target.value,
                    },
                  }))
                }
              />
            </Field>
            <Field label="Use of funds">
              <Textarea
                value={brief.transaction_overview.use_of_funds}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: {
                      ...prev.raise_brief,
                      transaction_overview: {
                        ...prev.raise_brief.transaction_overview,
                        use_of_funds: event.target.value,
                      },
                    },
                  }))
                }
                rows={2}
              />
            </Field>
            <Field label="Investment highlights (one per line)">
              <Textarea
                value={brief.investment_highlights.join("\n")}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: {
                      ...prev.raise_brief,
                      investment_highlights: event.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .slice(0, 5),
                    },
                  }))
                }
                rows={5}
              />
            </Field>
            <Field label="Market">
              <Textarea
                value={brief.market}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: { ...prev.raise_brief, market: event.target.value },
                  }))
                }
                rows={3}
              />
            </Field>
            <Field label="Company context">
              <Textarea
                value={brief.company_context}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: {
                      ...prev.raise_brief,
                      company_context: event.target.value,
                    },
                  }))
                }
                rows={4}
              />
            </Field>
            <Field label="Team credibility">
              <Textarea
                value={brief.team_credibility}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: {
                      ...prev.raise_brief,
                      team_credibility: event.target.value,
                    },
                  }))
                }
                rows={2}
              />
            </Field>
            <Field label="Next step">
              <Input
                value={brief.next_step}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    raise_brief: { ...prev.raise_brief, next_step: event.target.value },
                  }))
                }
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {tab === "email" ? (
        <Card>
          <CardHeader>
            <CardTitle>Coordinated outreach email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Recommended subject">
              <Input
                value={email.recommended_subject}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    email: { ...prev.email, recommended_subject: event.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Primary email">
              <Textarea
                value={email.primary_email}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    email: { ...prev.email, primary_email: event.target.value },
                  }))
                }
                rows={8}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyText("primary", email.primary_email)}
              >
                {copied === "primary" ? "Copied" : "Copy primary email"}
              </Button>
            </div>
            <Field label="Short version">
              <Textarea
                value={email.short_email}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    email: { ...prev.email, short_email: event.target.value },
                  }))
                }
                rows={5}
              />
            </Field>
            <Field label="Follow-up email">
              <Textarea
                value={email.follow_up_email}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    email: { ...prev.email, follow_up_email: event.target.value },
                  }))
                }
                rows={5}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Emails are generated for copy/paste only — RaiseWise does not send them yet.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "deck" ? (
        <Card>
          <CardHeader>
            <CardTitle>When the investor asks for the deck</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["concise", "warm", "formal"] as const).map((key) => (
              <Field key={key} label={`${key[0].toUpperCase()}${key.slice(1)} version`}>
                <Textarea
                  value={production.deck_request_response[key]}
                  onChange={(event) =>
                    setProduction((prev) => ({
                      ...prev,
                      deck_request_response: {
                        ...prev.deck_request_response,
                        [key]: event.target.value,
                      },
                    }))
                  }
                  rows={4}
                />
              </Field>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={save} disabled={Boolean(busy)}>
          {busy === "save" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save edits"
          )}
        </Button>
        <Button variant="outline" onClick={regenerate} disabled={Boolean(busy)}>
          {busy === "regen" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Regenerating…
            </>
          ) : (
            "Regenerate production"
          )}
        </Button>
        <Button onClick={exportPdf} disabled={Boolean(busy)}>
          {busy === "pdf" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Exporting…
            </>
          ) : (
            "Export one-page PDF"
          )}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
