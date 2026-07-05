import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateTeaser, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { fetchDeckAnalysisById } from "@/lib/deck/queries.server"
import { renderDeckTeaserPdf } from "@/lib/pdf"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ analysisId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canGenerateTeaser(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to generate a one-page teaser." },
        { status: 403 }
      )
    }

    const { analysisId } = schema.parse(await request.json())
    const [analysis, supabase] = await Promise.all([fetchDeckAnalysisById(analysisId), createClient()])

    if (!analysis) {
      return NextResponse.json({ success: false, error: "Analysis not found" }, { status: 404 })
    }

    if (analysis.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "The deck analysis needs to finish before generating a teaser." },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, sector, industry, stage, funding_stage, geography, location, target_raise, target_raise_currency")
      .eq("id", user.id)
      .maybeSingle()

    const pdf = await renderDeckTeaserPdf({
      companyName: String(profile?.company_name ?? "Company"),
      sector: String(profile?.sector ?? profile?.industry ?? ""),
      stage: String(profile?.stage ?? profile?.funding_stage ?? ""),
      geography: String(profile?.geography ?? profile?.location ?? ""),
      targetRaise:
        typeof profile?.target_raise === "number"
          ? profile.target_raise
          : profile?.target_raise
            ? Number(profile.target_raise)
            : null,
      targetRaiseCurrency: profile?.target_raise_currency
        ? String(profile.target_raise_currency)
        : null,
      summary: String(analysis.summary ?? ""),
      investorReadiness: String(analysis.investor_readiness ?? ""),
      strengths: Array.isArray(analysis.strengths) ? (analysis.strengths as string[]) : [],
      categoryScores: Array.isArray(analysis.category_scores)
        ? (analysis.category_scores as unknown[])
        : [],
    })

    const path = `${user.id}/deck-teaser-${analysisId}.pdf`
    const { error } = await supabase.storage
      .from("pdf-exports")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (error) throw error

    await supabase.from("pdf_exports").insert({
      user_id: user.id,
      source_type: "teaser_pdf",
      source_id: analysisId,
      file_path: path,
    })

    const signed = await supabase.storage.from("pdf-exports").createSignedUrl(path, 60)
    return NextResponse.json({ success: true, data: { path, url: signed.data?.signedUrl } })
  } catch (error) {
    captureError(error, { route: "deck-export-teaser" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Teaser export failed" },
      { status: 400 }
    )
  }
}
