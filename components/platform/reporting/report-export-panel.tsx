"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { ExportCsvButton } from "@/components/platform/export-csv-button"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { ReportDateRangePicker } from "@/components/platform/reporting/report-date-range-picker"
import { ReportPeriodSelect } from "@/components/platform/reporting/report-period-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { applicationReportCsvColumns, serverReportCsvColumns } from "@/lib/platform/csv-exports"
import { formatDateTime } from "@/lib/platform/format"
import {
  DEFAULT_REPORT_PERIOD,
  applicationReportRangeFilenameSuffix,
  defaultApplicationReportRange,
  loadApplicationReportData,
  loadReportingData,
  validateApplicationReportRange,
  type ApplicationReportRange,
  type ApplicationReportRow,
  type ReportPeriod,
  type ServerReportRow,
} from "@/lib/platform/reporting"

type ReportExportKind = "applications" | "servers"

const REPORT_CONFIG: Record<
  ReportExportKind,
  {
    title: string
    description: string
    filenamePrefix: string
    exportLabel: string
    includes: string[]
    showUptimeColorHint: boolean
  }
> = {
  applications: {
    title: "Application Reports",
    description: "Export application uptime and status data",
    filenamePrefix: "application-report",
    exportLabel: "Export Excel",
    includes: [
      "Application name, status, version, and group",
      "Overall uptime and per-day uptime percentages for the selected dates",
      "Server, environment, and deployment details",
      "Uptime check counts (up, degraded, down)",
    ],
    showUptimeColorHint: true,
  },
  servers: {
    title: "Server Reports",
    description: "Export server resource and hosting data",
    filenamePrefix: "server-report",
    exportLabel: "Export CSV",
    includes: [
      "Server domain, IP, provider, and organization",
      "CPU, RAM, and disk utilization",
      "Host uptime and check counts",
      "Application count per server",
    ],
    showUptimeColorHint: false,
  },
}

function ApplicationReportExportPanel() {
  const config = REPORT_CONFIG.applications
  const [range, setRange] = React.useState<ApplicationReportRange>(defaultApplicationReportRange)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [fetchedAt, setFetchedAt] = React.useState<string>("")
  const [rangeLabel, setRangeLabel] = React.useState<string>("")
  const [applicationRows, setApplicationRows] = React.useState<ApplicationReportRow[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  const rangeError = validateApplicationReportRange(range)

  React.useEffect(() => {
    if (rangeError) {
      setLoading(false)
      setApplicationRows([])
      setRangeLabel("")
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await loadApplicationReportData(range)
        if (cancelled) return
        setApplicationRows(result.applicationRows)
        setFetchedAt(result.fetchedAt)
        setRangeLabel(result.rangeLabel)
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
  }, [range.startDate, range.endDate, refreshCounter, rangeError])

  if (error) {
    return (
      <div>
        <PageHeader
          title={config.title}
          description={config.description}
          actions={
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((c) => c + 1)}
              refreshing={loading}
            />
          }
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  return (
    <ReportExportShell
      config={config}
      loading={loading}
      rowCount={applicationRows.length}
      rangeSummary={rangeError ? "Select a valid date range" : rangeLabel}
      fetchedAt={fetchedAt}
      controls={
        <>
          <ReportDateRangePicker value={range} onChange={setRange} disabled={loading} />
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton
              filename={`${config.filenamePrefix}-${applicationReportRangeFilenameSuffix(range)}`}
              columns={applicationReportCsvColumns(applicationRows)}
              rows={applicationRows}
              label={config.exportLabel}
              disabled={Boolean(rangeError) || applicationRows.length === 0}
            />
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((c) => c + 1)}
              refreshing={loading}
              disabled={Boolean(rangeError)}
            />
          </div>
        </>
      }
    />
  )
}

function ServerReportExportPanel() {
  const config = REPORT_CONFIG.servers
  const [period, setPeriod] = React.useState<ReportPeriod>(DEFAULT_REPORT_PERIOD)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [fetchedAt, setFetchedAt] = React.useState<string>("")
  const [serverRows, setServerRows] = React.useState<ServerReportRow[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await loadReportingData(period)
        if (cancelled) return
        setServerRows(result.serverRows)
        setFetchedAt(result.summary.fetchedAt)
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

  if (error) {
    return (
      <div>
        <PageHeader
          title={config.title}
          description={config.description}
          actions={
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((c) => c + 1)}
              refreshing={loading}
            />
          }
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  return (
    <ReportExportShell
      config={config}
      loading={loading}
      rowCount={serverRows.length}
      rangeSummary={`Last ${period} days`}
      fetchedAt={fetchedAt}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <ReportPeriodSelect value={period} onChange={setPeriod} disabled={loading} />
          <ExportCsvButton
            filename={`${config.filenamePrefix}-${period}d`}
            columns={serverReportCsvColumns}
            rows={serverRows}
            label={config.exportLabel}
          />
          <OverviewRefreshButton
            onRefresh={() => setRefreshCounter((c) => c + 1)}
            refreshing={loading}
          />
        </div>
      }
    />
  )
}

function ReportExportShell({
  config,
  loading,
  rowCount,
  rangeSummary,
  fetchedAt,
  controls,
}: {
  config: (typeof REPORT_CONFIG)[ReportExportKind]
  loading: boolean
  rowCount: number
  rangeSummary: string
  fetchedAt: string
  controls: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/reporting" />}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeft className="size-4" />
          Back to reporting
        </Button>
      </div>

      <PageHeader title={config.title} description={config.description} />

      <Card className="max-w-2xl">
        <CardContent className="space-y-5 pt-6">
          {loading ? (
            <>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <FileSpreadsheet className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {rowCount} record{rowCount === 1 ? "" : "s"} ready
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {rangeSummary}
                    {fetchedAt ? ` · Updated ${formatDateTime(fetchedAt)}` : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-3">{controls}</div>

              <div>
                <p className="mb-2 text-sm font-medium">Export includes</p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                  {config.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              {config.showUptimeColorHint ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Download className="size-3.5 shrink-0" />
                  Daily uptime columns are color-coded in the Excel export (green ≥90%, amber
                  70–89%, red &lt;70%).
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ReportExportPanel({ kind }: { kind: ReportExportKind }) {
  if (kind === "applications") return <ApplicationReportExportPanel />
  return <ServerReportExportPanel />
}
