import { cn } from "@/lib/utils"
import type { AgentStatus } from "@/lib/platform/types"

const STATUS_STYLES: Record<
  AgentStatus,
  { dot: string; text: string; label: string }
> = {
  pending: {
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    label: "Pending install",
  },
  installed: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Installed",
  },
  ready: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Ready",
  },
  offline: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    label: "Offline",
  },
  disconnected: {
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    label: "Disconnected",
  },
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-semibold",
        style.text,
      )}
    >
      <span
        className={cn("inline-block size-2 shrink-0 rounded-full", style.dot)}
        aria-hidden
      />
      {style.label}
    </span>
  )
}
