import "server-only"

import { cookies } from "next/headers"

import {
  DECK_IMPROVED_COOKIE,
  type JourneyStep,
  type JourneyStepId,
  type NextAction,
  type WorkspaceChecklistItem,
  type WorkspaceJourney,
} from "@/lib/dashboard/journey-types"
import { isOnboardingComplete } from "@/lib/onboarding"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

function pickBiggestIssue(row: Record<string, unknown> | null): string | null {
  if (!row) return null

  const priority = row.priority_actions
  if (Array.isArray(priority) && priority.length) {
    const first = priority[0]
    if (first && typeof first === "object") {
      const action = String((first as { action?: unknown }).action ?? "").trim()
      const reason = String((first as { reason?: unknown }).reason ?? "").trim()
      if (action) return reason ? `${action}. ${reason}` : action
    }
  }

  const weaknesses = row.weaknesses
  if (Array.isArray(weaknesses) && weaknesses.length) {
    const text = String(weaknesses[0] ?? "").trim()
    if (text) return text
  }

  return null
}

export async function getWorkspaceJourney(
  userId: string,
  profile: Profile | null
): Promise<WorkspaceJourney> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const jar = await cookies()
  const improveAcknowledged = jar.get(DECK_IMPROVED_COOKIE)?.value === "1"

  const [{ data: decks }, { data: models }, { data: matchRows }, { data: jobs }] =
    await Promise.all([
      supabase.rpc("list_deck_analysis_rows", { p_limit: 5 }),
      admin
        .from("financial_models")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("investor_matches")
        .select("id, matches, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      admin
        .from("investor_matching_jobs")
        .select("id, status, deck_analysis_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
    ])

  const deckList = Array.isArray(decks) ? (decks as Record<string, unknown>[]) : []
  const completedDeck = deckList.find((row) => String(row.status) === "completed") ?? null
  const anyDeck = deckList[0] ?? null
  const hasUploadedDeck = Boolean(anyDeck)
  const hasCompletedDeck = Boolean(completedDeck)

  let latestDeckDetail: Record<string, unknown> | null = null
  if (completedDeck?.id) {
    const { data } = await supabase.rpc("fetch_deck_analysis_row", {
      p_analysis_id: String(completedDeck.id),
    })
    if (data && typeof data === "object") {
      latestDeckDetail = data as Record<string, unknown>
    }
  }

  const score =
    latestDeckDetail?.overall_score != null
      ? Number(latestDeckDetail.overall_score)
      : completedDeck?.overall_score != null
        ? Number(completedDeck.overall_score)
        : null

  const biggestIssue = pickBiggestIssue(latestDeckDetail)

  const hasFinancialModel = (models ?? []).some(
    (row) => String(row.status) === "completed"
  )

  const profileComplete = isOnboardingComplete(profile)

  const matchPayloads = (matchRows ?? []).flatMap((row) => {
    const matches = row.matches
    return Array.isArray(matches) ? matches : []
  }) as Record<string, unknown>[]

  const investorMatchCount = matchPayloads.length
  const hasInvestorMatches =
    investorMatchCount > 0 ||
    (jobs ?? []).some((job) => String(job.status) === "completed")

  const shortlistedCount = matchPayloads.filter((match) => {
    const sent = match.marked_sent_at
    const outreach = match.outreachSequence ?? match.outreachBody ?? match.outreachSubject
    return Boolean(sent) || Boolean(outreach)
  }).length

  const hasOutreach = shortlistedCount > 0

  const strongDeck = score != null && Number.isFinite(score) && score >= 80
  const improveDone =
    hasCompletedDeck &&
    (improveAcknowledged || hasFinancialModel || strongDeck)

  const steps: JourneyStep[] = [
    {
      id: "upload",
      label: "Upload Deck",
      shortLabel: "Upload",
      done: hasUploadedDeck,
      href: "/dashboard/deck-analyser",
    },
    {
      id: "improve",
      label: "Improve Deck",
      shortLabel: "Improve",
      done: improveDone,
      href: completedDeck?.id
        ? `/dashboard/deck-analyser/${String(completedDeck.id)}`
        : "/dashboard/deck-analyser",
    },
    {
      id: "financial",
      label: "Build Financial Model",
      shortLabel: "Financials",
      done: hasFinancialModel,
      href: "/dashboard/financial-model",
    },
    {
      id: "profile",
      label: "Complete Founder Profile",
      shortLabel: "Profile",
      done: profileComplete,
      href: "/dashboard/settings",
    },
    {
      id: "investors",
      label: "Discover Investors",
      shortLabel: "Investors",
      done: hasInvestorMatches,
      href: "/dashboard/investor-matching",
    },
    {
      id: "outreach",
      label: "Outreach Ready",
      shortLabel: "Outreach",
      done: hasOutreach,
      href: "/dashboard/investor-matching",
    },
  ]

  const checklist: WorkspaceChecklistItem[] = [
    {
      id: "pitch",
      label: "Pitch Deck",
      done: hasCompletedDeck,
      href: "/dashboard/deck-analyser",
    },
    {
      id: "financial",
      label: "Financial Model",
      done: hasFinancialModel,
      href: "/dashboard/financial-model",
    },
    {
      id: "profile",
      label: "Investor Profile",
      done: profileComplete,
      href: "/dashboard/settings",
    },
    {
      id: "investors",
      label: "Investor Matching",
      done: hasInvestorMatches,
      href: "/dashboard/investor-matching",
    },
    {
      id: "outreach",
      label: "Outreach Ready",
      done: hasOutreach,
      href: "/dashboard/investor-matching",
    },
  ]

  const current = steps.find((step) => !step.done) ?? null
  const currentStepId = current?.id ?? "complete"

  const next = buildNextAction({
    currentStepId,
    score,
    biggestIssue,
    completedDeckId: completedDeck?.id ? String(completedDeck.id) : null,
    pendingDeckId: anyDeck?.id ? String(anyDeck.id) : null,
    investorMatchCount,
    hasCompletedDeck,
  })

  return {
    steps,
    checklist,
    next,
    currentStepId,
    latestDeck: completedDeck
      ? {
          id: String(completedDeck.id),
          score: Number.isFinite(score as number) ? (score as number) : null,
          biggestIssue,
        }
      : null,
    investorMatchCount,
    shortlistedCount,
  }
}

function buildNextAction(input: {
  currentStepId: JourneyStepId | "complete"
  score: number | null
  biggestIssue: string | null
  completedDeckId: string | null
  pendingDeckId: string | null
  investorMatchCount: number
  hasCompletedDeck: boolean
}): NextAction {
  switch (input.currentStepId) {
    case "upload":
      return {
        eyebrow: "Your next step",
        title: "Upload your pitch deck to begin your fundraising workspace.",
        description:
          "Your pitch deck is the foundation of everything inside RaiseWise. Once analysed, we'll personalise your financial model, investor matches and fundraising recommendations.",
        cta: { label: "Upload pitch deck", href: "/dashboard/deck-analyser" },
      }

    case "improve": {
      if (!input.hasCompletedDeck) {
        return {
          eyebrow: "Your next step",
          title: "We're analysing your pitch deck.",
          description:
            "Once scoring finishes, RaiseWise will surface the biggest issue to fix first so you always know what to do next.",
          cta: {
            label: "View progress",
            href: input.pendingDeckId
              ? `/dashboard/deck-analyser/${input.pendingDeckId}`
              : "/dashboard/deck-analyser",
          },
        }
      }

      const scoreLabel =
        input.score != null && Number.isFinite(input.score)
          ? `${Math.round(input.score)}/100`
          : null
      return {
        eyebrow: "Your next step",
        title: scoreLabel
          ? `Your deck scored ${scoreLabel}.`
          : "Review your deck analysis.",
        description: input.biggestIssue
          ? "Biggest issue to fix first:"
          : "Open your analysis and strengthen the sections investors will question.",
        detail: input.biggestIssue,
        cta: {
          label: "Review analysis",
          href: input.completedDeckId
            ? `/dashboard/deck-analyser/${input.completedDeckId}`
            : "/dashboard/deck-analyser",
        },
        secondaryCta: {
          label: "Continue to financials",
          href: "/dashboard/financial-model",
          acknowledgeImprove: true,
        },
      }
    }

    case "financial":
      return {
        eyebrow: "Your next step",
        title: "Build your financial model.",
        description:
          "Create an investor-ready 36-month model tailored to your raise so outreach and matching stay grounded in real numbers.",
        cta: { label: "Open financials", href: "/dashboard/financial-model" },
      }

    case "profile":
      return {
        eyebrow: "Your next step",
        title: "Complete your founder profile.",
        description:
          "Your profile helps RaiseWise personalise every recommendation and investor match.",
        cta: { label: "Complete profile", href: "/dashboard/settings" },
      }

    case "investors":
      return {
        eyebrow: "Your next step",
        title: input.hasCompletedDeck
          ? "Discover investors for your stage."
          : "Upload a deck before matching investors.",
        description: input.hasCompletedDeck
          ? "Generate a ranked shortlist of investors who actively invest in companies like yours."
          : "Matching stays accurate once your pitch deck has been analysed.",
        cta: {
          label: input.hasCompletedDeck ? "Discover investors" : "Upload pitch deck",
          href: input.hasCompletedDeck
            ? "/dashboard/investor-matching"
            : "/dashboard/deck-analyser",
        },
      }

    case "outreach":
      return {
        eyebrow: "Your next step",
        title:
          input.investorMatchCount > 0
            ? `You've shortlisted ${input.investorMatchCount} investors.`
            : "Generate personalised outreach.",
        description:
          "Open a match, personalise the sequence, and mark outreach as sent when you're ready.",
        cta: {
          label: "Open investor shortlist",
          href: "/dashboard/investor-matching",
        },
      }

    default:
      return {
        eyebrow: "Round ready",
        title: "Your fundraising workspace is ready.",
        description:
          "Deck, model, profile, matches, and outreach are in place. Keep refining as your raise moves forward.",
        cta: { label: "View investors", href: "/dashboard/investor-matching" },
        secondaryCta: {
          label: "Upload another deck",
          href: "/dashboard/deck-analyser",
        },
      }
  }
}
