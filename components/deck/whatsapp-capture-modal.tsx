"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
  onUpgradeInstead: () => void
}

export function WhatsAppCaptureModal({
  open,
  onOpenChange,
  onContinue,
  onUpgradeInstead,
}: Props) {
  const [number, setNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    setError(null)
    setPending(true)
    try {
      const response = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
      })
      const json = await response.json()
      if (!json.success) {
        setError(json.error ?? "Could not save number")
        return
      }
      onOpenChange(false)
      onContinue()
    } catch {
      setError("Could not save number")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You&apos;ve used your free analysis</DialogTitle>
          <DialogDescription>
            Get one more free analysis by adding your WhatsApp number — or upgrade for unlimited uploads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            type="tel"
            value={number}
            onChange={(event) => setNumber(event.currentTarget.value)}
            placeholder="+44 7…"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Include the country code. We only message you for important account events.
          </p>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" type="button" onClick={onUpgradeInstead} disabled={pending}>
            Upgrade instead
          </Button>
          <Button onClick={submit} disabled={pending || !number.trim()}>
            {pending ? "Saving…" : "Get my second analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
