import { NextResponse } from "next/server"

import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }

    const { data, error } = await supabase.rpc("fetch_deck_analysis_status", {
      p_analysis_id: analysisId,
    })

    if (error) throw error
    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, error: "Analysis not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    captureError(error, { route: "deck-status" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not load analysis status",
      },
      { status: 400 }
    )
  }
}
