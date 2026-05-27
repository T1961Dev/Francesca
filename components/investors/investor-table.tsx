"use client"

import { useEffect, useMemo, useState } from "react"

import { InvestorProfileDialog } from "@/components/investors/investor-profile-dialog"
import { InvestorIdentityCell } from "@/components/investors/investor-identity-cell"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Match = Record<string, unknown>

export function InvestorTable({
  matches,
  jobId,
}: {
  matches: Match[]
  jobId?: string | null
}) {
  const [selected, setSelected] = useState<Match | null>(null)
  const [rows, setRows] = useState<Match[]>(matches)

  useEffect(() => {
    setRows(matches)
  }, [matches])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aSent = Boolean(a.marked_sent_at)
      const bSent = Boolean(b.marked_sent_at)
      if (aSent === bSent) return Number(a.rank ?? 0) - Number(b.rank ?? 0)
      return aSent ? 1 : -1
    })
  }, [rows])

  function applyUpdate(rank: number, patch: Record<string, unknown>) {
    setRows((current) =>
      current.map((m) => (Number(m.rank) === rank ? { ...m, ...patch } : m))
    )
    setSelected((m) => (m && Number(m.rank) === rank ? { ...m, ...patch } : m))
  }

  return (
    <>
      <Table className="table-fixed w-full">
        <colgroup>
          <col className="w-[19%]" />
          <col className="w-[14%]" />
          <col className="w-[15%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[11%]" />
          <col className="w-[7%]" />
          <col className="w-[6%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Firm</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((match, index) => {
            const sent = Boolean(match.marked_sent_at)
            const investorName = String(match.investorName ?? "Unknown investor")
            const gptScore = match.matchScore ?? match.fitScore
            const stages = readInvestmentStages(match)
            const sectorText = readSectorText(match)

            return (
              <TableRow
                key={`${investorName}-${index}`}
                className={cn(
                  "cursor-pointer",
                  sent && "opacity-70"
                )}
                onClick={() => setSelected(match)}
              >
                <TableCell className="max-w-0">
                  <InvestorIdentityCell
                    name={investorName}
                    linkedinUrl={readLinkedInUrl(match)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <TruncatedCell title={readRole(match)}>{readRole(match)}</TruncatedCell>
                </TableCell>
                <TableCell className="max-w-0">
                  <TruncatedCell title={String(match.firmName ?? "-")}>
                    {String(match.firmName ?? "-")}
                  </TruncatedCell>
                </TableCell>
                <TableCell className="max-w-0">
                  <CompactStageTags stages={stages} />
                </TableCell>
                <TableCell className="max-w-0">
                  <TruncatedCell title={sectorText}>{sectorText}</TruncatedCell>
                </TableCell>
                <TableCell className="max-w-0">
                  <TruncatedCell title={String(match.location ?? "-")}>
                    {String(match.location ?? "-")}
                  </TruncatedCell>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {gptScore != null ? String(gptScore) : "-"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sent ? (
                    <Badge variant="success" className="max-w-full truncate">
                      Sent
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Open</Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <InvestorProfileDialog
        jobId={jobId ?? null}
        match={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onMatchUpdated={applyUpdate}
      />
    </>
  )
}

function TruncatedCell({
  children,
  title,
}: {
  children: string
  title?: string
}) {
  return (
    <span className="block truncate text-sm text-muted-foreground" title={title ?? children}>
      {children}
    </span>
  )
}

function CompactStageTags({ stages }: { stages: string[] }) {
  if (!stages.length) {
    return <span className="text-sm text-muted-foreground">-</span>
  }

  const visible = stages.slice(0, 2)
  const overflow = stages.length - visible.length

  return (
    <div className="flex min-w-0 items-center gap-1" title={stages.join(", ")}>
      {visible.map((stage) => (
        <span
          key={stage}
          className="inline-flex max-w-full truncate rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {stage}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  )
}

function readSectorText(match: Match) {
  if (Array.isArray(match.sectorFocus)) {
    return (match.sectorFocus as string[]).join(", ") || "-"
  }
  return "-"
}

function readRole(match: Match) {
  if (typeof match.role === "string" && match.role.trim()) return match.role.trim()

  const partner = match.partner
  if (partner && typeof partner === "object" && "title" in partner) {
    const title = (partner as { title?: unknown }).title
    if (typeof title === "string" && title.trim()) return title.trim()
  }

  return "-"
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
    return stageText
      .split(/[,;|/]+/)
      .map((stage) => stage.trim())
      .filter(Boolean)
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
