import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  SERVER_TIMELINE_DAY_OPTIONS,
  type ServerTimelineDays,
} from "@/lib/platform/queries"
import { cn } from "@/lib/utils"

const DAY_LABELS: Record<ServerTimelineDays, string> = {
  1: "1 day",
  7: "7 days",
  30: "30 days",
}

export function ServerMetricsDaysFilter({
  serverId,
  days,
  className,
}: {
  serverId: number
  days: ServerTimelineDays
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5",
        className,
      )}
      role="group"
      aria-label="Metrics time range"
    >
      {SERVER_TIMELINE_DAY_OPTIONS.map((option) => (
        <Button
          key={option}
          variant={days === option ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3"
          nativeButton={false}
          render={<Link href={`/servers/${serverId}?days=${option}`} />}
        >
          {DAY_LABELS[option]}
        </Button>
      ))}
    </div>
  )
}
