import { createHash } from "node:crypto"

export function createCacheKey(parts: unknown[]) {
  const hash = createHash("sha256")
  hash.update(JSON.stringify(parts))
  return hash.digest("hex")
}
