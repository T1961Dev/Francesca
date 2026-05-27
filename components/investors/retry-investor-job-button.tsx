"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export function RetryInvestorJobButton({
  jobId,
  size = "sm",
  variant = "outline",
  label = "Retry",
}: {
  jobId: string
  size?: "sm" | "default" | "lg"
  variant?: "outline" | "default" | "secondary"
  label?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function retry() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/investors/retry/${encodeURIComponent(jobId)}`, {
        method: "POST",
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not retry")
        return
      }
      router.refresh()
    } catch {
      setError("Could not retry")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size={size} variant={variant} onClick={retry} disabled={pending}>
        {pending ? "Retrying…" : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
