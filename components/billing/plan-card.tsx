"use client"

import { useState } from "react"
import { CheckIcon, LoaderCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatPrice } from "@/lib/billing/currency"
import type { Currency, StripePlan } from "@/types/billing"

export function PlanCard({
  plan,
  currency,
  current,
  highlighted,
}: {
  plan: StripePlan
  currency: Currency
  current?: boolean
  highlighted?: boolean
}) {
  const [busy, setBusy] = useState(false)

  async function checkout() {
    if (busy) return
    setBusy(true)
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, currency }),
      })
      const json = await response.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
        return
      }
      if (json.error) {
        window.alert(json.error)
      }
      setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  const price = plan.prices[currency]
  const suffix = plan.mode === "subscription" ? "/mo" : " once"

  return (
    <Card
      className={
        current
          ? "bg-accent ring-accent-foreground/10"
          : highlighted
            ? "ring-2 ring-primary/40"
            : undefined
      }
    >
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.description}
            </p>
            <p className="mt-2 text-2xl font-medium">
              {formatPrice(price, currency)}
              <span className="text-sm font-normal text-muted-foreground">
                {suffix}
              </span>
            </p>
          </div>
          {current ? <Badge variant="accent">Current</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1.5">
          {plan.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-lg bg-card/75 px-2.5 py-1.5 text-xs"
            >
              <span className="flex size-5 items-center justify-center rounded-md bg-secondary">
                <CheckIcon className="size-3 stroke-[1.8]" />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          className="w-full"
          onClick={checkout}
          disabled={current || busy}
          variant={current ? "secondary" : "default"}
        >
          {busy ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Loading…
            </>
          ) : current ? (
            "Current plan"
          ) : (
            `Choose ${plan.name}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
