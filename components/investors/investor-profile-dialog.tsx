"use client"

import { useState, type ComponentType } from "react"
import { Building2, Mail, MapPin } from "lucide-react"

import { InvestorOutreachEditor } from "@/components/investors/investor-outreach-editor"
import { InvestorIdentityCell } from "@/components/investors/investor-identity-cell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

type Match = Record<string, unknown>

export function InvestorProfileDialog({
  jobId,
  match,
  open,
  onOpenChange,
  onMatchUpdated,
}: {
  jobId?: string | null
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMatchUpdated?: (rank: number, patch: Record<string, unknown>) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSent, setLocalSent] = useState<string | null>(null)

  if (!match) return null

  const rank = Number(match.rank)
  const investorName = String(match.investorName ?? "Unknown investor")
  const firmName = String(match.firmName ?? "")
  const role = readRole(match)
  const gptScore = match.matchScore ?? match.fitScore
  const stages = readInvestmentStages(match)
  const sectors = readSectors(match)
  const email = readEmail(match)
  const linkedinUrl = readLinkedInUrl(match)
  const sentAt = localSent
  const sentLabel = sentAt ? `Sent ${formatRelative(new Date(sentAt))}` : "Mark as sent"

  async function toggleSent() {
    if (!jobId || !Number.isFinite(rank)) return

    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/investors/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, rank }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not update")
        return
      }
      const next = (json.data?.marked_sent_at as string | null) ?? null
      setLocalSent(next)
      onMatchUpdated?.(rank, { marked_sent_at: next })
    } catch {
      setError("Could not update")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,860px)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 border-b bg-muted/20 px-5 py-5">
          <DialogHeader className="gap-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              {gptScore != null ? (
                <Badge variant="secondary" className="font-mono tabular-nums">
                  GPT {String(gptScore)}
                </Badge>
              ) : null}
              {sentAt ? (
                <Badge variant="success">
                  Sent {formatRelative(new Date(sentAt))}
                </Badge>
              ) : (
                <Badge variant="neutral">Not sent</Badge>
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="font-heading text-xl font-medium tracking-tight">
                <InvestorIdentityCell name={investorName} linkedinUrl={linkedinUrl} />
              </DialogTitle>
              <DialogDescription className="text-sm">
                {role}
                {firmName ? ` · ${firmName}` : ""}
              </DialogDescription>
              {stages.length ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {stages.map((stage) => (
                    <span
                      key={stage}
                      className="inline-flex rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-xs font-medium"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProfileMetaGrid
            location={String(match.location ?? "-")}
            stages={stages}
            sectors={sectors}
            chequeFit={String(match.chequeFit ?? "Unknown")}
            email={email}
            firmName={firmName}
          />

          <Separator />

          <section className="space-y-4 px-5 py-4">
            <InsightBlock
              title="Match rationale"
              body={String(match.matchRationale ?? match.whyThisInvestor ?? "Unavailable")}
            />
            <InsightBlock
              title="Why now"
              body={String(match.whyNow ?? "Unavailable")}
            />
          </section>

          {jobId ? (
            <>
              <Separator />
              <div className="px-5 py-4">
                <InvestorOutreachEditor
                  key={`${jobId}-${rank}`}
                  jobId={jobId}
                  match={match}
                  onUpdated={(patch) => {
                    if (Number.isFinite(rank)) onMatchUpdated?.(rank, patch)
                  }}
                />
              </div>
            </>
          ) : null}
        </div>

        {jobId ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-muted/15 px-5 py-4">
            <Button
              size="sm"
              variant={sentAt ? "secondary" : "default"}
              onClick={toggleSent}
              disabled={pending}
            >
              {pending ? "Saving…" : sentLabel}
            </Button>
            {sentAt ? (
              <Button size="sm" variant="ghost" onClick={toggleSent} disabled={pending}>
                Unmark
              </Button>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ProfileMetaGrid({
  location,
  stages,
  sectors,
  chequeFit,
  email,
  firmName,
}: {
  location: string
  stages: string[]
  sectors: string[]
  chequeFit: string
  email: string | null
  firmName: string
}) {
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
      <MetaItem icon={MapPin} label="Location" value={location} />
      <MetaItem icon={Building2} label="Firm" value={firmName || "-"} />
      <MetaItem label="Stage focus" value={stages.length ? stages.join(", ") : "-"} />
      <MetaItem label="Sector focus" value={sectors.length ? sectors.join(", ") : "-"} />
      <MetaItem label="Cheque fit" value={chequeFit || "Unknown"} />
      {email ? (
        <MetaItem icon={Mail} label="Email" value={email} className="sm:col-span-2" />
      ) : null}
    </div>
  )
}

function MetaItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 flex items-start gap-1.5 text-sm text-foreground">
        {Icon ? <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : null}
        <span className="leading-snug">{value}</span>
      </p>
    </div>
  )
}

function InsightBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

function readRole(match: Match) {
  if (typeof match.role === "string" && match.role.trim()) return match.role.trim()
  const partner = match.partner
  if (partner && typeof partner === "object" && "title" in partner) {
    const title = (partner as { title?: unknown }).title
    if (typeof title === "string" && title.trim()) return title.trim()
  }
  return "Investor"
}

function readSectors(match: Match) {
  if (Array.isArray(match.sectorFocus)) {
    return (match.sectorFocus as unknown[]).map(String).filter(Boolean)
  }
  return []
}

function readEmail(match: Match) {
  if (typeof match.email === "string" && match.email.trim()) return match.email.trim()
  const partner = match.partner
  if (partner && typeof partner === "object" && "email" in partner) {
    const value = (partner as { email?: unknown }).email
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function readInvestmentStages(match: Match) {
  if (Array.isArray(match.investmentStages)) {
    return (match.investmentStages as unknown[])
      .map(String)
      .map((stage) => stage.trim())
      .filter(Boolean)
  }
  const firm = match.firm
  if (firm && typeof firm === "object" && Array.isArray((firm as { investmentStages?: unknown }).investmentStages)) {
    return ((firm as { investmentStages: unknown[] }).investmentStages ?? [])
      .map(String)
      .map((stage) => stage.trim())
      .filter(Boolean)
  }
  const stageText = match.investmentStage
  if (typeof stageText === "string" && stageText.trim()) {
    return stageText.split(/[,;|/]+/).map((stage) => stage.trim()).filter(Boolean)
  }
  return []
}

function readLinkedInUrl(match: Match) {
  if (typeof match.linkedinUrl === "string" && match.linkedinUrl.trim()) {
    return match.linkedinUrl
  }
  const partner = match.partner
  if (partner && typeof partner === "object" && "linkedin" in partner) {
    const linkedin = (partner as { linkedin?: unknown }).linkedin
    if (typeof linkedin === "string" && linkedin.trim()) return linkedin
  }
  return null
}

function formatRelative(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
