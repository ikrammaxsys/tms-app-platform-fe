import { cn } from "@/lib/utils"
import type { AvailabilityDay } from "@/lib/platform/types"
import { isTimelineHourNotYetReached } from "@/lib/platform/view"
import { AvailabilityDayBarStrip } from "@/components/platform/availability-day-bar"

export function AvailabilityStrip({ days }: { days: AvailabilityDay[] }) {
  return (
    <div>
      <AvailabilityDayBarStrip days={days} />
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

export function DayTimeline({
  segments,
  asOf,
}: {
  segments: AvailabilityDay[]
  asOf?: string | null
}) {
  return (
    <div>
      <AvailabilityDayBarStrip days={segments} asOf={asOf} />
      <div className="text-muted-foreground mt-1 flex gap-1">
        {segments.map((seg, index) => {
          const muted = asOf ? isTimelineHourNotYetReached(seg.date, asOf) : false
          return (
            <span
              key={`${seg.date}-${index}`}
              className={cn(
                "flex-1 truncate text-center text-[0.6rem] leading-tight",
                muted && "opacity-35",
              )}
            >
              {seg.label.replace(":00", "")}
            </span>
          )
        })}
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
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-slate-300 dark:bg-slate-700" /> No data
        </span>
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
