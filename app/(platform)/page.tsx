"use client"

import * as React from "react"
import Link from "next/link"
import { Activity, Bell, Boxes, Server } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApplicationsTable } from "@/components/platform/applications-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { StatusDot } from "@/components/platform/status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import { formatDateTime } from "@/lib/platform/format"
import { toApplicationView } from "@/lib/platform/view"
import type { ApplicationView, AppStatus, Server as ServerType } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  meta: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  tone: "blue" | "green" | "purple" | "red"
}) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  }
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          <div className="text-muted-foreground mt-1 text-xs">{meta}</div>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [apps, setApps] = React.useState<ApplicationView[]>([])
  const [servers, setServers] = React.useState<ServerType[]>([])
  const [fetchedAt, setFetchedAt] = React.useState<string>("")
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [applicationItems, serverItems] = await Promise.all([
          tmsApi.listApplications(),
          tmsApi.listServers(),
        ])
        if (cancelled) return
        const byId = new Map((serverItems ?? []).map((s) => [s.id, s]))
        setApps(
          (applicationItems ?? [])
            .map((a) => toApplicationView(a, byId.get(a.serverId)))
            .sort((a, b) => a.name.localeCompare(b.name)),
        )
        setServers(
          [...(serverItems ?? [])].sort((a, b) => a.domain.localeCompare(b.domain)),
        )
        setFetchedAt(new Date().toISOString())
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refreshCounter])

  if (error) {
    return (
      <div>
        <PageHeader
          title="Overview"
          description="Central overview of applications, servers, health, and operations"
          actions={
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((count) => count + 1)}
              refreshing={loading}
            />
          }
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  const warningServerIds = new Set(
    apps.filter((a) => a.status === "Degraded" || a.status === "Down").map((a) => a.serverId),
  )
  const avgUptime =
    apps.length === 0
      ? "100.00%"
      : `${(apps.reduce((sum, a) => sum + a.uptimePercent, 0) / apps.length).toFixed(2)}%`

  const serverHealth: {
    id: number
    name: string
    environment: string
    status: Extract<AppStatus, "Operational" | "Degraded">
    healthPercent: number
  }[] = servers.map((s) => ({
    id: s.id,
    name: s.domain,
    environment: s.environment,
    status: warningServerIds.has(s.id) ? ("Degraded" as const) : ("Operational" as const),
    healthPercent: warningServerIds.has(s.id) ? 78 : 99,
  }))

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Central overview of applications, servers, health, and operations"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {loading ? "Loading…" : `Last updated: ${formatDateTime(fetchedAt)}`}
            </span>
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((count) => count + 1)}
              refreshing={loading}
            />
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="Applications"
              value={apps.length}
              icon={Boxes}
              tone="blue"
              meta={
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status="Operational" />
                  {apps.filter((a) => a.status === "Operational").length} Operational
                </span>
              }
            />
            <StatCard
              label="Servers"
              value={servers.length}
              icon={Server}
              tone="green"
              meta={
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status="Operational" />
                  {servers.length - warningServerIds.size} Online
                </span>
              }
            />
            <StatCard
              label="Total Uptime (Avg)"
              value={avgUptime}
              icon={Activity}
              tone="purple"
              meta="Last 30 days"
            />
         
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ApplicationsTable applications={apps} />
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Servers available</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ul className="space-y-3">
                {serverHealth.map((server) => (
                  <li key={server.id} className="flex items-center gap-2.5">
                    <StatusDot status={server.status} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/servers/${server.id}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {server.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">{server.environment}</p>
                    </div>
                    <span className="text-muted-foreground text-sm font-semibold tabular-nums">
                      {server.healthPercent}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
