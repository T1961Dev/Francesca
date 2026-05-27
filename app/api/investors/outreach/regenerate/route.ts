import { NextResponse } from "next/server"
import { z } from "zod"

import { canViewInvestorOutreachTemplates, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { buildFounderProfile } from "@/lib/matching/profile"
import { generateOutreachEmail } from "@/lib/matching/outreach"
import {
  buildOutreachApifyContextFromStored,
  storedMatchToOutreachInput,
} from "@/lib/matching/outreach-context"
import { loadInvestorMatchRow, updateInvestorMatchAtRank } from "@/lib/investors/match-mutations"
import { captureError } from "@/lib/sentry/capture"
import { bumpRateLimit } from "@/lib/security/rate-limit"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  jobId: z.string().uuid(),
  rank: z.number().int().positive(),
  improvements: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canViewInvestorOutreachTemplates(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to regenerate outreach templates." },
        { status: 403 }
      )
    }

    const limit = await bumpRateLimit({
      key: `investor-outreach-regen:${user.id}`,
      windowMs: 60 * 60 * 1000,
      limit: 30,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many regenerations. Try again later." },
        { status: 429 }
      )
    }

    const { jobId, rank, improvements } = schema.parse(await request.json())
    const supabase = await createClient()
    const row = await loadInvestorMatchRow(supabase, jobId, user.id)

    if (!row) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 })
    }

    const index = row.matches.findIndex((match) => Number(match?.rank) === rank)
    if (index === -1) {
      return NextResponse.json({ success: false, error: "Match rank not found" }, { status: 404 })
    }

    const stored = row.matches[index]
    const deckAnalysisId = row.deck_analysis_id

    if (!deckAnalysisId) {
      return NextResponse.json(
        { success: false, error: "Deck context missing for this match" },
        { status: 400 }
      )
    }

    const [{ data: profileRow }, { data: deckAnalysis }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("deck_analyses").select("*").eq("id", deckAnalysisId).single(),
    ])

    const profile = buildFounderProfile({
      userId: user.id,
      deckAnalysisId,
      profile: (profileRow ?? {}) as Record<string, unknown>,
      deckAnalysis: (deckAnalysis ?? {}) as Record<string, unknown>,
    })

    const matchInput = storedMatchToOutreachInput(stored)
    const apifyContext = buildOutreachApifyContextFromStored(stored, row.raw_apify_response)
    const currentDraft = {
      subject: String(stored.outreachSubject ?? ""),
      body: String(stored.outreachBody ?? ""),
    }

    const outreach = await generateOutreachEmail({
      profile,
      match: matchInput,
      apifyContext,
      improvements,
      currentDraft:
        currentDraft.subject.trim() && currentDraft.body.trim() ? currentDraft : undefined,
      userId: user.id,
      runId: jobId,
    })

    const now = new Date().toISOString()
    const updated = await updateInvestorMatchAtRank({
      supabase,
      rowId: row.id,
      matches: row.matches,
      rank,
      patch: {
        outreachSubject: outreach.subject,
        outreachBody: outreach.body,
        suggestedAngle: outreach.subject,
        outreachGeneratedAt: now,
        outreachUpdatedAt: now,
        outreachSource: "regenerated",
        outreachImprovements: improvements?.trim() || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        outreachSubject: updated.outreachSubject,
        outreachBody: updated.outreachBody,
        outreachGeneratedAt: updated.outreachGeneratedAt,
        outreachUpdatedAt: updated.outreachUpdatedAt,
        outreachSource: updated.outreachSource,
        outreachImprovements: updated.outreachImprovements,
      },
    })
  } catch (error) {
    captureError(error, { route: "investors-outreach-regenerate" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not regenerate outreach",
      },
      { status: 400 }
    )
  }
}
