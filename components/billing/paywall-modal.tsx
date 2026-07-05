"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatPrice } from "@/lib/billing/currency"
import type { Currency, StripePlan } from "@/types/billing"

type LifetimeProbe = {
  currentCount: number
  maxCount: number
  remaining: number
  soldOut: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plans: StripePlan[]
  currency: Currency
  /** Optional path to return to after Stripe Checkout. */
  returnPath?: string
  /** Fires when the user dismisses (close button / Maybe later). */
  onDismiss?: () => void
}

export function PaywallModal({
  open,
  onOpenChange,
  plans,
  currency,
  returnPath,
  onDismiss,
}: Props) {
  const [lifetime, setLifetime] = useState<LifetimeProbe | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/stripe/checkout")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json?.success && json.data) setLifetime(json.data as LifetimeProbe)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  const visiblePlans = plans.filter((plan) => {
    if (plan.id === "lifetime" && lifetime?.soldOut) return false
    return true
  })

  async function choose(planId: StripePlan["id"]) {
    setBusyId(planId)
    setError(null)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, currency, returnPath }),
      })
      const json = await response.json()
      if (json.success && json.data?.url) {
        window.location.assign(json.data.url)
        return
      }
      setError(json.error ?? "Could not start checkout.")
    } catch {
      setError("Could not start checkout.")
    } finally {
      setBusyId(null)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && onDismiss) onDismiss()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Unlock your full analysis</DialogTitle>
          <DialogDescription>
            See exactly what investors will question.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {visiblePlans.map((plan) => {
            const price = plan.prices[currency]
            const suffix = plan.mode === "subscription" ? "/mo" : " once"
            const lifetimeBadge =
              plan.id === "lifetime" && lifetime
                ? `${lifetime.remaining} of ${lifetime.maxCount} remaining`
                : null
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-4 ${
                  plan.id === "pro" ? "ring-2 ring-primary/40" : "border-border/60"
                }`}
              >
                <p className="text-sm font-medium">{plan.name}</p>
                <p className="mt-1 text-2xl font-medium">
                  {formatPrice(price, currency)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {suffix}
                  </span>
                </p>
                {lifetimeBadge ? (
                  <p className="text-[11px] text-muted-foreground">{lifetimeBadge}</p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5">
                      <CheckIcon className="mt-0.5 size-3 stroke-[2]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  disabled={busyId !== null}
                  onClick={() => choose(plan.id)}
                >
                  {busyId === plan.id ? "Loading…" : `Choose ${plan.name}`}
                </Button>
              </div>
            )
          })}
        </div>

        <DialogFooter className="justify-center px-4 pb-4 sm:justify-center sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Maybe later
          </button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
