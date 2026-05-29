import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ScrollableListCard({
  title,
  description,
  headerAddon,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode
  description?: ReactNode
  headerAddon?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <CardHeader
        className={cn(
          "shrink-0",
          headerAddon ? "flex flex-row items-start justify-between gap-4" : undefined
        )}
      >
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {headerAddon}
      </CardHeader>
      <CardContent
        className={cn("min-h-0 flex-1 overflow-y-auto pb-6", contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  )
}
