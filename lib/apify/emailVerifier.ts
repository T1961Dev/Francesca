import "server-only"

import { apify } from "@/lib/apify/client"
import { resolveEmailVerifierActorId } from "@/lib/apify/actors"

export type VerifiedEmail = {
  email: string
  valid: boolean
  raw: Record<string, unknown>
}

/**
 * Verify a batch of emails. Returns only entries the actor marked valid/deliverable.
 */
export async function verifyEmails(emails: string[]): Promise<VerifiedEmail[]> {
  const actorId = resolveEmailVerifierActorId()
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (!unique.length) return []

  const input = { emailList: unique }
  console.log("[apify:email-verifier] Starting actor", { actorId, count: unique.length })
  const run = await apify.actor(actorId).call(input)
  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems()
  const results: VerifiedEmail[] = []

  for (const item of items) {
    const raw = item as Record<string, unknown>
    const email = String(raw.email ?? raw.address ?? "").trim().toLowerCase()
    if (!email) continue
    const status = String(
      raw.status ?? raw.result ?? raw.verdict ?? raw.deliverability ?? ""
    ).toLowerCase()
    const valid =
      raw.valid === true ||
      raw.isValid === true ||
      status.includes("valid") ||
      status.includes("deliverable") ||
      status === "ok" ||
      status === "safe"
    results.push({ email, valid, raw })
  }

  console.log("[apify:email-verifier] Done", {
    checked: results.length,
    valid: results.filter((r) => r.valid).length,
  })
  return results
}

export function validEmailSet(verified: VerifiedEmail[]): Set<string> {
  return new Set(verified.filter((v) => v.valid).map((v) => v.email))
}
