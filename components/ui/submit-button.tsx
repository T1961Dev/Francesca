"use client"

import { LoaderCircleIcon } from "lucide-react"
import { useFormStatus } from "react-dom"
import type { VariantProps } from "class-variance-authority"

import { Button, buttonVariants } from "@/components/ui/button"

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type" | "disabled"> &
  VariantProps<typeof buttonVariants> & {
    idleText: string
    pendingText?: string
  }

/** Standard submit button with pending lock + spinner for server actions. */
export function SubmitButton({
  idleText,
  pendingText,
  className,
  variant,
  size,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-label={pending ? pendingText ?? idleText : undefined}
      className={className}
      variant={variant}
      size={size}
      {...props}
    >
      {pending ? (
        <>
          <LoaderCircleIcon className="size-4 animate-spin" />
          {pendingText ?? idleText}
        </>
      ) : (
        idleText
      )}
    </Button>
  )
}

