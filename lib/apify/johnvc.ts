import "server-only"

import { apify } from "@/lib/apify/client"
import type { JohnVCFirm } from "@/types/apify"
import type { FounderProfile } from "@/types/profile"

const ACTOR_ID = "johnvc/startup-investors-data-scraper"

/** Allowed `Focus_Areas` values for johnvc/startup-investors-data-scraper */
export const JOHNVC_FOCUS_AREAS = [
  "Administrative",
  "Advertising",
  "Agriculture and Food",
  "Apps",
  "Artificial Intelligence",
  "Biotechnology",
  "Blockchain & Crypto",
  "Clothing and Apparel",
  "Commerce and Shopping",
  "Community and Lifestyle",
  "Consumer Electronics",
  "Consumer Goods",
  "Content and Publishing",
  "Data and Analytics",
  "Design",
  "Education",
  "Energy",
  "Events",
  "Financial Services",
  "Food and Beverage",
  "Gaming",
  "Government",
  "Hardware",
  "Health Care",
  "Information Technology",
  "Internet Services",
  "Lending and Investments",
  "Manufacturing",
  "Media and Entertainment",
  "Messaging and Communication",
  "Mobile",
  "Music and Audio",
  "Natural Resources",
  "Navigation and Mapping",
  "Other",
  "Payments",
  "Platforms",
  "Privacy and Security",
  "Professional Services",
  "Real Estate",
  "Sales and Marketing",
  "Science and Engineering",
  "Software",
  "Sports",
  "Sustainability",
  "Transportation",
  "Travel and Tourism",
  "Video",
  "Uncategorized",
] as const

const FOCUS_AREA_SET = new Set<string>(JOHNVC_FOCUS_AREAS)

const FOCUS_AREA_ALIASES: Record<string, (typeof JOHNVC_FOCUS_AREAS)[number]> = {
  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  b2b: "Professional Services",
  "deep tech": "Science and Engineering",
  deeptech: "Science and Engineering",
  edtech: "Education",
  fintech: "Financial Services",
  health: "Health Care",
  healthcare: "Health Care",
  "health tech": "Health Care",
  healthtech: "Health Care",
  saas: "Software",
  software: "Software",
  biotech: "Biotechnology",
  crypto: "Blockchain & Crypto",
  blockchain: "Blockchain & Crypto",
  climate: "Sustainability",
  cleantech: "Sustainability",
  ecommerce: "Commerce and Shopping",
  "e-commerce": "Commerce and Shopping",
  marketplace: "Commerce and Shopping",
  media: "Media and Entertainment",
  gaming: "Gaming",
  proptech: "Real Estate",
  insurtech: "Financial Services",
  legaltech: "Professional Services",
  hrtech: "Professional Services",
  martech: "Sales and Marketing",
}

export function sanitizeJohnVCFocusAreas(areas: string[]): (typeof JOHNVC_FOCUS_AREAS)[number][] {
  const normalised = areas.flatMap((area) => {
    const trimmed = area.trim()
    if (!trimmed) return []

    if (FOCUS_AREA_SET.has(trimmed)) {
      return [trimmed as (typeof JOHNVC_FOCUS_AREAS)[number]]
    }

    const alias = FOCUS_AREA_ALIASES[trimmed.toLowerCase()]
    if (alias) return [alias]

    const fuzzy = JOHNVC_FOCUS_AREAS.find(
      (allowed) => allowed.toLowerCase() === trimmed.toLowerCase()
    )
    return fuzzy ? [fuzzy] : []
  })

  const deduped = [...new Set(normalised)]
  return deduped.length ? deduped : ["Software"]
}

export async function enrichInvestors(profile: FounderProfile): Promise<JohnVCFirm[]> {
  const input = buildJohnVCInput(profile)
  console.log("[apify:johnvc] Starting actor", { actorId: ACTOR_ID, input })
  const run = await apify.actor(ACTOR_ID).call(input)
  console.log("[apify:johnvc] Actor finished", {
    actorId: ACTOR_ID,
    runId: run.id,
    datasetId: run.defaultDatasetId,
    datasetUrl: run.defaultDatasetId
      ? `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
      : null,
  })
  const datasetId = String(run.defaultDatasetId ?? "")
  if (!datasetId) return []

  const { items } = await apify.dataset(datasetId).listItems()
  console.log("[apify:johnvc] Dataset items fetched", { datasetId, itemCount: items.length })
  return items as unknown as JohnVCFirm[]
}

export function buildJohnVCInput(profile: FounderProfile) {
  return {
    Firm_Types: [
      "Venture Capital Investor",
    ],
    Focus_Areas: mapToFocusAreas(profile.company.sector),
    Investment_Stages: mapToStages(profile.company.stage),
    Countries: [profile.company.geography || "United States"],
    Keyword: profile.company.subSector || profile.company.name,
    Include_Contacts: true,
  }
}

function mapToFocusAreas(sector: FounderProfile["company"]["sector"]) {
  const map: Record<FounderProfile["company"]["sector"], string[]> = {
    EdTech: ["Education", "Artificial Intelligence", "Software"],
    FinTech: ["Financial Services", "Software", "Payments"],
    SaaS: ["Software", "Information Technology", "Professional Services"],
    HealthTech: ["Health Care", "Biotechnology"],
    AI: ["Artificial Intelligence", "Software", "Science and Engineering"],
    Other: ["Software"],
  }
  return sanitizeJohnVCFocusAreas(map[sector])
}

function mapToStages(stage: FounderProfile["company"]["stage"]) {
  if (stage === "pre-seed") return ["Pre-Seed", "Seed"]
  if (stage === "seed") return ["Seed", "Series A"]
  return ["Series A", "Series B"]
}
