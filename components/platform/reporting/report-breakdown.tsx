"use client"

import { cn } from "@/lib/utils"
import type { BreakdownItem } from "@/lib/platform/reporting"

const BAR_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-teal-500",
]

export function ReportBreakdown({
  title,
  items,
  emptyLabel = "No data",
}: {
  title: string
  items: BreakdownItem[]
  emptyLabel?: string
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1)

  return (
    <div className="bg-card rounded-xl border">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 p-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyLabel}</p>
        ) : (
          items.map((item, index) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {item.count}{" "}
                  <span className="text-xs">({item.percent.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    BAR_COLORS[index % BAR_COLORS.length],
                  )}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ReportCheckSummary({
  totalChecks,
  upCount,
  degradedCount,
  downCount,
}: {
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
}) {
  const segments = [
    { label: "Up", count: upCount, color: "bg-emerald-500" },
    { label: "Degraded", count: degradedCount, color: "bg-amber-500" },
    { label: "Down", count: downCount, color: "bg-red-500" },
  ]
  const total = totalChecks || 1

  return (
    <div className="bg-card rounded-xl border">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Uptime check distribution</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {totalChecks.toLocaleString()} total checks across all applications
        </p>
      </div>
      <div className="p-4">
        <div className="mb-4 flex h-3 overflow-hidden rounded-full">
          {segments.map((seg) =>
            seg.count > 0 ? (
              <div
                key={seg.label}
                className={cn(seg.color, "min-w-0 transition-all")}
                style={{ width: `${(seg.count / total) * 100}%` }}
                title={`${seg.label}: ${seg.count}`}
              />
            ) : null,
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2"
            >
              <span className="inline-flex items-center gap-2 text-sm">
                <span className={cn("size-2.5 rounded-full", seg.color)} />
                {seg.label}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {seg.count.toLocaleString()}
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  ({totalChecks === 0 ? 0 : ((100 * seg.count) / totalChecks).toFixed(1)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
