import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ModuleCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button asChild variant="outline">
          <Link href={href}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
