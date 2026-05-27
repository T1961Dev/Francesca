import { NextResponse } from "next/server"

import { extractTextFromPdf, extractTextFromPptx, validateUploadFile } from "@/lib/file-extraction"
import { captureError } from "@/lib/sentry/capture"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Deck file is required" }, { status: 400 })
    }

    validateUploadFile(file)
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = file.type === "application/pdf"
      ? await extractTextFromPdf(buffer)
      : await extractTextFromPptx(buffer)

    return NextResponse.json({ success: true, data: { text } })
  } catch (error) {
    captureError(error, { route: "deck-extract" })
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Extraction failed" }, { status: 400 })
  }
}
