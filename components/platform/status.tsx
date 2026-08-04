import { cn } from "@/lib/utils"
import type { AppStatus, Environment } from "@/lib/platform/types"

type StatusLabelValue = AppStatus | "Healthy" | "Warning" | "Down" | "Inactive" | "Unknown"

const STATUS_STYLES: Record<StatusLabelValue, { dot: string; text: string }> = {
  Healthy: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  Warning: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  Down: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  Inactive: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  Unknown: { dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-600 dark:text-slate-400" },
  Operational: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  Degraded: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
}

export function StatusDot({ status }: { status: StatusLabelValue }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_STYLES[status].dot)}
      aria-hidden
    />
  )
}

export function StatusLabel({ status }: { status: StatusLabelValue }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", STATUS_STYLES[status].text)}>
      <StatusDot status={status} />
      {status}
    </span>
  )
}

const ENV_STYLES: Record<Environment, string> = {
  Live: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Test: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Development: "bg-primary/10 text-primary",
}

export function EnvironmentBadge({
  environment,
}: {
  environment: Environment | string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold",
        ENV_STYLES[environment as Environment] ?? "bg-muted text-muted-foreground",
      )}
    >
      {environment}
    </span>
  )
}

export function AppAvatar({
  initial,
  color,
  className,
}: {
  initial: string
  color: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initial}
    </span>
  )
}
