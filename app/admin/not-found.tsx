import { redirectFromNotFound } from "@/lib/routing/not-found-redirect"

export default async function AdminNotFound() {
  await redirectFromNotFound("/admin")
}
