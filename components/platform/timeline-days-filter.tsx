"use client"

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

export function TimelineDaysFilter({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: ServerTimelineDays
  onChange: (days: ServerTimelineDays) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5",
        className,
      )}
      role="group"
      aria-label="Time range"
    >
      {SERVER_TIMELINE_DAY_OPTIONS.map((option) => (
        <Button
          key={option}
          type="button"
          variant={value === option ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3"
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {DAY_LABELS[option]}
        </Button>
      ))}
    </div>
  )
}
