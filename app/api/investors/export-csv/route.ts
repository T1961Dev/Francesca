import { NextResponse } from "next/server"
import { z } from "zod"

import { canViewInvestorOutreachTemplates, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { assertInvestorMatchRowOwner } from "@/lib/investors/job-access"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ jobId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canViewInvestorOutreachTemplates(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to export matches." },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const rawJobId =
      url.searchParams.get("jobId") ??
      (await request
        .clone()
        .json()
        .catch(() => ({}))
        .then((b) => (b as Record<string, unknown>).jobId ?? null))

    const { jobId } = schema.parse({ jobId: rawJobId })

    const supabase = await createClient()
    const row = await assertInvestorMatchRowOwner(supabase, jobId, user.id)

    const matches = (row.matches as Array<Record<string, unknown>> | null) ?? []
    const csv = buildCsv(matches)

    await supabase.from("pdf_exports").insert({
      user_id: user.id,
      source_type: "investor_csv",
      source_id: jobId,
      file_path: `inline-csv:${jobId}`,
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="raisewise-investors-${jobId}.csv"`,
      },
    })
  } catch (error) {
    captureError(error, { route: "investors-export-csv" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 400 }
    )
  }
}

function buildCsv(matches: Array<Record<string, unknown>>): string {
  const headers = [
    "rank",
    "fit_score",
    "firm_name",
    "firm_country",
    "firm_type",
    "cheque_fit",
    "cheque_size",
    "partner_name",
    "partner_title",
    "partner_email",
    "partner_linkedin",
    "match_rationale",
    "outreach_subject",
    "outreach_body",
    "marked_sent_at",
  ]
  const rows = matches.map((m) => [
    str(m.rank),
    str(m.fitScore ?? m.matchScore),
    str(m.firmName),
    str(m.location),
    str(m.investmentStage),
    str(m.chequeFit),
    str(m.chequeSize),
    str(m.investorName),
    str(m.role),
    str(m.email),
    str(m.linkedinUrl),
    str(m.matchRationale),
    str(m.outreachSubject),
    str(m.outreachBody),
    str(m.marked_sent_at ?? m.markedSentAt),
  ])
  return [headers, ...rows].map((line) => line.map(quote).join(",")).join("\r\n")
}

function str(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

function quote(value: string) {
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}
