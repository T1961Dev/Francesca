"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export function CancelInvestorJobButton({
  jobId,
  size = "sm",
}: {
  jobId: string
  size?: "sm" | "default"
}) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  async function cancelJob() {
    if (cancelling) return
    setCancelling(true)

    try {
      const res = await fetch(`/api/investors/cancel/${jobId}`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        window.alert(body?.error ?? "Failed to cancel job. Please try again.")
      }
    } catch {
      window.alert("Network error. Please check your connection and try again.")
    }

    router.refresh()
    setCancelling(false)
  }

  return (
    <Button
      type="button"
      size={size}
      variant="destructive"
      onClick={cancelJob}
      disabled={cancelling}
    >
      {cancelling ? "Cancelling..." : "Cancel"}
    </Button>
  )
}
