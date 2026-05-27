import { createHash } from "crypto"

import type { FounderProfile } from "@/types/profile"

/**
 * Cache key for investor-matching jobs.
 *
 * Includes:
 * - the deck identity (deckId) so two different decks for the same founder
 *   never serve each other's matches,
 * - a hash of the deck signals (summary + scores + strengths/weaknesses) so a
 *   re-analysis of the same deck that produces different signals does NOT
 *   reuse the old cache,
 * - the lossy company buckets (sector / subSector / stage / geography /
 *   businessModel) so legitimate re-runs against the same deck still hit
 *   cache.
 *
 * Returns a 16-char SHA-256 prefix.
 */
export function hashProfile(profile: FounderProfile) {
  const signals = profile.deckSignals
  const stable = {
    deckId: profile.deckId || "",
    sector: profile.company.sector,
    subSector: profile.company.subSector,
    sectorRaw: profile.company.sectorRaw,
    stage: profile.company.stage,
    geography: profile.company.geography,
    businessModel: profile.company.businessModel,
    businessModelRaw: profile.company.businessModelRaw,
    deckSignature: signals
      ? {
          overallScore: signals.overallScore,
          summary: signals.summary,
          categoryScores: signals.categoryScores.map((c) => `${c.category}:${c.score}`),
          strengths: signals.strengths,
          weaknesses: signals.weaknesses,
        }
      : null,
  }

  return createHash("sha256")
    .update(JSON.stringify(stable))
    .digest("hex")
    .slice(0, 16)
}
