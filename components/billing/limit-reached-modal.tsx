"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Plan } from "@/types/app"

export type LimitReachedPayload = {
  error: "limit_reached"
  action: "deck_upload" | "financial_model_run" | "investor_match_run"
  limit_type: "deck_uploads" | "financial_models" | "investor_matches"
  current: number
  max: number
  resets_at: string | null
  plan: Plan
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: LimitReachedPayload | null
  /** Optional support email for Lifetime users. */
  supportEmail?: string
  onUpgradeClick?: () => void
}

const ACTION_LABEL: Record<LimitReachedPayload["limit_type"], string> = {
  deck_uploads: "deck uploads",
  financial_models: "financial model runs",
  investor_matches: "investor match runs",
}

export function LimitReachedModal({
  open,
  onOpenChange,
  payload,
  supportEmail,
  onUpgradeClick,
}: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [open])

  if (!payload) return null

  const label = ACTION_LABEL[payload.limit_type]
  const resetsAt = payload.resets_at ? new Date(payload.resets_at) : null
  const resetsLabel = resetsAt
    ? resetsAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  // Variants per plan.
  const variant: "free" | "subscription" | "lifetime" =
    payload.plan === "free"
      ? "free"
      : payload.plan === "lifetime"
        ? "lifetime"
        : "subscription"
  const freeDeckUploadUsed =
    payload.plan === "free" && payload.limit_type === "deck_uploads"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {freeDeckUploadUsed
              ? "Free analysis used"
              : variant === "free"
              ? "Upgrade to keep going"
              : variant === "lifetime"
                ? "Monthly cap reached"
                : "You've used your monthly allowance"}
          </DialogTitle>
          <DialogDescription>
            {freeDeckUploadUsed ? (
              <>You&apos;ve used your free analysis. Upgrade to upload again.</>
            ) : variant === "free" ? (
              <>You&apos;ve used your free {label}. Upgrade to keep going.</>
            ) : variant === "lifetime" ? (
              <>
                You&apos;ve used your {payload.max} {label} this month.
                {resetsLabel ? ` Resets on ${resetsLabel}.` : ""}
              </>
            ) : (
              <>
                You&apos;ve used your {payload.max} {label} this month.
                {resetsLabel ? ` Limit resets on ${resetsLabel}.` : ""}
                {payload.plan === "starter"
                  ? " Upgrade to Pro for more."
                  : ""}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="text-xs text-muted-foreground">
          {variant !== "lifetime" ? (
            <p>
              Used {Math.min(payload.current, payload.max)} of {payload.max} this{" "}
              {payload.resets_at ? "month" : "account"}.
            </p>
          ) : null}
          {variant === "lifetime" && supportEmail ? (
            <p>
              Need more headroom?{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {supportEmail}
              </a>
            </p>
          ) : null}
          {/* Suppress unused state warning while preserving live ticking. */}
          <span className="hidden" data-now={now.toISOString()} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {variant !== "lifetime" && (payload.plan === "free" || payload.plan === "starter") ? (
            <Button
              onClick={() => {
                if (onUpgradeClick) onUpgradeClick()
                else window.location.assign("/dashboard/billing")
              }}
            >
              {payload.plan === "free" ? "See plans" : "Upgrade to Pro"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
