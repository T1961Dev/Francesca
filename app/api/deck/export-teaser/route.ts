import { NextResponse } from "next/server"
import { z } from "zod"

import { canGenerateTeaser, getUserPlan } from "@/lib/access"
import { requireAuth } from "@/lib/auth"
import { captureError } from "@/lib/sentry/capture"

const schema = z.object({ analysisId: z.string().uuid() })

/** @deprecated Replaced by Raise Brief at /dashboard/raise-brief */
export async function POST(request: Request) {
  try {
    await requireAuth()
    const plan = await getUserPlan()

    if (!canGenerateTeaser(plan)) {
      return NextResponse.json(
        { success: false, error: "Upgrade to Pro to generate a Raise Brief." },
        { status: 403 }
      )
    }

    const { analysisId } = schema.parse(await request.json())
    return NextResponse.json(
      {
        success: false,
        error:
          "The one-page teaser has been replaced by Raise Brief. Open /dashboard/raise-brief to generate a strategic investor teaser.",
        redirectTo: `/dashboard/raise-brief?deck=${analysisId}`,
      },
      { status: 410 }
    )
  } catch (error) {
    captureError(error, { route: "deck-export-teaser" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Teaser export failed" },
      { status: 400 }
    )
  }
}
