"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export function SidebarUpgradeCard({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <div className="rounded-xl border border-accent-foreground/10 bg-accent p-3.5 shadow-sm">
        <p className="text-[0.78rem] leading-snug text-muted-foreground">
          Your trial ends in{" "}
          <span className="font-medium text-accent-foreground">14 days</span>
        </p>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
          Upgrade to keep unlimited deck analysis and investor matching.
        </p>
        <Button asChild size="sm" className="mt-3 w-full">
          <Link href="/pricing">Upgrade to Pro</Link>
        </Button>
      </div>
    </div>
  )
}
