import { NextResponse } from "next/server"
import { z } from "zod"

import { canViewInvestorOutreachTemplates, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { renderInvestorMatchesPdf } from "@/lib/pdf"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ jobId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const plan = await getUserPlan()

    if (!canViewInvestorOutreachTemplates(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to export matches." },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const jobId =
      url.searchParams.get("jobId") ??
      (await request
        .clone()
        .json()
        .catch(() => ({}))
        .then((b) => (b as Record<string, unknown>).jobId ?? null))

    schema.parse({ jobId })

    const supabase = await createClient()
    const [{ data: row }, { data: profile }] = await Promise.all([
      supabase.from("investor_matches").select("matches").eq("job_id", jobId).maybeSingle(),
      supabase.from("profiles").select("company_name, full_name").eq("id", user.id).maybeSingle(),
    ])

    const matches = (row?.matches as Array<Record<string, unknown>> | null) ?? []
    const pdf = await renderInvestorMatchesPdf({
      companyName: String(profile?.company_name ?? profile?.full_name ?? "Founder"),
      runDate: new Date().toLocaleDateString("en-GB"),
      matches,
    })

    const path = `${user.id}/investor-matches-${jobId}.pdf`
    const { error } = await supabase.storage
      .from("pdf-exports")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true })
    if (error) throw error

    await supabase.from("pdf_exports").insert({
      user_id: user.id,
      source_type: "investor_pdf",
      source_id: jobId,
      file_path: path,
    })

    const signed = await supabase.storage.from("pdf-exports").createSignedUrl(path, 60)
    return NextResponse.json({ success: true, data: { path, url: signed.data?.signedUrl } })
  } catch (error) {
    captureError(error, { route: "investors-export-pdf" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Export failed" },
      { status: 400 }
    )
  }
}
