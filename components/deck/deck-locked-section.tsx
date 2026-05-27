import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DeckLockedSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unlock your full analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>See exactly what investors will question.</p>
        <ul className="ml-4 list-disc space-y-1 text-xs">
          <li>Per-dimension feedback with risks and fixes</li>
          <li>Missing sections, strengths, and weaknesses</li>
          <li>Priority actions before your next investor meeting</li>
          <li>Deck PDF export</li>
        </ul>
      </CardContent>
    </Card>
  )
}
