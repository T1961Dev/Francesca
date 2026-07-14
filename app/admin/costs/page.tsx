import Link from "next/link"

import { AdminKpi } from "@/components/admin/admin-kpi"
import { AdminUserLink } from "@/components/admin/admin-user-link"
import { ClickableTableRow } from "@/components/admin/clickable-table-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchProfilesByIds } from "@/lib/admin/queries"
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
    .select("user_id, provider, cost_usd, run_type, created_at")
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

  const byUser = new Map<string, { total: number; openai: number; apify: number }>()
  for (const row of costs ?? []) {
    const userId = row.user_id ? String(row.user_id) : "anonymous"
    const entry = byUser.get(userId) ?? { total: 0, openai: 0, apify: 0 }
    const cost = Number(row.cost_usd ?? 0)
    entry.total += cost
    if (row.provider === "openai") entry.openai += cost
    if (row.provider === "apify") entry.apify += cost
    byUser.set(userId, entry)
  }

  const topSpenders = [...byUser.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)

  const profileMap = await fetchProfilesByIds(
    supabase,
    topSpenders.map(([userId]) => (userId === "anonymous" ? null : userId))
  )

  const byRunType = (costs ?? []).reduce(
    (acc, row) => {
      const type = String(row.run_type ?? "unknown")
      acc[type] = (acc[type] ?? 0) + Number(row.cost_usd ?? 0)
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Costs</h1>
        <p className="mt-1 text-sm text-muted-foreground">API spend · last 30 days</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <AdminKpi label="Total" value={`$${totals.total.toFixed(2)}`} />
        <AdminKpi label="OpenAI" value={`$${totals.openai.toFixed(2)}`} />
        <AdminKpi label="Apify" value={`$${totals.apify.toFixed(2)}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AdminKpi
          label="Deck analysis"
          value={`$${(byRunType.deck_analysis ?? 0).toFixed(2)}`}
        />
        <AdminKpi
          label="Financial model"
          value={`$${(byRunType.financial_model ?? 0).toFixed(2)}`}
        />
        <AdminKpi
          label="Investor match"
          value={`$${(byRunType.investor_match ?? 0).toFixed(2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top spenders</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a user to view their profile and usage
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:hidden">
            {topSpenders.length ? (
              topSpenders.map(([userId, spend]) => {
                const profile = userId === "anonymous" ? null : profileMap.get(userId)
                const href = userId === "anonymous" ? null : `/admin/users/${userId}`
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {userId === "anonymous" ? (
                          <span className="text-sm text-muted-foreground">Anonymous / system</span>
                        ) : (
                          <AdminUserLink profile={profile} userId={userId} showCompany linked={false} />
                        )}
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {profile?.plan ?? "—"}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums">${spend.total.toFixed(2)}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                      OpenAI ${spend.openai.toFixed(2)} · Apify ${spend.apify.toFixed(2)}
                    </p>
                  </>
                )

                if (!href) {
                  return (
                    <div
                      key={userId}
                      className="rounded-lg border border-border/60 bg-card p-3"
                    >
                      {content}
                    </div>
                  )
                }

                return (
                  <Link
                    key={userId}
                    href={href}
                    className="block rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40"
                  >
                    {content}
                  </Link>
                )
              })
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No API costs recorded in this period.
              </p>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">OpenAI</TableHead>
                  <TableHead className="text-right">Apify</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSpenders.length ? (
                  topSpenders.map(([userId, spend]) => {
                    const profile = userId === "anonymous" ? null : profileMap.get(userId)
                    const href = userId === "anonymous" ? null : `/admin/users/${userId}`

                    if (!href) {
                      return (
                        <TableRow key={userId}>
                          <TableCell>
                            <span className="text-muted-foreground">Anonymous / system</span>
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right tabular-nums">
                            ${spend.openai.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            ${spend.apify.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            ${spend.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <ClickableTableRow key={userId} href={href}>
                        <TableCell>
                          <AdminUserLink
                            profile={profile}
                            userId={userId}
                            showCompany
                            linked={false}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground capitalize">
                          {profile?.plan ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${spend.openai.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${spend.apify.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ${spend.total.toFixed(2)}
                        </TableCell>
                      </ClickableTableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No API costs recorded in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
