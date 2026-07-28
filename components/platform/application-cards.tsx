"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { AppAvatar, StatusLabel } from "@/components/platform/status"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/platform/format"
import { availabilityDays } from "@/lib/platform/view"
import type { ApplicationView } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const TIMELINE_STYLES = {
  Healthy: "bg-emerald-500",
  Partial: "bg-amber-500",
  Down: "bg-red-500",
} as const

function TimelineBox({ day }: { day: { status: "Healthy" | "Partial" | "Down" } }) {
  return <div className={cn("h-6 flex-1", TIMELINE_STYLES[day.status])} />
}

export function ApplicationCards({
  applications,
  loading = false,
}: {
  applications: ApplicationView[]
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-2 h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
        <div>
          <p className="text-sm font-semibold">No applications</p>
          <p className="text-muted-foreground mt-1 text-sm">
            No applications match the current filters.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {applications.map((app) => {
        const week = availabilityDays(app).slice(-30)
        const uptime = Math.round(
          (week.filter((day) => day.status === "Healthy").length / week.length) * 100,
        )

        return (
          <Card key={app.id} className="group transition-colors hover:border-primary/40">
            <CardHeader className="pb-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/applications/${app.id}`}
                      className="truncate font-semibold hover:underline"
                    >
                      {app.name} ( {app.version} )
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {app.applicationGroupName || "Application"}
                    </p>
                  </div>
                </div>
                 <div>
                  <p className="text-muted-foreground text-xs">Live status</p>
                  <StatusLabel status={app.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 rounded-lg border bg-muted/25 p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">30-day uptime</span>
                  <span className="font-semibold text-foreground">{uptime}%</span>
                </div>
                <div className="flex items-center gap-1">
                  {week.map((day, index) => (
                    <TimelineBox key={`${app.id}-${day.label}-${index}`} day={day} />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{app.serverDomain}</p>
                  <p className="text-muted-foreground text-[11px]">{app.serverEnvironment}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[11px]">Last deployment</p>
                  <p className="text-[11px] font-medium">{formatDateTime(app.lastDeployment)}</p>
                </div>
              </div>

              <Link
                href={`/applications/${app.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View details
                <ArrowUpRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
