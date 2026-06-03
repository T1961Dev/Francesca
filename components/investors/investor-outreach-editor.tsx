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
import { cn } from "@/lib/utils"

type Match = Record<string, unknown>

type OutreachStep = {
  step: number
  label: string
  subject: string
  body: string
  sendAfterDays: number
}

function readSequence(match: Match): OutreachStep[] {
  const raw = match.outreachSequence
  if (!raw || typeof raw !== "object") {
    const subject = String(match.outreachSubject ?? "")
    const body = String(match.outreachBody ?? "")
    if (!subject && !body) return []
    return [
      { step: 1, label: "Intro", subject, body, sendAfterDays: 0 },
      { step: 2, label: "Follow-up", subject: "", body: "", sendAfterDays: 5 },
      { step: 3, label: "Final bump", subject: "", body: "", sendAfterDays: 12 },
    ]
  }
  const steps = (raw as { steps?: unknown }).steps
  if (!Array.isArray(steps)) return []
  return steps
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null
      const row = entry as Record<string, unknown>
      return {
        step: Number(row.step ?? index + 1),
        label: String(row.label ?? `Step ${index + 1}`),
        subject: String(row.subject ?? ""),
        body: String(row.body ?? ""),
        sendAfterDays: Number(row.sendAfterDays ?? 0),
      }
    })
    .filter((row): row is OutreachStep => Boolean(row))
}

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
  const [activeStep, setActiveStep] = useState(0)
  const [steps, setSteps] = useState<OutreachStep[]>(() => readSequence(match))
  const [improvements, setImprovements] = useState("")
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSteps(readSequence(match))
    setActiveStep(0)
    setImprovements("")
    setError(null)
  }, [match, rank])

  const current = steps[activeStep]
  const initialSteps = useMemo(() => readSequence(match), [match])
  const dirty =
    JSON.stringify(steps) !== JSON.stringify(initialSteps) &&
    steps.some((s) => s.subject.trim() && s.body.trim())

  const source = String(match.outreachSource ?? "ai")
  const sourceLabel = sourceLabelFor(source)

  async function saveManualEdits() {
    if (!current || !steps.length) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/investors/outreach/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          rank,
          subject: steps[0]?.subject.trim() ?? "",
          body: steps[0]?.body.trim() ?? "",
          outreachSequence: { steps },
        }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not save")
        return
      }
      onUpdated?.({
        outreachSubject: json.data.outreachSubject,
        outreachBody: json.data.outreachBody,
        outreachSequence: json.data.outreachSequence,
        outreachUpdatedAt: json.data.outreachUpdatedAt,
        outreachSource: json.data.outreachSource,
        suggestedAngle: json.data.outreachSubject,
      })
      toast.success("Outreach sequence saved")
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
      const nextSteps = readSequence({
        outreachSequence: json.data.outreachSequence,
        outreachSubject: json.data.outreachSubject,
        outreachBody: json.data.outreachBody,
      })
      setSteps(nextSteps)
      setActiveStep(0)
      setImprovements("")
      onUpdated?.({
        outreachSubject: json.data.outreachSubject,
        outreachBody: json.data.outreachBody,
        outreachSequence: json.data.outreachSequence,
        outreachGeneratedAt: json.data.outreachGeneratedAt,
        outreachUpdatedAt: json.data.outreachUpdatedAt,
        outreachSource: json.data.outreachSource,
        outreachImprovements: json.data.outreachImprovements,
        suggestedAngle: json.data.outreachSubject,
      })
      toast.success("Outreach sequence regenerated")
    } catch {
      setError("Could not regenerate")
    } finally {
      setRegenerating(false)
    }
  }

  async function copyTemplate() {
    if (!current) return
    const text = `Subject: ${current.subject.trim()}\n\n${current.body.trim()}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  function updateCurrent(patch: Partial<OutreachStep>) {
    setSteps((prev) =>
      prev.map((step, index) => (index === activeStep ? { ...step, ...patch } : step))
    )
  }

  const updatedLabel = useMemo(() => {
    const updatedAt = match.outreachUpdatedAt ?? match.outreachGeneratedAt
    if (!updatedAt) return null
    return formatRelative(new Date(String(updatedAt)))
  }, [match.outreachGeneratedAt, match.outreachUpdatedAt])

  if (!current) return null

  return (
    <>
      <Toaster />
      <section className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              <h3 className="font-medium">Outreach sequence</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Three-touch sequence from deck, financial model, and investor signals. Edit each
              step before you send.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{sourceLabel}</Badge>
            {updatedLabel ? (
              <span className="text-xs text-muted-foreground">Updated {updatedLabel}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <button
              key={step.step}
              type="button"
              onClick={() => setActiveStep(index)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                index === activeStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {step.label}
              {step.sendAfterDays > 0 ? ` · Day ${step.sendAfterDays}` : " · Now"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`outreach-subject-${rank}-${activeStep}`}>Subject line</Label>
            <Input
              id={`outreach-subject-${rank}-${activeStep}`}
              value={current.subject}
              onChange={(event) => updateCurrent({ subject: event.target.value })}
              placeholder="Short, specific subject"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`outreach-body-${rank}-${activeStep}`}>Email body</Label>
            <Textarea
              id={`outreach-body-${rank}-${activeStep}`}
              value={current.body}
              onChange={(event) => updateCurrent({ body: event.target.value })}
              className="min-h-44 font-sans leading-relaxed"
              placeholder="Your outreach email"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={saveManualEdits}
            disabled={!dirty || saving || regenerating}
          >
            {saving ? "Saving…" : "Save sequence"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={copyTemplate}
            disabled={!current.subject.trim() || !current.body.trim()}
          >
            <Copy className="size-3.5" />
            Copy step
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor={`outreach-improvements-${rank}`}>
            Regenerate full sequence (optional notes)
          </Label>
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
            <RefreshCw className={cn("size-3.5", regenerating && "animate-spin")} />
            {regenerating ? "Regenerating…" : "Regenerate sequence"}
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
