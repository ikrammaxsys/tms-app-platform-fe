import { tmsApi, type ApplicationUptimeTimelineQuery } from "./api-service"
import {
  availabilityDays,
  availabilityDayFromUptimePoint,
  resolveApplicationLiveStatus,
  toApplicationView,
} from "./view"
import type {
  ApplicationDeployment,
  ApplicationView,
  AppStatus,
  AvailabilityDay,
  Environment,
  HostMetricsTimeline,
  Organization,
  Provider,
  Server,
  UptimeTimeline,
} from "./types"

export const REPORT_PERIOD_OPTIONS = [7, 30] as const
export type ReportPeriod = (typeof REPORT_PERIOD_OPTIONS)[number]
export const DEFAULT_REPORT_PERIOD: ReportPeriod = 30

export function parseReportPeriod(value: string | undefined): ReportPeriod {
  const parsed = Number(value)
  if (REPORT_PERIOD_OPTIONS.includes(parsed as ReportPeriod)) {
    return parsed as ReportPeriod
  }
  return DEFAULT_REPORT_PERIOD
}

export const MAX_APPLICATION_REPORT_MONTHS = 6

/** Date-only values for `<input type="date">` (YYYY-MM-DD). */
export interface ApplicationReportRange {
  startDate: string
  endDate: string
}

export interface ApplicationReportData {
  applicationRows: ApplicationReportRow[]
  fetchedAt: string
  range: ApplicationReportRange
  rangeLabel: string
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function defaultApplicationReportRange(): ApplicationReportRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  }
}

function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function validateApplicationReportRange(range: ApplicationReportRange): string | null {
  const start = parseDateInput(range.startDate)
  const end = parseDateInput(range.endDate)
  if (!start || !end) return "Enter valid start and end dates."
  if (start > end) return "Start date must be on or before end date."
  const maxEnd = addMonths(start, MAX_APPLICATION_REPORT_MONTHS)
  if (end > maxEnd) return `Date range cannot exceed ${MAX_APPLICATION_REPORT_MONTHS} months.`
  if (end > new Date()) return "End date cannot be in the future."
  return null
}

export function formatApplicationReportRangeLabel(range: ApplicationReportRange): string {
  const start = parseDateInput(range.startDate)
  const end = parseDateInput(range.endDate)
  if (!start || !end) return "Custom range"
  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

export function applicationReportRangeFilenameSuffix(range: ApplicationReportRange): string {
  return `${range.startDate}_to_${range.endDate}`
}

export function reportRangeToTimelineQuery(
  range: ApplicationReportRange,
): ApplicationUptimeTimelineQuery {
  return {
    startDate: `${range.startDate}T00:00:00`,
    endDate: `${range.endDate}T23:59:59`,
  }
}

export interface DailyUptimeEntry {
  date: string
  label: string
  uptimePercent: number | null
}

export interface ApplicationReportRow {
  app: ApplicationView
  liveStatus: AppStatus
  uptimePercent: number | null
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
  availabilityDays: AvailabilityDay[]
  dailyUptime: DailyUptimeEntry[]
  lastChecked: string | null
  hasVersionDrift: boolean
}

export interface ServerReportRow {
  server: Server
  organizationName: string
  appCount: number
  appsOperational: number
  appsDegraded: number
  appsDown: number
  cpuUsage: number | null
  ramUsagePercent: number | null
  diskUsagePercent: number | null
  uptimePercent: number | null
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
  status: "Operational" | "Degraded" | "Down" | "Unknown"
  lastChecked: string | null
  availabilityDays: AvailabilityDay[]
}

export interface BreakdownItem {
  label: string
  count: number
  percent: number
}

export interface ReportingSummary {
  periodDays: ReportPeriod
  fetchedAt: string
  periodLabel: string
  applicationsTotal: number
  applicationsOperational: number
  applicationsDegraded: number
  applicationsDown: number
  applicationsInactive: number
  applicationsUnknown: number
  avgUptimePercent: number | null
  serversTotal: number
  serversOperational: number
  serversDegraded: number
  serversDown: number
  avgCpuUsage: number | null
  avgRamUsage: number | null
  avgDiskUsage: number | null
  deploymentsInPeriod: number
  versionDriftCount: number
  totalChecks: number
  totalUpChecks: number
  totalDegradedChecks: number
  totalDownChecks: number
}

export interface ReportingData {
  summary: ReportingSummary
  applicationRows: ApplicationReportRow[]
  serverRows: ServerReportRow[]
  applicationsByEnvironment: BreakdownItem[]
  applicationsByGroup: BreakdownItem[]
  applicationsByStatus: BreakdownItem[]
  serversByEnvironment: BreakdownItem[]
  serversByProvider: BreakdownItem[]
  serversByCountry: BreakdownItem[]
  deployments: ApplicationDeployment[]
  organizations: Organization[]
}

function hostStatusToReportStatus(
  currentStatus: string,
  hasAppIssues: boolean,
): ServerReportRow["status"] {
  if (currentStatus === "Down") return "Down"
  if (currentStatus === "Degraded" || hasAppIssues) return "Degraded"
  if (currentStatus === "Up") return "Operational"
  return "Unknown"
}

function timelineToAvailabilityDays(
  timeline: UptimeTimeline | HostMetricsTimeline | undefined,
  fallbackStatus?: AppStatus,
): AvailabilityDay[] {
  if (timeline?.points?.length) {
    return timeline.points.map(availabilityDayFromUptimePoint)
  }
  if (fallbackStatus) {
    return availabilityDays({ id: 0, status: fallbackStatus })
  }
  return []
}

function dailyUptimeFromTimeline(
  timeline: UptimeTimeline | undefined,
  fallbackDays: AvailabilityDay[],
): DailyUptimeEntry[] {
  if (timeline?.points?.length) {
    return timeline.points.map((point) => ({
      date: point.from,
      label: point.label,
      uptimePercent:
        point.totalChecks === 0 || point.status === "NoData" ? null : point.uptimePercent,
    }))
  }
  return fallbackDays.map((day) => ({
    date: day.date,
    label: day.label,
    uptimePercent:
      day.checks && day.checks.totalChecks > 0
        ? (100 * day.checks.upCount) / day.checks.totalChecks
        : null,
  }))
}

export function collectDailyUptimeColumns(
  rows: ApplicationReportRow[],
): DailyUptimeEntry[] {
  const byDate = new Map<string, DailyUptimeEntry>()
  for (const row of rows) {
    for (const day of row.dailyUptime) {
      if (!byDate.has(day.date)) {
        byDate.set(day.date, day)
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function detectVersionDrift(apps: ApplicationView[]): Set<number> {
  const byName = new Map<string, Set<string>>()
  for (const app of apps) {
    const key = app.name.toLowerCase()
    if (!byName.has(key)) byName.set(key, new Set())
    byName.get(key)!.add(app.version.toLowerCase())
  }
  const driftIds = new Set<number>()
  for (const app of apps) {
    const versions = byName.get(app.name.toLowerCase())
    if (versions && versions.size > 1) driftIds.add(app.id)
  }
  return driftIds
}

function buildBreakdown(
  items: { label: string }[],
  total: number,
): BreakdownItem[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.label, (counts.get(item.label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: total === 0 ? 0 : (100 * count) / total,
    }))
    .sort((a, b) => b.count - a.count)
}

function countDeploymentsInPeriod(
  deployments: ApplicationDeployment[],
  days: ReportPeriod,
): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return deployments.filter((d) => {
    const ts = new Date(d.timestamp).getTime()
    return !Number.isNaN(ts) && ts >= cutoff
  }).length
}

function buildApplicationReportRows(
  apps: ApplicationView[],
  appTimelineMap: Record<number, UptimeTimeline | undefined>,
  versionDriftIds: Set<number>,
): ApplicationReportRow[] {
  return apps.map((app) => {
    const timeline = appTimelineMap[app.id]
    const liveStatus = resolveApplicationLiveStatus(app, timeline)
    const availabilityDaysForApp = timelineToAvailabilityDays(timeline, app.status)
    const totalChecks = timeline?.totalChecks ?? 0
    const uptimePercent =
      liveStatus === "Unknown" || totalChecks === 0
        ? null
        : (timeline?.uptimePercent ?? null)
    return {
      app,
      liveStatus,
      uptimePercent,
      totalChecks: timeline?.totalChecks ?? 0,
      upCount: timeline?.upCount ?? 0,
      degradedCount: timeline?.degradedCount ?? 0,
      downCount: timeline?.downCount ?? 0,
      availabilityDays: availabilityDaysForApp,
      dailyUptime: dailyUptimeFromTimeline(timeline, availabilityDaysForApp),
      lastChecked: timeline?.lastChecked ?? null,
      hasVersionDrift: versionDriftIds.has(app.id),
    }
  })
}

export async function loadApplicationReportData(
  range: ApplicationReportRange,
): Promise<ApplicationReportData> {
  const validationError = validateApplicationReportRange(range)
  if (validationError) {
    throw new Error(validationError)
  }

  const timelineQuery = reportRangeToTimelineQuery(range)
  const [applicationItems, serverItems] = await Promise.all([
    tmsApi.listApplications(),
    tmsApi.listServers(),
  ])

  const serverById = new Map((serverItems ?? []).map((s) => [s.id, s]))
  const apps = (applicationItems ?? [])
    .map((a) => toApplicationView(a, serverById.get(a.serverId)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const versionDriftIds = detectVersionDrift(apps)

  const appTimelines = await Promise.all(
    apps.map(async (app) => {
      try {
        const timeline = await tmsApi.getApplicationUptimeTimeline(app.id, timelineQuery)
        return [app.id, timeline] as const
      } catch {
        return [app.id, undefined] as const
      }
    }),
  )

  const appTimelineMap = Object.fromEntries(appTimelines) as Record<
    number,
    UptimeTimeline | undefined
  >

  return {
    applicationRows: buildApplicationReportRows(apps, appTimelineMap, versionDriftIds),
    fetchedAt: new Date().toISOString(),
    range,
    rangeLabel: formatApplicationReportRangeLabel(range),
  }
}

export async function loadReportingData(
  periodDays: ReportPeriod = DEFAULT_REPORT_PERIOD,
): Promise<ReportingData> {
  const [applicationItems, serverItems, deploymentItems, organizationItems] =
    await Promise.all([
      tmsApi.listApplications(),
      tmsApi.listServers(),
      tmsApi.listDeployments().catch(() => []),
      tmsApi.listOrganizations().catch(() => []),
    ])

  const servers = [...(serverItems ?? [])].sort((a, b) =>
    a.domain.localeCompare(b.domain),
  )
  const organizations = organizationItems ?? []
  const orgById = new Map(organizations.map((o) => [o.id, o]))
  const serverById = new Map(servers.map((s) => [s.id, s]))

  const apps = (applicationItems ?? [])
    .map((a) => toApplicationView(a, serverById.get(a.serverId)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const versionDriftIds = detectVersionDrift(apps)

  const [appTimelines, serverTimelines] = await Promise.all([
    Promise.all(
      apps.map(async (app) => {
        try {
          const timeline = await tmsApi.getApplicationUptimeTimeline(app.id, periodDays)
          return [app.id, timeline] as const
        } catch {
          return [app.id, undefined] as const
        }
      }),
    ),
    Promise.all(
      servers.map(async (server) => {
        try {
          const timeline = await tmsApi.getServerHostTimeline(server.id, periodDays)
          return [server.id, timeline] as const
        } catch {
          return [server.id, undefined] as const
        }
      }),
    ),
  ])

  const appTimelineMap = Object.fromEntries(appTimelines) as Record<
    number,
    UptimeTimeline | undefined
  >
  const serverTimelineMap = Object.fromEntries(serverTimelines) as Record<
    number,
    HostMetricsTimeline | undefined
  >

  const appsByServer = new Map<number, ApplicationView[]>()
  for (const app of apps) {
    if (!appsByServer.has(app.serverId)) appsByServer.set(app.serverId, [])
    appsByServer.get(app.serverId)!.push(app)
  }

  const applicationRows = buildApplicationReportRows(apps, appTimelineMap, versionDriftIds)

  const serverRows: ServerReportRow[] = servers.map((server) => {
    const timeline = serverTimelineMap[server.id]
    const serverApps = appsByServer.get(server.id) ?? []
    const appsOperational = serverApps.filter((a) => a.status === "Operational").length
    const appsDegraded = serverApps.filter((a) => a.status === "Degraded").length
    const appsDown = serverApps.filter((a) => a.status === "Down").length
    const hasAppIssues = appsDegraded > 0 || appsDown > 0

    return {
      server,
      organizationName:
        server.organizationName ?? orgById.get(server.organizationId)?.name ?? "—",
      appCount: serverApps.length,
      appsOperational,
      appsDegraded,
      appsDown,
      cpuUsage: timeline?.currentCpuUsage ?? null,
      ramUsagePercent: timeline?.currentRam?.usagePercent ?? null,
      diskUsagePercent: timeline?.currentDisk?.usagePercent ?? null,
      uptimePercent: timeline?.uptimePercent ?? null,
      totalChecks: timeline?.totalChecks ?? 0,
      upCount: timeline?.upCount ?? 0,
      degradedCount: timeline?.degradedCount ?? 0,
      downCount: timeline?.downCount ?? 0,
      status: hostStatusToReportStatus(timeline?.currentStatus ?? "", hasAppIssues),
      lastChecked: timeline?.lastChecked ?? null,
      availabilityDays: timelineToAvailabilityDays(timeline),
    }
  })

  const statusCounts = {
    Operational: applicationRows.filter((r) => r.liveStatus === "Operational").length,
    Degraded: applicationRows.filter((r) => r.liveStatus === "Degraded").length,
    Down: applicationRows.filter((r) => r.liveStatus === "Down").length,
    Inactive: applicationRows.filter((r) => r.liveStatus === "Inactive").length,
    Unknown: applicationRows.filter((r) => r.liveStatus === "Unknown").length,
  }

  const uptimeValues = applicationRows
    .map((r) => r.uptimePercent)
    .filter((v): v is number => v !== null)
  const avgUptime =
    uptimeValues.length === 0
      ? null
      : uptimeValues.reduce((sum, v) => sum + v, 0) / uptimeValues.length

  const cpuValues = serverRows.map((r) => r.cpuUsage).filter((v): v is number => v !== null)
  const ramValues = serverRows
    .map((r) => r.ramUsagePercent)
    .filter((v): v is number => v !== null)
  const diskValues = serverRows
    .map((r) => r.diskUsagePercent)
    .filter((v): v is number => v !== null)

  const avg = (values: number[]) =>
    values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length

  const deployments = deploymentItems ?? []
  const fetchedAt = new Date().toISOString()

  const summary: ReportingSummary = {
    periodDays,
    fetchedAt,
    periodLabel: `Last ${periodDays} days`,
    applicationsTotal: apps.length,
    applicationsOperational: statusCounts.Operational,
    applicationsDegraded: statusCounts.Degraded,
    applicationsDown: statusCounts.Down,
    applicationsInactive: statusCounts.Inactive,
    applicationsUnknown: statusCounts.Unknown,
    avgUptimePercent: avgUptime,
    serversTotal: servers.length,
    serversOperational: serverRows.filter((r) => r.status === "Operational").length,
    serversDegraded: serverRows.filter((r) => r.status === "Degraded").length,
    serversDown: serverRows.filter((r) => r.status === "Down").length,
    avgCpuUsage: avg(cpuValues),
    avgRamUsage: avg(ramValues),
    avgDiskUsage: avg(diskValues),
    deploymentsInPeriod: countDeploymentsInPeriod(deployments, periodDays),
    versionDriftCount: versionDriftIds.size,
    totalChecks: applicationRows.reduce((sum, r) => sum + r.totalChecks, 0),
    totalUpChecks: applicationRows.reduce((sum, r) => sum + r.upCount, 0),
    totalDegradedChecks: applicationRows.reduce((sum, r) => sum + r.degradedCount, 0),
    totalDownChecks: applicationRows.reduce((sum, r) => sum + r.downCount, 0),
  }

  return {
    summary,
    applicationRows,
    serverRows,
    applicationsByEnvironment: buildBreakdown(
      apps.map((a) => ({ label: String(a.serverEnvironment || "Unknown") })),
      apps.length,
    ),
    applicationsByGroup: buildBreakdown(
      apps.map((a) => ({ label: a.applicationGroupName || "Unassigned" })),
      apps.length,
    ),
    applicationsByStatus: buildBreakdown(
      applicationRows.map((r) => ({ label: r.liveStatus })),
      applicationRows.length,
    ),
    serversByEnvironment: buildBreakdown(
      servers.map((s) => ({ label: s.environment })),
      servers.length,
    ),
    serversByProvider: buildBreakdown(
      servers.map((s) => ({ label: s.provider })),
      servers.length,
    ),
    serversByCountry: buildBreakdown(
      servers.map((s) => ({ label: s.country || "Unknown" })),
      servers.length,
    ),
    deployments,
    organizations,
  }
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(decimals)}%`
}

export function statusTone(
  status: AppStatus | ServerReportRow["status"],
): "green" | "amber" | "red" | "muted" {
  if (status === "Operational") return "green"
  if (status === "Degraded") return "amber"
  if (status === "Down") return "red"
  return "muted"
}

export type EnvironmentBreakdown = BreakdownItem & { environment: Environment }
export type ProviderBreakdown = BreakdownItem & { provider: Provider }
