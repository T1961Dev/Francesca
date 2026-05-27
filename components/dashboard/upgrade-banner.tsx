import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function UpgradeBanner() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Upgrade to unlock full analyses, PDF exports, and investor outreach.
        </p>
        <Button asChild>
          <Link href="/pricing">Upgrade</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
