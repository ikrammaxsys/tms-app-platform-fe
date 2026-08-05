"use client"

import { cn } from "@/lib/utils"

export function ReportStatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "blue",
}: {
  label: string
  value: string | number
  meta?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  tone?: "blue" | "green" | "purple" | "red" | "amber"
}) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {meta ? (
            <div className="text-muted-foreground mt-1 text-xs">{meta}</div>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
    </div>
  )
}
