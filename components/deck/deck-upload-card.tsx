"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { FileTextIcon, LoaderCircleIcon, UploadCloudIcon } from "lucide-react"

import type { LimitReachedPayload } from "@/components/billing/limit-reached-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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

const WhatsAppCaptureModal = dynamic(
  () =>
    import("@/components/deck/whatsapp-capture-modal").then(
      (mod) => mod.WhatsAppCaptureModal
    ),
  { loading: () => null }
)

type DeckUploadCardProps = {
  plan: Plan
  totalDeckUploadsEver: number
  whatsappBonusUsed: boolean
  plans: StripePlan[]
  currency: Currency
}

export function DeckUploadCard({
  plan,
  totalDeckUploadsEver,
  whatsappBonusUsed,
  plans,
  currency,
}: DeckUploadCardProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [whatsappOpen, setWhatsappOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [limit, setLimit] = useState<LimitReachedPayload | null>(null)

  const loadingCopy = useMemo(
    () =>
      loading
        ? "Extracting text, analysing investor-readiness, and preparing your report."
        : "Upload a PDF or PPTX deck. We extract text, score the deck with OpenAI, and save the report.",
    [loading]
  )

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

    const matching = json.data?.investorMatching as
      | { started: true; jobId: string }
      | { started: false; reason: string }
      | undefined

    if (matching?.started) {
      router.push(`/dashboard/investor-matching/${matching.jobId}`)
      return
    }

    router.push(`/dashboard/deck-analyser/${json.data.analysisId}`)
  }

  async function onSubmit(formData: FormData) {
    if (loading) return

    if (plan === "free" && totalDeckUploadsEver >= 1) {
      // Second upload for a free user.
      if (!whatsappBonusUsed) {
        setPendingFormData(formData)
        setWhatsappOpen(true)
        return
      }
      // WhatsApp bonus already used — straight to paywall.
      setPendingFormData(formData)
      setPaywallOpen(true)
      return
    }

    await performUpload(formData)
  }

  function continueAfterWhatsapp() {
    if (pendingFormData) {
      const data = pendingFormData
      setPendingFormData(null)
      void performUpload(data)
    }
  }

  function openPaywallInstead() {
    setWhatsappOpen(false)
    setPaywallOpen(true)
  }

  return (
    <>
      <Card className="bg-feature-photo-soft bg-flow-noise border-border/50">
        <CardHeader>
          <CardTitle>Upload pitch deck</CardTitle>
          <CardDescription>{loadingCopy}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={onSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="rounded-lg border border-dashed border-border/80 bg-card/80 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {fileName ? (
                    <FileTextIcon className="size-4 stroke-[1.7]" />
                  ) : (
                    <UploadCloudIcon className="size-4 stroke-[1.7]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="deck">
                    {fileName ?? "Choose a PDF or PPTX deck"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Maximum 20MB. Text must be selectable/extractable.
                  </p>
                </div>
              </div>
              <Input
                id="deck"
                name="file"
                type="file"
                accept=".pdf,.pptx"
                required
                className="mt-2 bg-card"
                disabled={loading}
                onChange={(event) =>
                  setFileName(event.currentTarget.files?.[0]?.name ?? null)
                }
              />
            </div>
            {loading ? (
              <div className="space-y-2">
                <Progress value={72} />
                <p className="text-xs text-muted-foreground">
                  This can take up to a minute for larger decks.
                </p>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
              aria-label={loading ? "Analysing deck" : undefined}
            >
              {loading ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                "Upload and analyse"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {whatsappOpen ? (
        <WhatsAppCaptureModal
          open={whatsappOpen}
          onOpenChange={setWhatsappOpen}
          onContinue={continueAfterWhatsapp}
          onUpgradeInstead={openPaywallInstead}
        />
      ) : null}

      {paywallOpen ? (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={(open) => {
            setPaywallOpen(open)
            if (!open) setPendingFormData(null)
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
