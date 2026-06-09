import { FinancialModelForm } from "@/components/financial-model/financial-model-form"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { fetchLatestDeckFinancialPrefill } from "@/lib/deck/queries.server"
import { getProfile } from "@/lib/auth"
import { buildFinancialModelPrefill } from "@/lib/profile/prefill"
import { buildFinancialPrefillFromDeckSignals } from "@/lib/financial/deck-prefill"
import { DeckFinancialSignalsSchema } from "@/lib/openai/schemas"
import { canUseFinancialModel, getUserPlan } from "@/lib/access"
import { redirect } from "next/navigation"

export default async function FinancialModelPage() {
  const [plan, profile, deckPrefill] = await Promise.all([
    getUserPlan(),
    getProfile(),
    fetchLatestDeckFinancialPrefill(),
  ])

  if (!canUseFinancialModel(plan)) {
    redirect("/pricing")
  }

  const profileValues = buildFinancialModelPrefill(profile)
  const parsedSignals = deckPrefill?.financialSignals
    ? DeckFinancialSignalsSchema.safeParse(deckPrefill.financialSignals)
    : null
  const initialValues = buildFinancialPrefillFromDeckSignals(
    parsedSignals?.success ? parsedSignals.data : null,
    profileValues
  )
  const deckHint = deckPrefill?.summary
    ? "We pre-filled numbers from your latest deck analysis where available. Review before generating."
    : null
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 md:p-6">
      <div className="shrink-0">
        <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
          Financial Model
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build a simple investor-facing 36-month projection.
        </p>
      </div>
      <div className="shrink-0">
        <FeaturePhotoCard
          eyebrow="Model"
          title={
            <>
              Turn assumptions into a raise-ready <FeatureEm>forecast.</FeatureEm>
            </>
          }
          description="Capture revenue, burn, runway, hiring, and customer assumptions in one clean model investors can actually follow."
        />
      </div>
      <div className="min-h-0 flex-1">
        <FinancialModelForm
          className="h-full"
          initialValues={initialValues}
          deckPrefillHint={deckHint}
        />
      </div>
    </main>
  )
}
