import { redirectFromNotFound } from "@/lib/routing/not-found-redirect"

export default async function DashboardNotFound() {
  await redirectFromNotFound("/dashboard")
}
