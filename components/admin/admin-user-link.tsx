import Link from "next/link"

import type { AdminProfileSummary } from "@/lib/admin/queries"
import { formatAdminUserLabel } from "@/lib/admin/queries"
import { cn } from "@/lib/utils"

function UserDisplay({
  profile,
  userId,
  className,
  showCompany = false,
  linked = true,
}: {
  profile?: AdminProfileSummary | null
  userId?: string | null
  className?: string
  showCompany?: boolean
  linked?: boolean
}) {
  const id = profile?.id ?? userId
  if (!id) {
    return <span className={cn("text-muted-foreground", className)}>Anonymous</span>
  }

  const primary = profile?.full_name || profile?.email || "Unknown user"
  const secondary = profile?.full_name && profile?.email ? profile.email : null

  const content = (
    <>
      <span
        className={cn(
          "truncate font-medium",
          linked && "underline-offset-4 group-hover:underline"
        )}
      >
        {primary}
      </span>
      {secondary ? (
        <span
          className={cn(
            "truncate text-xs text-muted-foreground",
            linked && "group-hover:text-primary/80"
          )}
        >
          {secondary}
        </span>
      ) : null}
      {showCompany && profile?.company_name ? (
        <span className="truncate text-xs text-muted-foreground">{profile.company_name}</span>
      ) : null}
    </>
  )

  if (!linked) {
    return <span className={cn("inline-flex min-w-0 flex-col text-left", className)}>{content}</span>
  }

  return (
    <Link
      href={`/admin/users/${id}`}
      className={cn(
        "group inline-flex min-w-0 flex-col text-left transition-colors hover:text-primary",
        className
      )}
    >
      {content}
    </Link>
  )
}

export function AdminUserLink(props: {
  profile?: AdminProfileSummary | null
  userId?: string | null
  className?: string
  showCompany?: boolean
  linked?: boolean
}) {
  return <UserDisplay {...props} linked={props.linked ?? true} />
}

export function AdminUserLabel({
  profile,
  userId,
}: {
  profile?: AdminProfileSummary | null
  userId?: string | null
}) {
  return <span>{formatAdminUserLabel(profile, userId)}</span>
}
