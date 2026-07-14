"use client"

import type { MouseEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const DECK_IMPROVED_COOKIE = "rw_deck_improved"

type WorkspaceChecklistItem = {
  id: string
  label: string
  done: boolean
  href: string
}

type NextAction = {
  eyebrow: string
  title: string
  description: string
  detail?: string | null
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string; acknowledgeImprove?: boolean }
}

function acknowledgeImprove() {
  document.cookie = `${DECK_IMPROVED_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`
}

export function WorkspaceProgressCard({
  items,
  profileComplete,
}: {
  items: WorkspaceChecklistItem[]
  profileComplete: boolean
}) {
  return (
    <Card size="sm" className="justify-between">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Workspace progress
          </p>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-1 py-1 text-sm transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                      item.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    )}
                    aria-hidden
                  >
                    {item.done ? <CheckIcon className="size-2.5 stroke-[3]" /> : null}
                  </span>
                  <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <div className="mx-5 mb-5 rounded-lg border border-accent-foreground/10 bg-accent p-4">
        <p className="text-[0.8rem] font-medium text-foreground">
          {profileComplete ? "Founder profile ready" : "Complete your founder profile"}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-accent-foreground/85">
          Your profile helps RaiseWise personalise every recommendation and investor match.
        </p>
        <Button asChild size="xs" className="mt-2.5">
          <Link href="/dashboard/settings">
            {profileComplete ? "Review profile" : "Complete profile"}
          </Link>
        </Button>
      </div>
    </Card>
  )
}

export function NextStepActions({ action }: { action: NextAction }) {
  const router = useRouter()

  function onSecondaryClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!action.secondaryCta?.acknowledgeImprove) return
    event.preventDefault()
    acknowledgeImprove()
    router.push(action.secondaryCta.href)
    router.refresh()
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        asChild
        variant="secondary"
        className="bg-[#F0E6D5] text-[#1A1410] shadow-none hover:bg-[#E8DCC6] focus-visible:ring-[#F7F0E6]/30"
      >
        <Link href={action.cta.href}>{action.cta.label}</Link>
      </Button>
      {action.secondaryCta ? (
        <Button
          asChild
          variant="ghost"
          className="text-[#F7F0E6] hover:bg-white/10 hover:text-[#F7F0E6]"
        >
          <Link href={action.secondaryCta.href} onClick={onSecondaryClick}>
            {action.secondaryCta.label}
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
