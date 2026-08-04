"use client"

import * as React from "react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EnvironmentBadge } from "@/components/platform/status"
import { tmsApi } from "@/lib/platform/api-service"
import { formatBytes } from "@/lib/platform/format"
import type { Environment, HostMetricsTimeline, Server } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function progressTone(value: number | null): string {
  if (value === null) return "bg-muted-foreground/30"
  if (value >= 90) return "bg-red-500"
  if (value >= 75) return "bg-amber-500"
  return "bg-brand-blue dark:bg-brand-blue-light"
}

export function ResourceProgressBar({
  label,
  value,
  detail,
  className,
}: {
  label: string
  value: number | null
  detail?: string
  className?: string
}) {
  const width = value === null ? 0 : clampPercent(value)

  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold tabular-nums">
          {value === null ? "—" : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", progressTone(value))}
          style={{ width: `${width}%` }}
        />
      </div>
      {detail ? (
        <p className="text-muted-foreground mt-1 text-[0.65rem] tabular-nums">{detail}</p>
      ) : null}
    </div>
  )
}

function ServerResourceCard({
  server,
  timeline,
}: {
  server: Server
  timeline: HostMetricsTimeline | null
}) {
  const ram = timeline?.currentRam
  const disk = timeline?.currentDisk

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-tight">
          <Link href={`/servers/${server.id}`} className="hover:text-primary hover:underline">
            {server.domain}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground mt-0.5 font-mono text-xs">{server.ipAddress}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <EnvironmentBadge environment={server.environment as Environment} />
          <span className="text-muted-foreground text-xs">{server.provider}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResourceProgressBar
          label="CPU"
          value={timeline ? timeline.currentCpuUsage : null}
        />
        <ResourceProgressBar
          label="Memory"
          value={ram ? ram.usagePercent : null}
          detail={
            ram ? `${formatBytes(ram.usedBytes)} / ${formatBytes(ram.totalBytes)} used` : undefined
          }
        />
        <ResourceProgressBar
          label="Disk"
          value={disk ? disk.usagePercent : null}
          detail={
            disk
              ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)} used`
              : undefined
          }
        />
      </CardContent>
    </Card>
  )
}

function ServerResourceCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export function ServersResourceOverview({
  servers,
  refreshKey = 0,
}: {
  servers: Server[]
  refreshKey?: number
}) {
  const [loading, setLoading] = React.useState(true)
  const [metricsByServerId, setMetricsByServerId] = React.useState<
    Map<number, HostMetricsTimeline | null>
  >(new Map())

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      if (servers.length === 0) {
        if (!cancelled) {
          setMetricsByServerId(new Map())
          setLoading(false)
        }
        return
      }

      const entries = await Promise.all(
        servers.map(async (server) => {
          try {
            const timeline = await tmsApi.getServerHostTimeline(server.id, 1)
            return [server.id, timeline] as const
          } catch {
            return [server.id, null] as const
          }
        }),
      )

      if (!cancelled) {
        setMetricsByServerId(new Map(entries))
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [servers, refreshKey])

  if (servers.length === 0) {
    return null
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading
          ? servers.map((server) => <ServerResourceCardSkeleton key={server.id} />)
          : servers.map((server) => (
              <ServerResourceCard
                key={server.id}
                server={server}
                timeline={metricsByServerId.get(server.id) ?? null}
              />
            ))}
    </div>
  )
}
