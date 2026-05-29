import Link from "next/link"

import { requireAdmin } from "@/lib/admin/auth"

const NAV = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/lifetime", label: "Lifetime" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/costs", label: "Costs" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/failures", label: "Failures" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="grid h-svh min-h-0 grid-cols-[220px_1fr] overflow-hidden">
      <aside className="overflow-y-auto border-r border-border/55 bg-muted/30 p-4">
        <p className="mb-4 font-heading text-sm font-medium tracking-tight">Admin</p>
        <nav className="grid gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-h-0 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
