import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuth } from "@/lib/auth"
import { scoreReadyEmail } from "@/lib/resend/templates"
import { sendTrackedEmail } from "@/lib/resend/send"
import { captureError } from "@/lib/sentry/capture"

const schema = z.object({ score: z.number().optional(), analysisId: z.string().uuid().optional() })

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user.email) throw new Error("User email is missing")
    const body = schema.parse(await request.json())
    const template = scoreReadyEmail(body.score)
    const data = await sendTrackedEmail({ userId: user.id, to: user.email, type: "score_ready", ...template, metadata: body })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    captureError(error, { route: "resend-score-ready" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Email failed" }, { status: 400 })
  }
}
