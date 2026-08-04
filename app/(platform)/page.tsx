"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  CheckCircle2,
  History,
  Server,
} from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { EnvironmentBadge, StatusDot } from "@/components/platform/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import { formatDateTime, formatRelativeTime, parseApiDateTime } from "@/lib/platform/format"
import { toApplicationView } from "@/lib/platform/view"
import type {
  ApplicationDeployment,
  ApplicationView,
  AppStatus,
  Environment,
  Server as ServerType,
} from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const RECENT_DEPLOYMENTS_LIMIT = 10

const ATTENTION_STATUS_ORDER: Record<AppStatus, number> = {
  Down: 0,
  Degraded: 1,
  Unknown: 2,
  Inactive: 3,
  Operational: 4,
}

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

function sortDeployments(deployments: ApplicationDeployment[]): ApplicationDeployment[] {
  return [...deployments].sort((a, b) => {
    const aTime = parseApiDateTime(a.timestamp)?.getTime() ?? 0
    const bTime = parseApiDateTime(b.timestamp)?.getTime() ?? 0
    return bTime - aTime
  })
}

export default function OverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [apps, setApps] = React.useState<ApplicationView[]>([])
  const [servers, setServers] = React.useState<ServerType[]>([])
  const [deployments, setDeployments] = React.useState<ApplicationDeployment[]>([])
  const [fetchedAt, setFetchedAt] = React.useState<string>("")
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [applicationItems, serverItems, deploymentItems] = await Promise.all([
          tmsApi.listApplications(),
          tmsApi.listServers(),
          tmsApi.listDeployments(),
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
        setDeployments(sortDeployments(deploymentItems ?? []))
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

  const needsAttention = React.useMemo(
    () =>
      apps
        .filter((a) => a.status === "Degraded" || a.status === "Down")
        .sort(
          (a, b) =>
            ATTENTION_STATUS_ORDER[a.status] - ATTENTION_STATUS_ORDER[b.status] ||
            a.name.localeCompare(b.name),
        ),
    [apps],
  )

  const recentDeployments = React.useMemo(
    () => deployments.slice(0, RECENT_DEPLOYMENTS_LIMIT),
    [deployments],
  )

  const appById = React.useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps])

  if (error) {
    return (
      <div>
        <PageHeader
          title="Overview"
          description="Platform health at a glance — alerts and recent activity"
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

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Platform health at a glance — alerts and recent activity"
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

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
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
                  {apps.filter((a) => a.status === "Operational").length} operational
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
                  {servers.length - warningServerIds.size} without app issues
                </span>
              }
            />
            <StatCard
              label="Needs attention"
              value={needsAttention.length}
              icon={Bell}
              tone={needsAttention.length > 0 ? "red" : "green"}
              meta={
                needsAttention.length > 0
                  ? `${needsAttention.filter((a) => a.status === "Down").length} down · ${needsAttention.filter((a) => a.status === "Degraded").length} degraded`
                  : "All applications healthy"
              }
            />
            <StatCard
              label="Avg uptime"
              value={avgUptime}
              icon={Activity}
              tone="purple"
              meta="Across all applications"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Needs attention</CardTitle>
            {!loading && needsAttention.length > 0 ? (
              <span className="text-muted-foreground text-xs">
                {needsAttention.length} item{needsAttention.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : needsAttention.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="text-sm font-semibold">All clear</p>
                <p className="text-muted-foreground max-w-xs text-xs">
                  No applications are currently down or degraded.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {needsAttention.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/applications/${app.id}`}
                      className="hover:bg-muted/60 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                    >
                      <StatusDot status={app.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{app.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {app.version} · {app.serverDomain}
                        </p>
                      </div>
                      <EnvironmentBadge environment={app.serverEnvironment as Environment} />
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          app.status === "Down"
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {app.status}
                      </span>
                      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Recent deployments</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/deployments" />}
              className="text-muted-foreground h-8 px-2 text-xs"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : recentDeployments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
                <History className="text-muted-foreground size-8" />
                <p className="text-sm font-semibold">No deployments yet</p>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Deployment history will appear here once applications are deployed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/deployments" />}
                  className="mt-2"
                >
                  Go to deployments
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentDeployments.map((deployment) => {
                  const app = appById.get(deployment.applicationId)
                  return (
                    <li key={deployment.id}>
                      <Link
                        href={`/applications/${deployment.applicationId}`}
                        className="hover:bg-muted/60 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                      >
                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <History className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {deployment.applicationName || app?.name || "Application"}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {deployment.version}
                            {deployment.commitNo ? ` · ${deployment.commitNo}` : ""}
                            {app ? ` · ${app.serverEnvironment}` : ""}
                          </p>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatRelativeTime(deployment.timestamp)}
                        </span>
                        <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
