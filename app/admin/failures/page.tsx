import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminFailuresPage() {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

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

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Failures (last 30 days)</h1>
      <Card>
        <CardHeader>
          <CardTitle>{failures.length} failed runs</CardTitle>
        </CardHeader>
        <CardContent>
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
              {failures.map((row) => (
                <TableRow key={`${row.kind}-${String(row.id)}`}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(String(row.created_at)).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell>{String(row.user_id ?? "—").slice(0, 8)}</TableCell>
                  <TableCell>{row.kind}</TableCell>
                  <TableCell className="max-w-md truncate">{String(row.error ?? "—")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
