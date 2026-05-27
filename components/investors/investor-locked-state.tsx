import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function InvestorLockedState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor outreach locked</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Upgrade to Pro to unlock all 25 ranked investors, rationales, and outreach templates.
        </p>
        <Button asChild>
          <Link href="/pricing">Upgrade</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
