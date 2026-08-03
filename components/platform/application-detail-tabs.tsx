"use client"

import * as React from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AvailabilityStrip,
  DayTimeline,
  Sparkline,
} from "@/components/platform/metrics"
import { EnvironmentBadge, StatusLabel } from "@/components/platform/status"
import { ApplicationLogsPanel } from "@/components/platform/application-logs-panel"
import { DeploymentsPanel } from "@/components/platform/deployments-panel"
import { EntityAgentConfigSection } from "@/components/platform/entity-agent-config-section"
import { tmsApi } from "@/lib/platform/api-service"
import { formatDateTime } from "@/lib/platform/format"
import type { ApplicationDetail } from "@/lib/platform/queries"
import type { Application, AppStatus, Environment } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "overview", label: "Overview", available: true },
  { value: "servers", label: "Servers", available: true },
  { value: "deployments", label: "Deployments", available: true },
  { value: "logs", label: "Logs", available: true },
  { value: "configuration", label: "Configuration", available: true },
] as const

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

function OverviewPanel({ detail }: { detail: ApplicationDetail }) {
  const { app, health, versionDrift, endpoints } = detail
  const displayStatus: "Operational" | "Degraded" | "Unknown" =
    detail.uptimeTimeline
      ? detail.uptimeTimeline.totalChecks === 0
        ? "Unknown"
        : detail.uptimeTimeline.isOnline
        ? "Operational"
        : "Degraded"
      : app.isOnline === true
      ? "Operational"
      : app.isOnline === false
      ? "Degraded"
      : "Unknown"

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">30-day availability</CardTitle>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {health.availability}
            </span>
          </CardHeader>
          <CardContent>
            <AvailabilityStrip days={detail.availabilityDays} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s health timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <DayTimeline segments={detail.todayTimeline} asOf={detail.todayTimelineAsOf} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <Row label="Status">
                <StatusLabel status={displayStatus} />
              </Row>
              <Row label="Availability">{health.availability}</Row>
              <Row label="Current uptime">{health.currentUptime}</Row>            
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {endpoints.map((ep) => (
                <li key={ep.name} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-primary bg-primary/10 mr-1.5 rounded px-1 py-0.5 font-mono text-[0.65rem] font-bold">
                        {ep.method}
                      </span>
                      {ep.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{ep.path}</p>
                  </div>
                  <Badge variant={ep.statusCode === "OK" ? "secondary" : "destructive"}>
                    {ep.statusCode}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ServersPanel({
  applicationGroupId,
  applicationId,
  currentVersion,
}: {
  applicationGroupId: number
  applicationId: number
  currentVersion: string
}) {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Application[]>([])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await tmsApi.applicationsByGroup(applicationGroupId)
        if (cancelled) return
        setRows(items ?? [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load servers")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [applicationGroupId])

  const hasDrift = rows.some(
    (r) => r.version.toLowerCase() !== currentVersion.toLowerCase(),
  )

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Servers</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Every server running this application — spot deployment drift instantly.
          </p>
        </div>
        {hasDrift ? (
          <Badge variant="secondary" className="text-amber-700 dark:text-amber-400">
            Version drift detected
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Server</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Last Deployment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                      No servers found for this application group.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isCurrent = row.id === applicationId
                    const drifted =
                      row.version.toLowerCase() !== currentVersion.toLowerCase()
                    const domain =
                      row.serverDomain ||
                      row.serverDetail?.domain ||
                      `Server #${row.serverId}`
                    const env = (row.serverEnvironment ||
                      row.serverDetail?.environment ||
                      "Live") as Environment

                    return (
                      <TableRow
                        key={row.id}
                        className={cn(isCurrent && "bg-primary/5")}
                      >
                        <TableCell>
                          <Link
                            href={`/applications/${row.id}`}
                            className="font-medium hover:underline"
                          >
                            {domain}
                          </Link>
                          {isCurrent ? (
                            <p className="text-primary text-xs font-medium">Current</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <EnvironmentBadge environment={env} />
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-mono text-sm font-semibold",
                              drifted ? "text-amber-600 dark:text-amber-400" : "text-primary",
                            )}
                          >
                            {row.version}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.commit || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDateTime(row.lastDeployment)}
                        </TableCell>
                        <TableCell>
                          <StatusLabel status={row.status} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ApplicationDetailTabs({ detail }: { detail: ApplicationDetail }) {
  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
              !tab.available && "text-muted-foreground/70",
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-1">
        <OverviewPanel detail={detail} />
      </TabsContent>

      <TabsContent value="servers" className="mt-1">
        <ServersPanel
          applicationGroupId={detail.app.applicationGroupId}
          applicationId={detail.app.id}
          currentVersion={detail.app.version}
        />
      </TabsContent>

      <TabsContent value="deployments" className="mt-1">
        <DeploymentsPanel
          applicationId={detail.app.id}
          applicationName={detail.app.name}
          defaultVersion={detail.app.version}
          defaultCommit={detail.app.commit}
        />
      </TabsContent>

      <TabsContent value="logs" className="mt-1">
        <ApplicationLogsPanel
          applicationId={detail.app.id}
          applicationName={detail.app.name}
        />
      </TabsContent>

      <TabsContent value="configuration" className="mt-1">
        <EntityAgentConfigSection entityLabel="application" entityName={detail.app.name} />
      </TabsContent>
    </Tabs>
  )
}
