import { cn } from "@/lib/utils"
import type { AvailabilityDay } from "@/lib/platform/types"
import type { HourSegment } from "@/lib/platform/queries"

const DAY_COLORS = {
  Healthy: "bg-emerald-500",
  Partial: "bg-amber-500",
  Down: "bg-red-500",
}

export function AvailabilityStrip({ days }: { days: AvailabilityDay[] }) {
  return (
    <div>
      <div className="flex gap-0.5">
        {days.map((day) => (
          <span
            key={day.date}
            title={`${day.label}: ${day.status}`}
            className={cn("h-7 flex-1 rounded-[2px]", DAY_COLORS[day.status])}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-1.5 flex justify-between text-xs">
        <span>{days[0]?.label}</span>
        <span>{days[days.length - 1]?.label}</span>
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-emerald-500" /> Healthy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-amber-500" /> Partial
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-red-500" /> Down
        </span>
      </div>
    </div>
  )
}

export function DayTimeline({ segments }: { segments: HourSegment[] }) {
  return (
    <div>
      <div className="grid grid-cols-12 gap-1">
        {segments.map((seg) => (
          <span
            key={seg.hour}
            title={`${seg.hour}:00 — ${seg.status}`}
            className={cn(
              "h-5 rounded",
              seg.status === "Healthy" ? "bg-emerald-500" : "bg-red-500",
            )}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-1 grid grid-cols-12 gap-1 text-center text-[0.65rem]">
        {segments.map((seg) => (
          <span key={seg.hour}>{seg.hour}</span>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({
  data,
  className,
}: {
  data: number[]
  className?: string
}) {
  const max = Math.max(...data, 1)
  return (
    <div className={cn("flex h-16 items-end gap-1", className)}>
      {data.map((value, i) => (
        <span
          key={i}
          className="bg-primary/50 min-h-[8%] flex-1 rounded-t-[2px]"
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  )
}
