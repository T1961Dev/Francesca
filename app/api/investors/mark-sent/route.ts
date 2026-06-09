import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { canViewInvestorOutreachTemplates, getUserPlan } from "@/lib/access"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  jobId: z.string().uuid(),
  rank: z.number().int().positive(),
  /** When undefined → toggle. When true → mark sent. When false → clear. */
  sent: z.boolean().optional(),
})

/**
 * Toggles `marked_sent_at` on a single match inside the `matches` JSONB array.
 * We don't move matches out into their own table to avoid migrating the
 * existing pipeline. The mutation is keyed by `(jobId, rank)`.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()
    if (!canViewInvestorOutreachTemplates(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to manage outreach templates." },
        { status: 403 }
      )
    }

    const { jobId, rank, sent } = schema.parse(await request.json())

    const supabase = await createClient()
    const { data: row, error: fetchError } = await supabase
      .from("investor_matches")
      .select("id, user_id, matches")
      .eq("job_id", jobId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!row || row.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      )
    }

    const matches = Array.isArray(row.matches) ? [...(row.matches as Record<string, unknown>[])] : []
    let nextSentValue: string | null = null
    const index = matches.findIndex((m) => Number(m?.rank) === rank)
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Match rank not found" },
        { status: 404 }
      )
    }
    const existing = matches[index]
    const currentlySent = Boolean(existing?.marked_sent_at)
    const target = typeof sent === "boolean" ? sent : !currentlySent
    nextSentValue = target ? new Date().toISOString() : null

    matches[index] = { ...existing, marked_sent_at: nextSentValue }

    const { error: updateError } = await supabase
      .from("investor_matches")
      .update({ matches })
      .eq("id", row.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: { marked_sent_at: nextSentValue } })
  } catch (error) {
    captureError(error, { route: "investors-mark-sent" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not update" },
      { status: 400 }
    )
  }
}
