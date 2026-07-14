import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchLifetimeInventoryAdmin } from "@/lib/stripe/lifetime-inventory"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminLifetimePage() {
  const inventory = await fetchLifetimeInventoryAdmin()
  const supabase = createAdminClient()
  const { data: customers } = await supabase
    .from("profiles")
    .select("id, email, lifetime_purchased_at, full_name")
    .eq("plan", "lifetime")
    .order("lifetime_purchased_at", { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl font-medium tracking-tight">Lifetime</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {inventory.currentCount} / {inventory.maxCount} sold
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[20rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Purchased</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers ?? []).map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell>{String(c.email ?? "—")}</TableCell>
                  <TableCell>{String(c.full_name ?? "—")}</TableCell>
                  <TableCell>
                    {c.lifetime_purchased_at
                      ? new Date(String(c.lifetime_purchased_at)).toLocaleDateString("en-GB")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
