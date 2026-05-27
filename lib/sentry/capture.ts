import "server-only"

import * as Sentry from "@sentry/nextjs"

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  })
}
