import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { requireAdmin } from "@/lib/admin/auth"

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
      <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 md:p-6">
        {children}
      </main>
    </DashboardShell>
  )
}
