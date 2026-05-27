"use client"

import posthog from "posthog-js"

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!key || posthog.__loaded) {
    return posthog
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: "history_change",
  })

  return posthog
}
