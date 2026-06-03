import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { scheduleReEngagementEmail } from "@/lib/re-engagement/schedule"
import { sendUpgradePromptEmail } from "@/lib/resend/emails"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  /** Only true when the user closes the paywall without upgrading. */
  dismissed: z.boolean().optional().default(false),
  analysisId: z.string().uuid().optional(),
  score: z.number().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = schema.parse(await request.json().catch(() => ({})))

    if (!body.dismissed) {
      return NextResponse.json({ success: true, skipped: true })
    }

    await supabase
      .from("profiles")
      .update({ paywall_dismissed_at: new Date().toISOString() })
      .eq("id", user.id)

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, full_name, email")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.plan !== "free" || !profile.email) {
      return NextResponse.json({ success: true })
    }

    await Promise.all([
      scheduleReEngagementEmail({
        userId: user.id,
        name: profile.full_name ?? null,
        score: body.score ?? null,
        analysisId: body.analysisId ?? null,
      }).catch((error) =>
        captureError(error, { route: "paywall-dismiss-schedule" })
      ),
      sendUpgradePromptEmail({
        userId: user.id,
        to: profile.email,
        analysisId: body.analysisId ?? null,
      }).catch((error) =>
        captureError(error, { route: "paywall-dismiss-upgrade-prompt" })
      ),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route: "paywall-dismiss" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not dismiss" },
      { status: 400 }
    )
  }
}
