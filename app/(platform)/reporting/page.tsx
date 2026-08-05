"use client"

import * as React from "react"
import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Cpu,
  HardDrive,
  History,
  Server,
} from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { ApplicationReportTable } from "@/components/platform/reporting/application-report-table"
import { ReportBreakdown, ReportCheckSummary } from "@/components/platform/reporting/report-breakdown"
import { ReportPeriodSelect } from "@/components/platform/reporting/report-period-select"
import { ReportStatCard } from "@/components/platform/reporting/report-stat-card"
import { ServerReportTable } from "@/components/platform/reporting/server-report-table"
import { StatusLabel } from "@/components/platform/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/platform/format"
import {
  DEFAULT_REPORT_PERIOD,
  formatPercent,
  loadReportingData,
  type ReportPeriod,
  type ReportingData,
} from "@/lib/platform/reporting"
import { cn } from "@/lib/utils"

function useReportingData(period: ReportPeriod) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [data, setData] = React.useState<ReportingData | null>(null)
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await loadReportingData(period)
        if (!cancelled) setData(result)
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
  }, [period, refreshCounter])

  return {
    loading,
    error,
    data,
    refresh: () => setRefreshCounter((c) => c + 1),
  }
}

function ReportingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

export default function ReportingOverviewPage() {
  const [period, setPeriod] = React.useState<ReportPeriod>(DEFAULT_REPORT_PERIOD)
  const { loading, error, data, refresh } = useReportingData(period)

  if (error) {
    return (
      <div>
        <PageHeader
          title="Reporting"
          description="Platform-wide analytics for applications and servers"
          actions={
            <OverviewRefreshButton onRefresh={refresh} refreshing={loading} />
          }
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  const summary = data?.summary

  const lowestUptimeApps = data
    ? [...data.applicationRows]
        .filter((row) => row.uptimePercent !== null)
        .sort((a, b) => a.uptimePercent! - b.uptimePercent!)
        .slice(0, 5)
    : []

  const highestResourceServers = data
    ? [...data.serverRows]
        .filter((r) => r.cpuUsage !== null)
        .sort((a, b) => (b.cpuUsage ?? 0) - (a.cpuUsage ?? 0))
        .slice(0, 5)
    : []

  return (
    <div>
      <PageHeader
        title="Reporting"
        description="Platform-wide analytics for applications and servers"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReportPeriodSelect value={period} onChange={setPeriod} disabled={loading} />
            {summary ? (
              <span className="text-muted-foreground text-sm">
                Updated {formatDateTime(summary.fetchedAt)}
              </span>
            ) : null}
            <OverviewRefreshButton onRefresh={refresh} refreshing={loading} />
          </div>
        }
      />

      {loading || !data ? (
        <ReportingSkeleton />
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatCard
              label="Applications"
              value={summary!.applicationsTotal}
              icon={Boxes}
              tone="blue"
              meta={
                <>
                  {summary!.applicationsOperational} operational · {summary!.applicationsDegraded}{" "}
                  degraded · {summary!.applicationsDown} down
                </>
              }
            />
            <ReportStatCard
              label="Avg uptime"
              value={formatPercent(summary!.avgUptimePercent)}
              icon={Activity}
              tone="purple"
              meta={summary!.periodLabel}
            />
            <ReportStatCard
              label="Servers"
              value={summary!.serversTotal}
              icon={Server}
              tone="green"
              meta={
                <>
                  {summary!.serversOperational} healthy · {summary!.serversDegraded} degraded
                </>
              }
            />
            <ReportStatCard
              label="Deployments"
              value={summary!.deploymentsInPeriod}
              icon={History}
              tone="amber"
              meta={`In ${summary!.periodLabel.toLowerCase()}`}
            />
          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <ReportStatCard
              label="Avg CPU usage"
              value={formatPercent(summary!.avgCpuUsage, 1)}
              icon={Cpu}
              tone={summary!.avgCpuUsage !== null && summary!.avgCpuUsage >= 75 ? "amber" : "green"}
              meta="Across monitored servers"
            />
            <ReportStatCard
              label="Avg RAM usage"
              value={formatPercent(summary!.avgRamUsage, 1)}
              icon={HardDrive}
              tone={summary!.avgRamUsage !== null && summary!.avgRamUsage >= 75 ? "amber" : "green"}
              meta="Across monitored servers"
            />
            <ReportStatCard
              label="Version drift"
              value={summary!.versionDriftCount}
              icon={AlertTriangle}
              tone={summary!.versionDriftCount > 0 ? "amber" : "green"}
              meta={
                summary!.versionDriftCount > 0
                  ? "Applications with mismatched versions"
                  : "All versions aligned"
              }
            />
          </div>

          <div className="mb-5">
            <ReportCheckSummary
              totalChecks={summary!.totalChecks}
              upCount={summary!.totalUpChecks}
              degradedCount={summary!.totalDegradedChecks}
              downCount={summary!.totalDownChecks}
            />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <ReportBreakdown title="Applications by status" items={data.applicationsByStatus} />
            <ReportBreakdown
              title="Applications by environment"
              items={data.applicationsByEnvironment}
            />
            <ReportBreakdown title="Applications by group" items={data.applicationsByGroup} />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <ReportBreakdown title="Servers by environment" items={data.serversByEnvironment} />
            <ReportBreakdown title="Servers by provider" items={data.serversByProvider} />
            <ReportBreakdown title="Servers by country" items={data.serversByCountry} />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Lowest uptime applications</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/reporting/applications" />}
                  className="text-muted-foreground h-8 px-2 text-xs"
                >
                  Full report
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                {lowestUptimeApps.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No application data available.</p>
                ) : (
                  <ul className="space-y-2">
                    {lowestUptimeApps.map((row) => (
                      <li key={row.app.id}>
                        <Link
                          href={`/applications/${row.app.id}`}
                          className="hover:bg-muted/60 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{row.app.name}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {row.app.serverDomain}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StatusLabel status={row.liveStatus} />
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                row.uptimePercent !== null && row.uptimePercent < 95
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {formatPercent(row.uptimePercent)}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Highest resource usage servers</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/reporting/servers" />}
                  className="text-muted-foreground h-8 px-2 text-xs"
                >
                  Full report
                  <ArrowRight className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                {highestResourceServers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No server metrics available.</p>
                ) : (
                  <ul className="space-y-2">
                    {highestResourceServers.map((row) => (
                      <li key={row.server.id}>
                        <Link
                          href={`/servers/${row.server.id}`}
                          className="hover:bg-muted/60 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{row.server.domain}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {row.appCount} app{row.appCount === 1 ? "" : "s"} ·{" "}
                              {row.server.provider}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                            <span>
                              CPU{" "}
                              <strong className="text-sm">
                                {formatPercent(row.cpuUsage, 1)}
                              </strong>
                            </span>
                            <span>
                              RAM{" "}
                              <strong className="text-sm">
                                {formatPercent(row.ramUsagePercent, 1)}
                              </strong>
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Application summary</h2>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/reporting/applications" />}
              >
                View full application report
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <ApplicationReportTable rows={data.applicationRows} compact />
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Server summary</h2>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/reporting/servers" />}
              >
                View full server report
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
            <ServerReportTable rows={data.serverRows} compact />
          </div>
        </>
      )}
    </div>
  )
}
