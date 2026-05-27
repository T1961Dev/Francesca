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

    await fetch(`/api/investors/cancel/${jobId}`, {
      method: "POST",
    }).catch(() => null)

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
