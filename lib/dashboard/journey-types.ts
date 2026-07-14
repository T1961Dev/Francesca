export const DECK_IMPROVED_COOKIE = "rw_deck_improved"

export type JourneyStepId =
  | "upload"
  | "improve"
  | "financial"
  | "profile"
  | "investors"
  | "outreach"

export type JourneyStep = {
  id: JourneyStepId
  label: string
  shortLabel: string
  done: boolean
  href: string
}

export type WorkspaceChecklistItem = {
  id: "pitch" | "financial" | "profile" | "investors" | "outreach"
  label: string
  done: boolean
  href: string
}

export type NextAction = {
  eyebrow: string
  title: string
  description: string
  detail?: string | null
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string; acknowledgeImprove?: boolean }
}

export type WorkspaceJourney = {
  steps: JourneyStep[]
  checklist: WorkspaceChecklistItem[]
  next: NextAction
  currentStepId: JourneyStepId | "complete"
  latestDeck: {
    id: string
    score: number | null
    biggestIssue: string | null
  } | null
  investorMatchCount: number
  shortlistedCount: number
}
