"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function DangerZone() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/me/delete", { method: "POST" })
      const json = await response.json().catch(() => null)
      if (!response.ok || json?.success === false) {
        setError(json?.error ?? "Could not delete")
        return
      }
      window.location.assign("/login?error=Account+deleted")
    } catch {
      setError("Could not delete")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download a full export of your account, or permanently delete your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href="/api/me/export"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm shadow-xs hover:bg-muted"
          >
            Download my data
          </a>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data immediately.
              Any active subscription is cancelled first. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
