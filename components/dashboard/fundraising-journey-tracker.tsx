"use client"

import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type JourneyStep = {
  id: string
  label: string
  shortLabel: string
  done: boolean
  href: string
}

export function FundraisingJourneyTracker({
  steps,
  currentStepId,
  title = "Fundraising Journey",
}: {
  steps: JourneyStep[]
  currentStepId: string
  title?: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {title}
      </p>
      <nav
        aria-label={title}
        className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
      >
        <ol className="flex min-w-max items-center gap-1 sm:min-w-0 sm:flex-wrap sm:gap-2">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStepId
            const isDone = step.done
            return (
              <li key={step.id} className="flex items-center gap-1 sm:gap-2">
                {index > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-0.5 hidden h-px w-4 sm:block sm:w-6",
                      isDone || isCurrent ? "bg-primary/40" : "bg-border"
                    )}
                  />
                ) : null}
                <Link
                  href={step.href}
                  className={cn(
                    "inline-flex min-h-9 max-w-[11rem] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left text-[0.7rem] font-medium transition-colors touch-manipulation sm:max-w-none sm:px-3 sm:text-xs",
                    isDone && "bg-primary/10 text-primary",
                    isCurrent && !isDone && "bg-foreground text-background",
                    !isDone && !isCurrent && "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem]",
                      isDone && "bg-primary text-primary-foreground",
                      isCurrent && !isDone && "bg-background/20 text-background",
                      !isDone && !isCurrent && "bg-background text-muted-foreground"
                    )}
                  >
                    {isDone ? <CheckIcon className="size-2.5 stroke-[2.5]" /> : index + 1}
                  </span>
                  <span className="truncate">
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
