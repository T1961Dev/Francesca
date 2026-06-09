import { NextResponse } from "next/server"
import { z } from "zod"

import { buildDeckAnalysisInsert, buildDeckAnalysisRecord } from "@/lib/deck/persist"
import { analyseDeckText } from "@/lib/openai/deck-analysis"
import { captureError } from "@/lib/sentry/capture"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  deckUploadId: z.string().uuid(),
  text: z.string().min(50),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }

    const body = schema.parse(await request.json())
    const { data: upload, error: uploadError } = await supabase
      .from("deck_uploads")
      .select("id")
      .eq("id", body.deckUploadId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (uploadError) throw uploadError
    if (!upload) {
      return NextResponse.json(
        { success: false, error: "Deck upload not found" },
        { status: 404 }
      )
    }

    const analysis = await analyseDeckText(body.text)

    const analysisId = crypto.randomUUID()
    const insertRow = buildDeckAnalysisInsert({
      id: analysisId,
      userId: user.id,
      deckUploadId: body.deckUploadId,
      analysis,
    })

    const { error } = await createAdminClient()
      .from("deck_analyses")
      .insert(insertRow)

    if (error) throw error

    const data = buildDeckAnalysisRecord({
      id: analysisId,
      userId: user.id,
      deckUploadId: body.deckUploadId,
      analysis,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    captureError(error, { route: "deck-analyse" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Analysis failed" }, { status: 400 })
  }
}
