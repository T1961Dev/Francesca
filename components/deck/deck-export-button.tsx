"use client"

import { useState } from "react"
import { DownloadIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { openExportUrl } from "@/lib/download/open-url"

export function DeckExportButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportPdf() {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/deck/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      })
      const json = await response.json()

      if (!json.success || !json.data?.url) {
        setError(json.error ?? "Could not export PDF")
        return
      }

      openExportUrl(json.data.url)
    } catch {
      setError("Could not export PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        type="button"
        onClick={exportPdf}
        disabled={loading}
        className="touch-manipulation"
        aria-label={loading ? "Exporting PDF" : undefined}
      >
        {loading ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <>
            <DownloadIcon data-icon="inline-start" />
            Export PDF
          </>
        )}
      </Button>
    </div>
  )
}
