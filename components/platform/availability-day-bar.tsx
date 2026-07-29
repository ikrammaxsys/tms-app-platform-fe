"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { availabilityDayTooltipLines, isTimelineHourNotYetReached } from "@/lib/platform/view"
import type { AvailabilityDay, DayStatus } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const DAY_COLORS: Record<DayStatus, string> = {
  Healthy: "bg-emerald-500",
  Partial: "bg-amber-500",
  Down: "bg-red-500",
  NoData: "bg-slate-300 dark:bg-slate-700",
}

export function AvailabilityDayBar({
  day,
  className,
  muted = false,
}: {
  day: AvailabilityDay
  className?: string
  muted?: boolean
}) {
  const lines = availabilityDayTooltipLines(day)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "h-6 flex-1 cursor-default",
              DAY_COLORS[day.status],
              muted && "opacity-35",
              className,
            )}
          />
        }
      />
      <TooltipContent className="flex max-w-none flex-col items-start gap-0.5 px-3 py-2 text-left">
        <span className="font-semibold">{day.label}</span>
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

export function AvailabilityDayBarStrip({
  days,
  asOf,
}: {
  days: AvailabilityDay[]
  /** When set, hours after this instant render with lower opacity. */
  asOf?: string | null
}) {
  return (
    <TooltipProvider delay={200}>
      <div className="flex items-center gap-1">
        {days.map((day, index) => {
          const muted = asOf ? isTimelineHourNotYetReached(day.date, asOf) : false
          return (
            <AvailabilityDayBar
              key={`${day.date}-${day.label}-${index}`}
              day={day}
              muted={muted}
            />
          )
        })}
      </div>
    </TooltipProvider>
  )
}
