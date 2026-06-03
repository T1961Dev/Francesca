import { redirectFromNotFound } from "@/lib/routing/not-found-redirect"

export default async function NotFound() {
  await redirectFromNotFound("/dashboard")
}
