import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { requireAuth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <DashboardShell
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
