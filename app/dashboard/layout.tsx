import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { requireAuth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <DashboardShell
      isAdmin={isAdminEmail(user.email)}
      initialUser={{
        id: user.id,
        email: user.email?.trim() ?? "",
        userMetadata: user.user_metadata ?? null,
      }}
    >
      {children}
    </DashboardShell>
  )
}
