import Link from "next/link"

import { ClickableTableRow } from "@/components/admin/clickable-table-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createAdminClient } from "@/lib/supabase/admin"

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; plan?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""
  const page = Math.max(1, Number(params.page ?? "1") || 1)
  const plan = params.plan?.trim() ?? ""
  const supabase = createAdminClient()

  let query = supabase
    .from("profiles")
    .select("id, email, plan, created_at, deleted_at, full_name, company_name", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (q) query = query.ilike("email", `%${q}%`)
  if (plan) query = query.eq("plan", plan)

  const { data: users, count } = await query
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  function pageHref(nextPage: number) {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (plan) sp.set("plan", plan)
    sp.set("page", String(nextPage))
    return `/admin/users?${sp.toString()}`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Click any row to open user details</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{count ?? 0} total</CardTitle>
          <form className="mt-2 flex flex-wrap items-center gap-2">
            <Input name="q" placeholder="Search email" defaultValue={q} className="max-w-sm" />
            <select
              name="plan"
              defaultValue={plan}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="lifetime">Lifetime</option>
            </select>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => (
                <ClickableTableRow key={String(user.id)} href={`/admin/users/${user.id}`}>
                  <TableCell className="font-medium">{String(user.email ?? "—")}</TableCell>
                  <TableCell>{String(user.full_name ?? "—")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {String(user.company_name ?? "—")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.plan === "free" ? "neutral" : "default"}>{String(user.plan)}</Badge>
                    {user.deleted_at ? (
                      <Badge variant="destructive" className="ml-2">
                        Deleted
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(String(user.created_at)).toLocaleDateString("en-GB")}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
          {count && count > PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageHref(page - 1)}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageHref(page + 1)}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
