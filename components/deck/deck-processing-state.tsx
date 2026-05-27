import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export function DeckProcessingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing deck</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={65} />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}
