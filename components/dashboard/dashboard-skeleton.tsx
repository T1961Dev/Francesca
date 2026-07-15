import { dashboardPageMainClass } from "@/lib/dashboard/page-classes"

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />
}

export function DashboardPageSkeleton() {
  return (
    <div className={dashboardPageMainClass}>
      <div className="space-y-2">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72" />
      </div>
      <Bone className="h-32 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Bone className="h-28" />
        <Bone className="h-28" />
        <Bone className="h-28" />
      </div>
    </div>
  )
}

export function DashboardDetailSkeleton() {
  return (
    <div className={dashboardPageMainClass}>
      <div className="space-y-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-80" />
      </div>
      <Bone className="h-40 w-full" />
      <Bone className="min-h-[20rem] w-full flex-1" />
    </div>
  )
}

export function DashboardFormSkeleton() {
  return (
    <div className={dashboardPageMainClass}>
      <div className="space-y-2">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-80" />
      </div>
      <Bone className="h-32 w-full" />
      <Bone className="min-h-[24rem] w-full flex-1" />
    </div>
  )
}
