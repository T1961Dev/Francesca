import { NextResponse } from "next/server"

import { canGenerateRaiseBrief, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { renderRaiseBriefPdf } from "@/lib/pdf"
import { RaiseBriefProductionSchema } from "@/lib/raise-brief/schemas"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()
    if (!canGenerateRaiseBrief(plan)) {
      return NextResponse.json({ success: false, error: "Upgrade required" }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from("raise_briefs")
      .select("id, status, production")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error
    if (!row?.production || row.status !== "ready") {
      return NextResponse.json(
        {
          success: false,
          error: "Finish generating the Raise Brief before exporting the PDF.",
        },
        { status: 400 }
      )
    }

    const production = RaiseBriefProductionSchema.parse(row.production)
    const pdf = await renderRaiseBriefPdf(production.raise_brief)
    const path = `${user.id}/raise-brief-${id}.pdf`

    const { error: uploadError } = await supabase.storage
      .from("pdf-exports")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (uploadError) throw uploadError

    await supabase.from("pdf_exports").insert({
      user_id: user.id,
      source_type: "raise_brief_pdf",
      source_id: id,
      file_path: path,
    })

    const signed = await supabase.storage.from("pdf-exports").createSignedUrl(path, 60)
    return NextResponse.json({
      success: true,
      data: { path, url: signed.data?.signedUrl },
    })
  } catch (error) {
    captureError(error, { route: "raise-brief-export-pdf" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "PDF export failed",
      },
      { status: 400 }
    )
  }
}
