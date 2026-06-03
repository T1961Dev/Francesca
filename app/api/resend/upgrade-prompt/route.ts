import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { sendUpgradePromptEmail } from "@/lib/resend/emails"
import { captureError } from "@/lib/sentry/capture"

const schema = z.object({ analysisId: z.string().uuid().optional() })

/** Manual / QA trigger for the upgrade prompt email. */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")

    const body = schema.parse(await request.json().catch(() => ({})))
    const result = await sendUpgradePromptEmail({
      userId: user.id,
      to: user.email,
      analysisId: body.analysisId ?? null,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    captureError(error, { route: "resend-upgrade-prompt" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Email failed" },
      { status: 400 }
    )
  }
}
