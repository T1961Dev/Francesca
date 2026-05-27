import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { upgradePromptEmail } from "@/lib/resend/templates"
import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ analysisId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")
    const { analysisId } = schema.parse(await request.json())
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("email_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_type", "upgrade_prompt")
      .contains("metadata", { analysisId })
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, data: { skipped: true } })
    }

    const template = upgradePromptEmail()
    const data = await sendTrackedEmail({ userId: user.id, to: user.email, type: "upgrade_prompt", ...template, metadata: { analysisId } })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    captureError(error, { route: "resend-upgrade-prompt" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Email failed" }, { status: 400 })
  }
}
