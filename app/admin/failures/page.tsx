import { AdminUserLink } from "@/components/admin/admin-user-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchProfilesByIds } from "@/lib/admin/queries"
import { createAdminClient } from "@/lib/supabase/admin"

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

const KIND_LABEL: Record<string, string> = {
  investor: "Investor match",
  deck: "Deck analysis",
  financial: "Financial model",
}

export default async function AdminFailuresPage() {
  const supabase = createAdminClient()
  const since = isoDaysAgo(30)

  const [{ data: jobs }, { data: analyses }, { data: models }] = await Promise.all([
    supabase
      .from("investor_matching_jobs")
      .select("id, user_id, error, created_at, status")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("deck_analyses")
      .select("id, user_id, error, created_at, status")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("financial_models")
      .select("id, user_id, error, created_at, status")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ])

  const failures = [
    ...((jobs ?? []).map((j) => ({ ...j, kind: "investor" as const }))),
    ...((analyses ?? []).map((a) => ({ ...a, kind: "deck" as const }))),
    ...((models ?? []).map((m) => ({ ...m, kind: "financial" as const }))),
  ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))

  const profileMap = await fetchProfilesByIds(
    supabase,
    failures.map((row) => (row.user_id ? String(row.user_id) : null))
  )

  const byKind = failures.reduce(
    (acc, row) => {
      acc[row.kind] = (acc[row.kind] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Failures</h1>
        <p className="mt-1 text-sm text-muted-foreground">Failed pipeline runs · last 30 days</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">{failures.length} total</Badge>
        <Badge variant="neutral">{byKind.deck ?? 0} deck</Badge>
        <Badge variant="neutral">{byKind.financial ?? 0} financial</Badge>
        <Badge variant="neutral">{byKind.investor ?? 0} investor</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{failures.length} failed runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 md:hidden">
            {failures.length ? (
              failures.map((row) => {
                const userId = row.user_id ? String(row.user_id) : null
                const profile = userId ? profileMap.get(userId) : null

                return (
                  <div
                    key={`${row.kind}-${String(row.id)}`}
                    className="rounded-lg border border-border/60 bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AdminUserLink profile={profile} userId={userId} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(String(row.created_at)).toLocaleString("en-GB")}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {KIND_LABEL[row.kind] ?? row.kind}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {String(row.error ?? "—")}
                    </p>
                  </div>
                )
              })
            ) : (
              <p className="py-4 text-sm text-muted-foreground">No failures in this period.</p>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.length ? (
                  failures.map((row) => {
                    const userId = row.user_id ? String(row.user_id) : null
                    const profile = userId ? profileMap.get(userId) : null

                    return (
                      <TableRow key={`${row.kind}-${String(row.id)}`}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(String(row.created_at)).toLocaleString("en-GB")}
                        </TableCell>
                        <TableCell>
                          <AdminUserLink profile={profile} userId={userId} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{KIND_LABEL[row.kind] ?? row.kind}</Badge>
                        </TableCell>
                        <TableCell className="max-w-lg">
                          <p className="line-clamp-2 text-sm">{String(row.error ?? "—")}</p>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No failures in this period.
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
