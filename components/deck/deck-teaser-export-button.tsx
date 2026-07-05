"use client"

import { useState } from "react"
import { FileTextIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openExportUrl } from "@/lib/download/open-url"
import { cn } from "@/lib/utils"

export function DeckTeaserExportButton({
  analysisId,
  label = "Make 1-page teaser",
  size = "default",
  variant = "secondary",
  className,
}: {
  analysisId: string
  label?: string
  size?: "default" | "sm"
  variant?: "default" | "secondary" | "outline"
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportTeaser() {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/deck/export-teaser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      })
      const json = await response.json()

      if (!json.success || !json.data?.url) {
        setError(json.error ?? "Could not create teaser")
        return
      }

      openExportUrl(json.data.url)
    } catch {
      setError("Could not create teaser")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={exportTeaser}
        disabled={loading}
        className={cn("touch-manipulation", className)}
      >
        {loading ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <>
            <FileTextIcon data-icon="inline-start" />
            {label}
          </>
        )}
      </Button>
      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
