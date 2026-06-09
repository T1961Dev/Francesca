import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createAdminClient } from "@/lib/supabase/admin"

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

export default async function AdminCostsPage() {
  const supabase = createAdminClient()
  const since = isoDaysAgo(30)

  const { data: costs } = await supabase
    .from("api_costs")
    .select("user_id, provider, cost_usd, created_at")
    .gte("created_at", since)

  const totals = (costs ?? []).reduce(
    (acc, row) => {
      const cost = Number(row.cost_usd ?? 0)
      acc.total += cost
      if (row.provider === "openai") acc.openai += cost
      if (row.provider === "apify") acc.apify += cost
      return acc
    },
    { total: 0, openai: 0, apify: 0 }
  )

  const byUser = new Map<string, number>()
  for (const row of costs ?? []) {
    const userId = String(row.user_id ?? "anonymous")
    byUser.set(userId, (byUser.get(userId) ?? 0) + Number(row.cost_usd ?? 0))
  }

  const topSpenders = [...byUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Costs (last 30 days)</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <KPI label="Total" value={`$${totals.total.toFixed(2)}`} />
        <KPI label="OpenAI" value={`$${totals.openai.toFixed(2)}`} />
        <KPI label="Apify" value={`$${totals.apify.toFixed(2)}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top spenders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSpenders.map(([userId, total]) => (
                <TableRow key={userId}>
                  <TableCell>{userId.slice(0, 8)}</TableCell>
                  <TableCell>${total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
