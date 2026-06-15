"use client"

import { useRouter } from "next/navigation"
import type { KeyboardEvent, ReactNode } from "react"

import { TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export function ClickableTableRow({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const router = useRouter()

  function navigate() {
    router.push(href)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      navigate()
    }
  }

  return (
    <TableRow
      role="link"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={onKeyDown}
      className={cn(
        "cursor-pointer border-l-2 border-l-transparent transition-colors hover:border-l-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </TableRow>
  )
}
