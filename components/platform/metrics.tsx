import { cn } from "@/lib/utils"
import type { AvailabilityDay } from "@/lib/platform/types"
import { isTimelineHourNotYetReached } from "@/lib/platform/view"
import { AvailabilityDayBarStrip } from "@/components/platform/availability-day-bar"

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}

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
  labels,
  className,
  height = 64,
  compact = true,
}: {
  data: (number | null)[]
  labels?: string[]
  className?: string
  height?: number
  compact?: boolean
}) {
  const yTicks = compact ? [0, 50, 100] : [0, 25, 50, 75, 100]
  const showXLabels = !compact && Boolean(labels?.length)
  const plotHeight = height - (showXLabels ? 16 : 0)
  const xTickIndexes = showXLabels && labels ? pickSparklineAxisLabels(labels, 3) : []

  return (
    <div className={cn("flex gap-1.5", className)}>
      <div
        className="text-muted-foreground flex w-7 shrink-0 flex-col justify-between text-[9px] leading-none tabular-nums"
        style={{ height: plotHeight }}
      >
        {[...yTicks].reverse().map((tick) => (
          <span key={tick}>{tick}%</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="border-border relative border-b border-l"
          style={{ height: plotHeight }}
        >
          {yTicks.slice(1).map((tick) => (
            <div
              key={tick}
              className="border-border/60 pointer-events-none absolute right-0 left-0 border-t border-dashed"
              style={{ bottom: `${tick}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-px px-px pb-px">
            {data.map((value, index) => {
              const heightPct =
                value === null || value === undefined ? 0 : clampSparklinePercent(value)
              return (
                <span
                  key={index}
                  className={cn(
                    "min-w-0 flex-1 rounded-t-[2px]",
                    heightPct > 0
                      ? "bg-brand-blue dark:bg-brand-blue-light"
                      : "bg-muted-foreground/15",
                  )}
                  style={{
                    height: `${heightPct}%`,
                    minHeight: heightPct > 0 ? 2 : 0,
                  }}
                />
              )
            })}
          </div>
        </div>
        {showXLabels && (
          <div className="relative mt-0.5 h-3.5">
            {xTickIndexes.map(({ index, label }) => (
              <span
                key={`${index}-${label}`}
                className="text-muted-foreground absolute -translate-x-1/2 text-[9px]"
                style={{
                  left: `${(index / Math.max(data.length - 1, 1)) * 100}%`,
                }}
              >
                {label.replace(":00", "")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function clampSparklinePercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function pickSparklineAxisLabels(
  labels: string[],
  maxTicks = 5,
): { index: number; label: string }[] {
  if (labels.length === 0) return []
  if (labels.length <= maxTicks) {
    return labels.map((label, index) => ({ index, label }))
  }
  const step = Math.max(1, Math.round((labels.length - 1) / (maxTicks - 1)))
  const ticks: { index: number; label: string }[] = []
  for (let index = 0; index < labels.length; index += step) {
    ticks.push({ index, label: labels[index]! })
  }
  const last = labels.length - 1
  if (ticks[ticks.length - 1]?.index !== last) {
    ticks.push({ index: last, label: labels[last]! })
  }
  return ticks
}
