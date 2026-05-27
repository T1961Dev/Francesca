"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export function BillingActions({ hasCustomer }: { hasCustomer?: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function openPortal() {
    setError(null)
    setPending(true)
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" })
      const json = await response.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
        return
      }
      setError(json.error ?? "Could not open billing portal.")
    } catch {
      setError("Could not open billing portal.")
    } finally {
      setPending(false)
    }
  }

  if (!hasCustomer) {
    return (
      <p className="text-xs text-muted-foreground">
        Make a purchase before accessing the billing portal.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={openPortal} disabled={pending}>
        {pending ? "Opening…" : "Manage billing"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
