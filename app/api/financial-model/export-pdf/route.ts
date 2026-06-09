import { NextResponse } from "next/server"
import { z } from "zod"

import { canExportPdf, getUserPlan } from "@/lib/access"
import { renderFinancialModelPdf } from "@/lib/pdf"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ modelId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    if (!canExportPdf(await getUserPlan())) return NextResponse.json({ success: false, error: "Upgrade to export PDFs" }, { status: 403 })

    const { modelId } = schema.parse(await request.json())
    const { data: model, error: modelError } = await supabase
      .from("financial_models")
      .select("*")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (modelError) throw modelError
    if (!model) {
      return NextResponse.json(
        { success: false, error: "Financial model not found" },
        { status: 404 }
      )
    }

    const inputs = model.inputs as Record<string, unknown>
    const pdf = await renderFinancialModelPdf({
      companyName: String(inputs.companyName ?? "Company"),
      assumptions: model.assumptions,
      revenueSummary: String(model.investor_summary ?? ""),
      burnSummary: String(model.narrative ?? ""),
      cashForecast: JSON.stringify(model.projection ?? []),
      fundingNarrative: String(model.narrative ?? ""),
      risks: model.risks,
    })
    const path = `${user.id}/financial-model-${modelId}.pdf`
    const { error } = await supabase.storage.from("pdf-exports").upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (error) throw error

    await supabase.from("pdf_exports").insert({ user_id: user.id, source_type: "financial_model", source_id: modelId, file_path: path })
    await captureServerEvent("pdf_exported", user.id, { source: "financial_model", modelId })
    const signed = await supabase.storage.from("pdf-exports").createSignedUrl(path, 60)
    return NextResponse.json({ success: true, data: { path, url: signed.data?.signedUrl } })
  } catch (error) {
    captureError(error, { route: "financial-export-pdf" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "PDF export failed" }, { status: 400 })
  }
}
