/** Static copy shown to free users — never send real analysis text to the client. */
export const FREE_DECK_PREVIEW_TAGLINE =
  "Your overall score is ready. Upgrade to unlock per-dimension feedback, risks, fixes, and exports."

export function extractDimensionNames(categoryScores: unknown): string[] {
  if (!Array.isArray(categoryScores)) return []

  return categoryScores
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const record = entry as Record<string, unknown>
      const name = record.category ?? record.name
      return typeof name === "string" && name.trim() ? name.trim() : null
    })
    .filter((name): name is string => Boolean(name))
}
