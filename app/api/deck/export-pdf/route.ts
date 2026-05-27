import { NextResponse } from "next/server"
import { z } from "zod"

import { canExportPdf, getUserPlan } from "@/lib/access"
import { fetchDeckAnalysisById } from "@/lib/deck/queries.server"
import { renderDeckAnalysisPdf } from "@/lib/pdf"
import { captureServerEvent } from "@/lib/posthog/server"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ analysisId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })

    const plan = await getUserPlan()
    if (!canExportPdf(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to a paid plan to export PDFs." },
        { status: 403 }
      )
    }

    const contentType = request.headers.get("content-type") ?? ""
    const body = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries())
    const { analysisId } = schema.parse(body)

    const analysis = await fetchDeckAnalysisById(analysisId)

    if (!analysis) {
      return NextResponse.json({ success: false, error: "Analysis not found" }, { status: 404 })
    }

    const { data: profile } = await supabase.from("profiles").select("company_name").eq("id", user.id).single()
    const pdf = await renderDeckAnalysisPdf({
      companyName: String(profile?.company_name ?? "Company"),
      overallScore: Number(analysis.overall_score ?? 0),
      summary: String(analysis.summary ?? ""),
      categoryScores: (analysis.category_scores as unknown[]) ?? [],
      strengths: (analysis.strengths as string[]) ?? [],
      weaknesses: (analysis.weaknesses as string[]) ?? [],
      missingSections: (analysis.missing_sections as string[]) ?? [],
      investorReadiness: String(analysis.investor_readiness ?? ""),
      suggestedFixes: (analysis.suggested_fixes as unknown[]) ?? [],
      priorityActions: (analysis.priority_actions as unknown[]) ?? [],
      fundraisingRisks: (analysis.fundraising_risks as string[]) ?? [],
    })
    const path = `${user.id}/deck-analysis-${analysisId}.pdf`
    const { error } = await supabase.storage.from("pdf-exports").upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (error) throw error

    await supabase.from("pdf_exports").insert({ user_id: user.id, source_type: "deck_analysis", source_id: analysisId, file_path: path })
    await captureServerEvent("pdf_exported", user.id, { source: "deck_analysis", analysisId })
    const signed = await supabase.storage.from("pdf-exports").createSignedUrl(path, 60)
    return NextResponse.json({ success: true, data: { path, url: signed.data?.signedUrl } })
  } catch (error) {
    captureError(error, { route: "deck-export-pdf" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "PDF export failed" }, { status: 400 })
  }
}
