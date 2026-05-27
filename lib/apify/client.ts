import "server-only"

import { ApifyClient } from "apify-client"

let singleton: ApifyClient | null = null

export function getApifyClient() {
  const token = process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN

  if (!token) {
    throw new Error("Missing APIFY_TOKEN")
  }

  singleton ??= new ApifyClient({
    token,
  })

  return singleton
}

export const apify = {
  actor: (...args: Parameters<ApifyClient["actor"]>) => getApifyClient().actor(...args),
  dataset: (...args: Parameters<ApifyClient["dataset"]>) => getApifyClient().dataset(...args),
  run: (...args: Parameters<ApifyClient["run"]>) => getApifyClient().run(...args),
}
