import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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
    .select("id, email, plan, created_at, deleted_at, full_name", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (q) query = query.ilike("email", `%${q}%`)
  if (plan) query = query.eq("plan", plan)

  const { data: users, count } = await query

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>{count ?? 0} total</CardTitle>
          <form className="mt-2 flex flex-wrap gap-2">
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
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => (
                <TableRow key={String(user.id)}>
                  <TableCell>{String(user.email ?? "—")}</TableCell>
                  <TableCell>{String(user.full_name ?? "—")}</TableCell>
                  <TableCell>
                    <Badge variant={user.plan === "free" ? "neutral" : "default"}>{String(user.plan)}</Badge>
                    {user.deleted_at ? (
                      <Badge variant="destructive" className="ml-2">
                        Deleted
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {new Date(String(user.created_at)).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm underline underline-offset-4 hover:text-foreground"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {count && count > PAGE_SIZE ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Page {page} of {Math.ceil(count / PAGE_SIZE)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
