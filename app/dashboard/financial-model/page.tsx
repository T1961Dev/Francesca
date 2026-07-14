import { FinancialModelForm } from "@/components/financial-model/financial-model-form"
import {
  FeatureEm,
  FeaturePhotoCard,
} from "@/components/feature-photo-card"
import { FundraisingJourneyTracker } from "@/components/dashboard/fundraising-journey-tracker"
import { fetchLatestDeckFinancialPrefill } from "@/lib/deck/queries.server"
import { requireAuth, getProfile } from "@/lib/auth"
import { buildFinancialModelPrefill } from "@/lib/profile/prefill"
import { buildFinancialPrefillFromDeckSignals } from "@/lib/financial/deck-prefill"
import { DeckFinancialSignalsSchema } from "@/lib/openai/schemas"
import { canUseFinancialModel, getUserPlan } from "@/lib/access"
import { getWorkspaceJourney } from "@/lib/dashboard/journey"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"
import { redirect } from "next/navigation"

export default async function FinancialModelPage() {
  const user = await requireAuth()
  const profile = await getProfile()
  const [plan, deckPrefill, journey] = await Promise.all([
    getUserPlan(),
    fetchLatestDeckFinancialPrefill(),
    getWorkspaceJourney(user.id, profile),
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
    ? "Information from your latest pitch deck has been used to prefill this model."
    : null

  const pitchJourneySteps = [
    {
      id: "upload",
      label: "Upload Deck",
      shortLabel: "Upload",
      done: journey.steps.find((step) => step.id === "upload")?.done ?? false,
      href: "/dashboard/deck-analyser",
    },
    {
      id: "improve",
      label: "Improve Deck",
      shortLabel: "Improve",
      done: journey.steps.find((step) => step.id === "improve")?.done ?? false,
      href:
        journey.latestDeck?.id
          ? `/dashboard/deck-analyser/${journey.latestDeck.id}`
          : "/dashboard/deck-analyser",
    },
    {
      id: "financial",
      label: "Financial Model",
      shortLabel: "Financials",
      done: journey.steps.find((step) => step.id === "financial")?.done ?? false,
      href: "/dashboard/financial-model",
    },
    {
      id: "investors",
      label: "Investors",
      shortLabel: "Investors",
      done: journey.steps.find((step) => step.id === "investors")?.done ?? false,
      href: "/dashboard/investor-matching",
    },
    {
      id: "outreach",
      label: "Outreach",
      shortLabel: "Outreach",
      done: journey.steps.find((step) => step.id === "outreach")?.done ?? false,
      href: "/dashboard/investor-matching",
    },
  ]

  return (
    <main className={dashboardPageMainClass}>
      <div className="shrink-0 space-y-4">
        <FundraisingJourneyTracker
          title="Fundraising Journey"
          steps={pitchJourneySteps}
          currentStepId="financial"
        />

        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight md:text-[2.125rem]">
            Build Your Financial Model
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Create an investor-ready financial model based on your business, growth assumptions
            and fundraising goals.
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <FeaturePhotoCard
          eyebrow="Model"
          title={
            <>
              Build the financial story behind your <FeatureEm>pitch.</FeatureEm>
            </>
          }
          description="We'll guide you through the assumptions investors expect to see and generate a financial model you can confidently share."
        />
      </div>

      <div className="md:min-h-0 md:flex-1">
        <FinancialModelForm
          className="md:h-full"
          initialValues={initialValues}
          deckPrefillHint={deckHint}
        />
      </div>
    </main>
  )
}
