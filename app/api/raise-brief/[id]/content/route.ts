import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import {
  RaiseBriefContentSchema,
  RaiseBriefEmailSchema,
  RaiseBriefProductionSchema,
} from "@/lib/raise-brief/schemas"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  raise_brief: RaiseBriefContentSchema.partial().optional(),
  email: RaiseBriefEmailSchema.partial().optional(),
  deck_request_response: z
    .object({
      concise: z.string().optional(),
      warm: z.string().optional(),
      formal: z.string().optional(),
    })
    .optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()
    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 })
    }

    const { id } = await params
    const body = schema.parse(await request.json())
    const supabase = await createClient()

    const { data: row, error } = await supabase
      .from("raise_briefs")
      .select("production")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error
    if (!row?.production) {
      return NextResponse.json(
        { success: false, error: "Raise Brief content not found" },
        { status: 404 }
      )
    }

    const current = RaiseBriefProductionSchema.parse(row.production)
    const next = RaiseBriefProductionSchema.parse({
      ...current,
      raise_brief: { ...current.raise_brief, ...body.raise_brief },
      email: { ...current.email, ...body.email },
      deck_request_response: {
        ...current.deck_request_response,
        ...body.deck_request_response,
      },
    })

    const { error: updateError } = await supabase
      .from("raise_briefs")
      .update({
        production: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: { id, production: next } })
  } catch (error) {
    captureError(error, { route: "raise-brief-content-patch" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update content",
      },
      { status: 400 }
    )
  }
}
