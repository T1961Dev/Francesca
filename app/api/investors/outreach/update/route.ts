import { NextResponse } from "next/server"
import { z } from "zod"

import { canViewInvestorOutreachTemplates, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { loadInvestorMatchRow, updateInvestorMatchAtRank } from "@/lib/investors/match-mutations"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  jobId: z.string().uuid(),
  rank: z.number().int().positive(),
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(8000),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canViewInvestorOutreachTemplates(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to edit outreach templates." },
        { status: 403 }
      )
    }

    const { jobId, rank, subject, body } = schema.parse(await request.json())
    const supabase = await createClient()
    const row = await loadInvestorMatchRow(supabase, jobId, user.id)

    if (!row) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updated = await updateInvestorMatchAtRank({
      supabase,
      rowId: row.id,
      matches: row.matches,
      rank,
      patch: {
        outreachSubject: subject.trim(),
        outreachBody: body.trim(),
        suggestedAngle: subject.trim(),
        outreachUpdatedAt: now,
        outreachSource: "manual",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        outreachSubject: updated.outreachSubject,
        outreachBody: updated.outreachBody,
        outreachUpdatedAt: updated.outreachUpdatedAt,
        outreachSource: updated.outreachSource,
      },
    })
  } catch (error) {
    captureError(error, { route: "investors-outreach-update" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not save outreach" },
      { status: 400 }
    )
  }
}
