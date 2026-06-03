import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { sendScoreReadyEmail } from "@/lib/resend/emails"
import { captureError } from "@/lib/sentry/capture"

const schema = z.object({
  score: z.number().optional(),
  analysisId: z.string().uuid(),
})

/** Manual / QA trigger for the deck score-ready email. */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")

    const body = schema.parse(await request.json())
    const result = await sendScoreReadyEmail({
      userId: user.id,
      to: user.email,
      score: body.score,
      analysisId: body.analysisId,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    captureError(error, { route: "resend-score-ready" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Email failed" },
      { status: 400 }
    )
  }
}
