import { createHash } from "crypto"

import type { FounderProfile } from "@/types/profile"

export function hashProfile(profile: FounderProfile) {
  const stable = {
    sector: profile.company.sector,
    subSector: profile.company.subSector,
    stage: profile.company.stage,
    geography: profile.company.geography,
    businessModel: profile.company.businessModel,
  }

  return createHash("sha256")
    .update(JSON.stringify(stable))
    .digest("hex")
    .slice(0, 16)
}
