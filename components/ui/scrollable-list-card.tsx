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
    <Card className={cn("flex flex-col", className)}>
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
        className={cn("pb-6 md:min-h-0 md:flex-1 md:overflow-y-auto", contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  )
}
