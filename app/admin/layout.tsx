import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { ensureProfile } from "@/lib/auth"
import { requireAdmin } from "@/lib/admin/auth"
import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const profile = await ensureProfile(undefined, { user })
  const authEmail = user.email?.trim() ?? ""

  return (
    <DashboardShell
      isAdmin
      initialUser={{
        id: user.id,
        email: authEmail,
        userMetadata: user.user_metadata ?? null,
      }}
      initialProfile={{
        full_name: profile.full_name ?? null,
        company_name: profile.company_name ?? null,
        plan: profile.plan ?? "free",
        email: profile.email ?? authEmail ?? null,
      }}
    >
      <main className={dashboardPageMainClass}>
        {children}
      </main>
    </DashboardShell>
  )
}
