import { NextResponse } from "next/server"

import { processCrunchbaseWebhook, processLinkedInWebhook } from "@/lib/investors/pipeline"
import { captureError } from "@/lib/sentry/capture"

type ApifyStep = "crunchbase" | "linkedin"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get("secret")
  const jobId = url.searchParams.get("jobId")
  const step = url.searchParams.get("step") as ApifyStep | null

  if (!process.env.APIFY_WEBHOOK_SECRET || secret !== process.env.APIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorised" }, { status: 401 })
  }

  if (!jobId || (step !== "crunchbase" && step !== "linkedin")) {
    return NextResponse.json({ success: false, error: "Invalid webhook parameters" }, { status: 400 })
  }

  try {
    const payload = await request.json().catch(() => ({}))
    const eventType = String(payload.eventType ?? payload.event_type ?? "")
    const resource = asRecord(payload.resource)
    const datasetId = String(resource?.defaultDatasetId ?? resource?.default_dataset_id ?? "")
    const failed = eventType.includes("FAILED") || eventType.includes("TIMED_OUT")
    const error = failed
      ? String(resource?.statusMessage ?? resource?.status_message ?? "Apify actor run failed")
      : undefined

    if (step === "crunchbase") {
      await processCrunchbaseWebhook({ jobId, datasetId, failed, error })
    } else {
      await processLinkedInWebhook({ jobId, datasetId, failed, error })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureError(error, { route: "apify-webhook", jobId, step })
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 400 })
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
