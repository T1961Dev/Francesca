import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { requireAdmin } from "@/lib/admin/auth"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()

  return (
    <DashboardShell
      isAdmin
      initialUser={{
        id: user.id,
        email: user.email?.trim() ?? "",
        userMetadata: user.user_metadata ?? null,
      }}
    >
      <main className={dashboardPageMainClass}>
        {children}
      </main>
    </DashboardShell>
  )
}
