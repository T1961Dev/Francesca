"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"

type Match = Record<string, unknown>

export function InvestorOutreachEditor({
  jobId,
  match,
  onUpdated,
}: {
  jobId: string
  match: Match
  onUpdated?: (patch: Record<string, unknown>) => void
}) {
  const rank = Number(match.rank)
  const initialSubject = String(match.outreachSubject ?? "")
  const initialBody = String(match.outreachBody ?? "")

  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [improvements, setImprovements] = useState("")
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubject(initialSubject)
    setBody(initialBody)
    setImprovements("")
    setError(null)
  }, [initialSubject, initialBody, rank])

  const dirty = subject.trim() !== initialSubject.trim() || body.trim() !== initialBody.trim()
  const source = String(match.outreachSource ?? "ai")
  const sourceLabel = sourceLabelFor(source)

  const canSave = dirty && subject.trim().length > 0 && body.trim().length > 0

  async function saveManualEdits() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/investors/outreach/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, rank, subject: subject.trim(), body: body.trim() }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not save")
        return
      }
      onUpdated?.({
        outreachSubject: json.data.outreachSubject,
        outreachBody: json.data.outreachBody,
        outreachUpdatedAt: json.data.outreachUpdatedAt,
        outreachSource: json.data.outreachSource,
        suggestedAngle: json.data.outreachSubject,
      })
      toast.success("Outreach template saved")
    } catch {
      setError("Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function regenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/investors/outreach/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          rank,
          improvements: improvements.trim() || undefined,
        }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not regenerate")
        return
      }
      const nextSubject = String(json.data.outreachSubject ?? "")
      const nextBody = String(json.data.outreachBody ?? "")
      setSubject(nextSubject)
      setBody(nextBody)
      setImprovements("")
      onUpdated?.({
        outreachSubject: nextSubject,
        outreachBody: nextBody,
        outreachGeneratedAt: json.data.outreachGeneratedAt,
        outreachUpdatedAt: json.data.outreachUpdatedAt,
        outreachSource: json.data.outreachSource,
        outreachImprovements: json.data.outreachImprovements,
        suggestedAngle: nextSubject,
      })
      toast.success("Outreach template regenerated")
    } catch {
      setError("Could not regenerate")
    } finally {
      setRegenerating(false)
    }
  }

  async function copyTemplate() {
    const text = `Subject: ${subject.trim()}\n\n${body.trim()}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  const updatedLabel = useMemo(() => {
    const updatedAt = match.outreachUpdatedAt ?? match.outreachGeneratedAt
    if (!updatedAt) return null
    return formatRelative(new Date(String(updatedAt)))
  }, [match.outreachGeneratedAt, match.outreachUpdatedAt])

  return (
    <>
      <Toaster />
      <section className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <h3 className="font-medium">Outreach template</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Personalised from Leads Finder, Crunchbase, and LinkedIn signals. Edit or
            regenerate below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{sourceLabel}</Badge>
          {updatedLabel ? (
            <span className="text-xs text-muted-foreground">Updated {updatedLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`outreach-subject-${rank}`}>Subject line</Label>
          <Input
            id={`outreach-subject-${rank}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Short, specific subject"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`outreach-body-${rank}`}>Email body</Label>
          <Textarea
            id={`outreach-body-${rank}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-44 font-sans leading-relaxed"
            placeholder="Your outreach email"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={saveManualEdits} disabled={!canSave || saving || regenerating}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button size="sm" variant="outline" onClick={copyTemplate} disabled={!subject.trim() || !body.trim()}>
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor={`outreach-improvements-${rank}`}>Regenerate with improvements (optional)</Label>
        <Textarea
          id={`outreach-improvements-${rank}`}
          value={improvements}
          onChange={(event) => setImprovements(event.target.value)}
          className="min-h-20"
          placeholder='e.g. "Shorter opening", "Mention our seed round", "More casual tone"'
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={regenerate}
          disabled={regenerating || saving}
        >
          <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating…" : "Regenerate template"}
        </Button>
      </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </section>
    </>
  )
}

function sourceLabelFor(source: string) {
  if (source === "manual") return "Edited by you"
  if (source === "regenerated") return "Regenerated"
  return "AI generated"
}

function formatRelative(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
