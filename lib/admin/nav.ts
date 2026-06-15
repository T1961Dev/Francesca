import type { AdminNavItem } from "@/components/nav-admin"

/** Sidebar links for `/admin/*` — keep in sync with `app/admin/` routes. */
export const ADMIN_NAV_ITEMS: Omit<AdminNavItem, "icon">[] = [
  { title: "Users", url: "/admin/users" },
  { title: "Lifetime", url: "/admin/lifetime" },
  { title: "Revenue", url: "/admin/revenue" },
  { title: "Costs", url: "/admin/costs" },
  { title: "Funnel", url: "/admin/funnel" },
  { title: "Failures", url: "/admin/failures" },
]
