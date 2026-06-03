import { requireAuth } from "@/lib/auth"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  return children
}
