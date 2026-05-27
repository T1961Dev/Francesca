"use client"

import { useState } from "react"
import { DownloadIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function FinancialExportButton({ modelId }: { modelId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportPdf() {
    if (loading) return

    setLoading(true)
    setError(null)

    const response = await fetch("/api/financial-model/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    })
    const json = await response.json()
    setLoading(false)

    if (!json.success) {
      setError(json.error ?? "Could not export PDF")
      return
    }

    if (json.data?.url) {
      window.open(json.data.url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        type="button"
        onClick={exportPdf}
        disabled={loading}
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
