"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export function InvestorExportButtons({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function exportCsv() {
    setBusy("csv")
    setError(null)
    try {
      const response = await fetch(
        `/api/investors/export-csv?jobId=${encodeURIComponent(jobId)}`,
        { method: "POST" }
      )
      if (!response.ok) {
        const json = await response.json().catch(() => null)
        setError(json?.error ?? "Export failed")
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `raisewise-investors-${jobId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Export failed")
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy("pdf")
    setError(null)
    try {
      const response = await fetch(
        `/api/investors/export-pdf?jobId=${encodeURIComponent(jobId)}`,
        { method: "POST" }
      )
      const json = await response.json()
      if (!json.success || !json.data?.url) {
        setError(json.error ?? "Export failed")
        return
      }
      window.open(json.data.url, "_blank", "noopener")
    } catch {
      setError("Export failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportCsv} disabled={busy !== null}>
        {busy === "csv" ? "Exporting…" : "Export CSV"}
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={busy !== null}>
        {busy === "pdf" ? "Exporting…" : "Export PDF"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
