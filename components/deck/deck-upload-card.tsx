"use client"

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { CheckIcon, FileTextIcon, LoaderCircleIcon, UploadCloudIcon } from "lucide-react"

import type { LimitReachedPayload } from "@/components/billing/limit-reached-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Plan } from "@/types/app"
import type { Currency, StripePlan } from "@/types/billing"

const LimitReachedModal = dynamic(
  () =>
    import("@/components/billing/limit-reached-modal").then(
      (mod) => mod.LimitReachedModal
    ),
  { loading: () => null }
)

const PaywallModal = dynamic(
  () =>
    import("@/components/billing/paywall-modal").then(
      (mod) => mod.PaywallModal
    ),
  { loading: () => null }
)

const REVIEW_STEPS = [
  "Reading your slides",
  "Understanding your business",
  "Evaluating your narrative",
  "Comparing against successful fundraising decks",
  "Preparing recommendations",
]

type DeckUploadCardProps = {
  plan: Plan
  totalDeckUploadsEver: number
  plans: StripePlan[]
  currency: Currency
}

export function DeckUploadCard({
  plan,
  totalDeckUploadsEver,
  plans,
  currency,
}: DeckUploadCardProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [limit, setLimit] = useState<LimitReachedPayload | null>(null)
  const [reviewTick, setReviewTick] = useState(0)

  useEffect(() => {
    if (!loading) {
      setReviewTick(0)
      return
    }
    const interval = window.setInterval(() => {
      setReviewTick((value) => Math.min(value + 1, REVIEW_STEPS.length))
    }, 1400)
    return () => window.clearInterval(interval)
  }, [loading])

  const description = useMemo(
    () =>
      loading
        ? "Reviewing your pitch deck…"
        : "Upload your latest deck in PDF or PowerPoint. RaiseWise will review your narrative, structure, traction, market positioning and fundraising readiness.",
    [loading]
  )

  function assignFile(file: File | null | undefined) {
    if (!file || !inputRef.current || !formRef.current) return
    const transfer = new DataTransfer()
    transfer.items.add(file)
    inputRef.current.files = transfer.files
    setFileName(file.name)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    assignFile(file)
  }

  async function performUpload(formData: FormData) {
    setLoading(true)
    setError(null)

    const response = await fetch("/api/deck/upload", {
      method: "POST",
      body: formData,
    })
    const json = await response.json()

    setLoading(false)

    if (response.status === 402 && json?.error === "limit_reached") {
      setLimit(json as LimitReachedPayload)
      return
    }

    if (!json.success) {
      setError(json.error ?? "Upload failed")
      return
    }

    // Always land on the analysis result so founders see score-first guidance.
    router.push(`/dashboard/deck-analyser/${json.data.analysisId}`)
  }

  async function onSubmit(formData: FormData) {
    if (loading) return

    if (plan === "free" && totalDeckUploadsEver >= 1) {
      setLimit({
        error: "limit_reached",
        action: "deck_upload",
        limit_type: "deck_uploads",
        current: totalDeckUploadsEver,
        max: 1,
        resets_at: null,
        plan,
      })
      return
    }

    await performUpload(formData)
  }

  return (
    <>
      <Card className="bg-feature-photo-soft bg-flow-noise border-border/50">
        <CardHeader>
          <CardTitle>Step 1: Upload your pitch deck</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={onSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {loading ? (
              <div className="space-y-3 rounded-lg border border-border/70 bg-card/90 p-4">
                <p className="text-sm font-medium">Reviewing your pitch deck…</p>
                <ul className="space-y-2">
                  {REVIEW_STEPS.map((step, index) => {
                    const done = index < reviewTick
                    const active = index === reviewTick
                    return (
                      <li
                        key={step}
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          done || active ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {done ? (
                          <CheckIcon className="size-4 shrink-0 text-primary" />
                        ) : active ? (
                          <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="size-4 shrink-0 rounded-full border border-border" />
                        )}
                        <span>
                          {done ? "✓ " : ""}
                          {step}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "rounded-lg border border-dashed bg-card/80 p-4 transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border/80"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    {fileName ? (
                      <FileTextIcon className="size-4 stroke-[1.7]" />
                    ) : (
                      <UploadCloudIcon className="size-4 stroke-[1.7]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {fileName ?? "Drag & drop your deck here or browse your computer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF or PowerPoint · Max 50MB
                    </p>
                  </div>
                </div>
                <Input
                  ref={inputRef}
                  id="deck"
                  name="file"
                  type="file"
                  accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  required
                  className="mt-3 bg-card"
                  disabled={loading}
                  onChange={(event) =>
                    setFileName(event.currentTarget.files?.[0]?.name ?? null)
                  }
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
              aria-label={loading ? "Reviewing pitch deck" : undefined}
            >
              {loading ? (
                <>
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  Reviewing…
                </>
              ) : (
                "Review my pitch deck"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Average review time: under 2 minutes. Your deck remains private and is never shared.
            </p>
          </form>
        </CardContent>
      </Card>

      {paywallOpen ? (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={(open) => {
            setPaywallOpen(open)
          }}
          plans={plans}
          currency={currency}
          returnPath="/dashboard/deck-analyser"
        />
      ) : null}

      {limit ? (
        <LimitReachedModal
          open={Boolean(limit)}
          onOpenChange={(open) => {
            if (!open) setLimit(null)
          }}
          payload={limit}
          onUpgradeClick={() => {
            setLimit(null)
            setPaywallOpen(true)
          }}
        />
      ) : null}
    </>
  )
}
