import { ApiError } from "./api"
import { tmsApi, type ApplicationUptimeTimelineQuery } from "./api-service"
import { formatBytes } from "./format"
import {
  availabilityDays,
  averageLatency,
  availabilityDayFromUptimePoint,
  toApplicationView,
} from "./view"
import type {
  Application,
  ApplicationGroup,
  Organization,
  OrganizationUpsert,
  ApplicationUpsert,
  ApplicationView,
  AvailabilityDay,
  DayStatus,
  HostMetricsTimeline,
  HostResourceSnapshot,
  SelectOption,
  Server,
  ServerUpsert,
  UptimePointStatus,
  UptimeTimeline,
} from "./types"

export {
  avatarColor,
  initialOf,
  availabilityDays,
  uptimePercent,
  averageLatency,
  toApplicationView,
} from "./view"

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/* ------------------------------- Servers -------------------------------- */

export async function getServers(): Promise<Server[]> {
  const items = await tmsApi.listServers()
  return [...(items ?? [])].sort((a, b) => a.domain.localeCompare(b.domain))
}

export async function getServerById(id: number): Promise<Server | undefined> {
  try {
    const item = await tmsApi.getServer(id)
    return item ?? undefined
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export async function getServerOptions(): Promise<SelectOption[]> {
  return tmsApi.serverOptions()
}

export async function createServerApi(body: ServerUpsert): Promise<Server> {
  return tmsApi.createServer(body)
}

export async function updateServerApi(id: number, body: ServerUpsert): Promise<boolean> {
  return tmsApi.updateServer(id, body)
}

export async function deleteServerApi(id: number): Promise<boolean> {
  return tmsApi.deleteServer(id)
}

export interface ServerResourceMetrics {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
  total: string
  used: string
  available: string
  summary: string
}

export interface ServerDetail {
  server: Server
  applications: ApplicationView[]
  metrics: {
    status: "Operational" | "Degraded" | "Down" | "Unknown"
    cpu: string
    memory: string
    disk: string
    ram: ServerResourceMetrics | null
    diskUsage: ServerResourceMetrics | null
    availability: string
    availabilityPercent: number
    lastChecked: string | null
    cpuSparkline: (number | null)[]
    memorySparkline: (number | null)[]
    diskSparkline: (number | null)[]
    timelineLabels: string[]
    availabilityDays: AvailabilityDay[]
    timelineDays: number
  }
}

const HOST_TIMELINE_DAYS = 30

export const SERVER_TIMELINE_DAY_OPTIONS = [1, 7, 30] as const
export type ServerTimelineDays = (typeof SERVER_TIMELINE_DAY_OPTIONS)[number]
export const DEFAULT_SERVER_TIMELINE_DAYS: ServerTimelineDays = 30

export function parseServerTimelineDays(value: string | undefined): ServerTimelineDays {
  const parsed = Number(value)
  if (SERVER_TIMELINE_DAY_OPTIONS.includes(parsed as ServerTimelineDays)) {
    return parsed as ServerTimelineDays
  }
  return DEFAULT_SERVER_TIMELINE_DAYS
}

function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(decimals)}%`
}

function toResourceMetrics(
  snapshot: HostResourceSnapshot | null | undefined,
): ServerResourceMetrics | null {
  if (!snapshot) return null
  const { totalBytes, usedBytes, availableBytes, usagePercent } = snapshot
  const total = formatBytes(totalBytes)
  const used = formatBytes(usedBytes)
  const available = formatBytes(availableBytes)
  return {
    totalBytes,
    usedBytes,
    availableBytes,
    usagePercent,
    total,
    used,
    available,
    summary: `${used} / ${total} (${usagePercent.toFixed(2)}%)`,
  }
}

function hostStatusToAppStatus(
  currentStatus: string,
): "Operational" | "Degraded" | "Down" | "Unknown" {
  if (currentStatus === "Up") return "Operational"
  if (currentStatus === "Degraded") return "Degraded"
  if (currentStatus === "Down") return "Down"
  return "Unknown"
}

export async function getServerHostTimeline(
  serverId: number,
  days = HOST_TIMELINE_DAYS,
): Promise<HostMetricsTimeline | undefined> {
  try {
    return await tmsApi.getServerHostTimeline(serverId, days)
  } catch {
    return undefined
  }
}

export async function getServerDetail(
  id: number,
  days: ServerTimelineDays = DEFAULT_SERVER_TIMELINE_DAYS,
): Promise<ServerDetail | undefined> {
  const server = await getServerById(id)
  if (!server) return undefined

  const applications = (await getApplications()).filter((a) => a.serverId === id)
  const hostTimeline = await getServerHostTimeline(id, days)

  if (!hostTimeline) {
    return {
      server,
      applications,
      metrics: {
        status: "Unknown",
        cpu: "—",
        memory: "—",
        disk: "—",
        ram: null,
        diskUsage: null,
        availability: "No data",
        availabilityPercent: 0,
        lastChecked: null,
        cpuSparkline: [],
        memorySparkline: [],
        diskSparkline: [],
        timelineLabels: [],
        availabilityDays: [],
        timelineDays: days,
      },
    }
  }

  const ram = toResourceMetrics(hostTimeline.currentRam)
  const diskUsage = toResourceMetrics(hostTimeline.currentDisk)

  return {
    server,
    applications,
    metrics: {
      status: hostStatusToAppStatus(hostTimeline.currentStatus),
      cpu: formatPercent(hostTimeline.currentCpuUsage),
      memory: ram?.summary ?? "—",
      disk: diskUsage?.summary ?? "—",
      ram,
      diskUsage,
      availability:
        hostTimeline.totalChecks === 0
          ? "No data"
          : `${hostTimeline.uptimePercent.toFixed(2)}%`,
      availabilityPercent: hostTimeline.uptimePercent,
      lastChecked: hostTimeline.lastChecked,
      cpuSparkline: hostTimeline.points.map((p) => p.avgCpuUsage),
      memorySparkline: hostTimeline.points.map((p) => p.ram?.usagePercent ?? null),
      diskSparkline: hostTimeline.points.map((p) => p.disk?.usagePercent ?? null),
      timelineLabels: hostTimeline.points.map((p) => p.label),
      availabilityDays: hostTimeline.points.map(availabilityDayFromUptimePoint),
      timelineDays: hostTimeline.days,
    },
  }
}

/* --------------------------- Application Groups ------------------------- */

export async function getGroups(): Promise<ApplicationGroup[]> {
  const items = await tmsApi.listApplicationGroups()
  return [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getGroupById(id: number): Promise<ApplicationGroup | undefined> {
  try {
    const item = await tmsApi.getApplicationGroup(id)
    return item ?? undefined
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export async function getGroupOptions(): Promise<SelectOption[]> {
  return tmsApi.applicationGroupOptions()
}

export async function getGroupApplications(groupId: number): Promise<ApplicationView[]> {
  const [items, servers] = await Promise.all([
    tmsApi.applicationsByGroup(groupId),
    getServers().catch(() => [] as Server[]),
  ])
  const byId = new Map(servers.map((s) => [s.id, s]))
  return (items ?? [])
    .map((a) => toApplicationView(a, byId.get(a.serverId)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createGroupApi(body: { name: string }): Promise<ApplicationGroup> {
  return tmsApi.createApplicationGroup(body)
}

export async function updateGroupApi(id: number, body: { name: string }): Promise<boolean> {
  return tmsApi.updateApplicationGroup(id, body)
}

export async function deleteGroupApi(id: number): Promise<boolean> {
  return tmsApi.deleteApplicationGroup(id)
}

/* ------------------------------- Organizations ------------------------------ */

export async function getOrganizations(): Promise<Organization[]> {
  const items = await tmsApi.listOrganizations()
  return [...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  try {
    const item = await tmsApi.getOrganization(id)
    return item ?? undefined
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export async function getOrganizationOptions(): Promise<SelectOption[]> {
  return tmsApi.organizationOptions()
}

export async function createOrganizationApi(body: OrganizationUpsert): Promise<Organization> {
  return tmsApi.createOrganization(body)
}

export async function updateOrganizationApi(id: number, body: OrganizationUpsert): Promise<boolean> {
  return tmsApi.updateOrganization(id, body)
}

export async function deleteOrganizationApi(id: number): Promise<boolean> {
  return tmsApi.deleteOrganization(id)
}

/* ----------------------------- Applications ----------------------------- */

export async function getApplications(): Promise<ApplicationView[]> {
  const [items, servers] = await Promise.all([
    tmsApi.listApplications(),
    getServers().catch(() => [] as Server[]),
  ])
  const byId = new Map(servers.map((s) => [s.id, s]))
  return (items ?? [])
    .map((a) => toApplicationView(a, byId.get(a.serverId)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getApplicationById(id: number): Promise<ApplicationView | undefined> {
  try {
    const item = await tmsApi.getApplication(id)
    if (!item) return undefined
    const server = await getServerById(item.serverId).catch(() => undefined)
    return toApplicationView(item, server)
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

export async function createApplicationApi(body: ApplicationUpsert): Promise<Application> {
  return tmsApi.createApplication(body)
}

export async function updateApplicationApi(id: number, body: ApplicationUpsert): Promise<boolean> {
  return tmsApi.updateApplication(id, body)
}

export async function deleteApplicationApi(id: number): Promise<boolean> {
  return tmsApi.deleteApplication(id)
}

/* ------------------------------- Overview ------------------------------- */

export interface OverviewSummary {
  applicationsTotal: number
  applicationsHealthy: number
  serversTotal: number
  serversOnline: number
  avgUptime: string
  alertsCount: number
}

export interface ServerHealth {
  id: number
  name: string
  environment: string
  status: "Operational" | "Degraded"
  healthPercent: number
}

export interface OverviewData {
  lastUpdated: string
  dateRangeLabel: string
  summary: OverviewSummary
  applications: ApplicationView[]
  servers: ServerHealth[]
}

export async function getOverview(): Promise<OverviewData> {
  const [items, servers] = await Promise.all([
    tmsApi.listApplications(),
    getServers(),
  ])
  const byId = new Map(servers.map((s) => [s.id, s]))
  const apps = (items ?? [])
    .map((a) => toApplicationView(a, byId.get(a.serverId)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const warningServerIds = new Set(
    apps.filter((a) => a.status === "Degraded" || a.status === "Down").map((a) => a.serverId),
  )

  const avgUptime =
    apps.length === 0
      ? "100.00%"
      : `${(apps.reduce((sum, a) => sum + a.uptimePercent, 0) / apps.length).toFixed(2)}%`

  const today = new Date()
  return {
    lastUpdated: new Date().toISOString(),
    dateRangeLabel: today.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    summary: {
      applicationsTotal: apps.length,
      applicationsHealthy: apps.filter((a) => a.status === "Operational").length,
      serversTotal: servers.length,
      serversOnline: servers.length - warningServerIds.size,
      avgUptime,
      alertsCount: apps.filter((a) => a.status === "Degraded" || a.status === "Down").length,
    },
    applications: apps,
    servers: servers.map((s) => ({
      id: s.id,
      name: s.domain,
      environment: s.environment,
      status: warningServerIds.has(s.id) ? "Degraded" : "Operational",
      healthPercent: warningServerIds.has(s.id) ? 78 : 99,
    })),
  }
}

/* --------------------------- Application detail ------------------------- */

export interface HourSegment {
  hour: string
  status: DayStatus
  label?: string
  checks?: AvailabilityDay["checks"]
}

export interface DriftGroup {
  environment: string
  version: string
  serverCount: number
  isCurrent: boolean
}

export interface EndpointItem {
  name: string
  method: string
  path: string
  statusCode: string
}

export interface ApplicationDetail {
  app: ApplicationView
  owner: string
  runtime: string
  repository: string
  repositoryUrl: string
  hasVersionDrift: boolean
  uptimeTimeline: UptimeTimeline | null
  todayUptimeTimeline: UptimeTimeline | null
  availabilityDays: ReturnType<typeof availabilityDays>
  todayTimeline: AvailabilityDay[]
  /** API `to` timestamp for today's hourly timeline (used to dim future hours). */
  todayTimelineAsOf: string | null
  health: {
    availability: string
    availabilityPercent: number
    currentUptime: string
    lastRestart: string
    cpu: string
    memory: string
    disk: string
  }
  performance: {
    requestsPerSec: string
    avgResponseMs: string
    errorRate: string
    p95LatencyMs: string
    cpuSparkline: number[]
    memorySparkline: number[]
    requestsSparkline: number[]
  }
  versionDrift: DriftGroup[]
  endpoints: EndpointItem[]
}

export function uptimeStatusToDayStatus(status: UptimePointStatus): DayStatus {
  if (status === "Up") return "Healthy"
  if (status === "Degraded") return "Partial"
  if (status === "Down") return "Down"
  return "NoData"
}

export function uptimeTimelineToAvailabilityDays(timeline: UptimeTimeline): AvailabilityDay[] {
  return timeline.points.map(availabilityDayFromUptimePoint)
}

function fallbackTodayTimeline(
  app: Pick<Application, "id" | "status">,
): AvailabilityDay[] {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const isDown = app.status === "Down"
  const isDegraded = app.status === "Degraded"
  return Array.from({ length: 24 }, (_, hour) => {
    let status: DayStatus = "NoData"
    if (isDown && hour >= 8) status = "Down"
    else if (isDegraded && (hour === 4 || hour === 5)) status = "Down"
    else if (!isDown && !isDegraded && hour === 12) status = "Partial"
    const date = new Date(end)
    date.setUTCHours(hour, 0, 0, 0)
    const label = `${String(hour).padStart(2, "0")}:00`
    return {
      date: date.toISOString(),
      label,
      status,
    }
  })
}

export async function getApplicationUptimeTimeline(
  applicationId: number,
  query: number | ApplicationUptimeTimelineQuery = 30,
): Promise<UptimeTimeline | undefined> {
  try {
    return await tmsApi.getApplicationUptimeTimeline(applicationId, query)
  } catch {
    return undefined
  }
}

export async function getApplicationDetail(id: number): Promise<ApplicationDetail | undefined> {
  const app = await getApplicationById(id)
  if (!app) return undefined

  const allApps = await getApplications().catch(() => [app])
  const isDown = app.status === "Down"
  const isDegraded = app.status === "Degraded"
  const [uptimeTimeline, todayUptimeTimeline] = await Promise.all([
    getApplicationUptimeTimeline(app.id, 30),
    getApplicationUptimeTimeline(app.id, 1),
  ])
  const days = uptimeTimeline?.points?.length
    ? uptimeTimelineToAvailabilityDays(uptimeTimeline)
    : availabilityDays(app)
  const healthyDays = days.filter((d) => d.status === "Healthy").length
  const availPct = uptimeTimeline
    ? uptimeTimeline.uptimePercent
    : days.length === 0
    ? 100
    : (100 * healthyDays) / days.length

  const sameName = allApps.filter((a) => a.name.toLowerCase() === app.name.toLowerCase())
  const hasVersionDrift = new Set(sameName.map((a) => a.version.toLowerCase())).size > 1

  const todayTimeline = todayUptimeTimeline?.points?.length
    ? uptimeTimelineToAvailabilityDays(todayUptimeTimeline)
    : fallbackTodayTimeline(app)

  const driftByEnv = new Map<string, DriftGroup>()
  for (const a of sameName) {
    const env = String(a.serverEnvironment || "Live")
    if (!driftByEnv.has(env)) {
      driftByEnv.set(env, {
        environment: env,
        version: a.version,
        serverCount: 0,
        isCurrent: false,
      })
    }
    const group = driftByEnv.get(env)!
    group.serverCount += 1
    if (a.id === app.id) group.isCurrent = true
  }

  return {
    app,
    owner: String(app.serverProvider),
    runtime: String(app.serverInternalExternal),
    repository: app.repositoryUrl || app.commit,
    repositoryUrl: app.repositoryUrl || "#",
    hasVersionDrift,
    uptimeTimeline: uptimeTimeline ?? null,
    todayUptimeTimeline: todayUptimeTimeline ?? null,
    availabilityDays: days,
    todayTimeline,
    todayTimelineAsOf: todayUptimeTimeline?.to ?? null,
    health: {
      availability:
        uptimeTimeline?.totalChecks === 0
          ? "No uptime data"
          : `${availPct.toFixed(2)}%`,
      availabilityPercent: availPct,
      currentUptime:
        uptimeTimeline?.totalChecks === 0
          ? "No uptime data"
          : isDown
          ? "0m"
          : `${healthyDays}d (30d window)`,
      lastRestart: app.lastDeployment
        ? new Date(app.lastDeployment).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
      cpu: isDown ? "0%" : isDegraded ? "68%" : "31%",
      memory: isDown ? "0 GB / 8 GB" : isDegraded ? "5.2 GB / 8 GB" : "2.4 GB / 8 GB",
      disk: "52%",
    },
    performance: {
      requestsPerSec: isDown ? "0" : "42",
      avgResponseMs: String(averageLatency(app)),
      errorRate: isDown ? "100%" : isDegraded ? "2.4%" : "0.08%",
      p95LatencyMs: isDown ? "-" : "148",
      cpuSparkline: [12, 18, 16, 22, 28, 35, 30, 24, 20, 18, 22, 28],
      memorySparkline: [40, 42, 45, 48, 52, 55, 58, 56, 50, 48, 46, 44],
      requestsSparkline: [20, 28, 35, 40, 38, 45, 50, 42, 36, 30, 34, 42],
    },
    versionDrift: [...driftByEnv.values()],
    endpoints: [
      {
        name: "App URL",
        method: "GET",
        path: app.appUrl || app.serverDomain,
        statusCode: isDown ? "Down" : "OK",
      },
      {
        name: "Host",
        method: "TCP",
        path: `${app.serverDomain} / ${app.serverIpAddress}`,
        statusCode: isDown ? "Down" : "OK",
      },
    ],
  }
}

/* ------------------------------- Roadmap -------------------------------- */

export interface RoadmapItem {
  title: string
  description: string
  tag: string
}

export interface RoadmapData {
  ideas: RoadmapItem[]
  inProgress: RoadmapItem[]
  shipped: RoadmapItem[]
}

/** Roadmap has no API endpoint yet. */
export async function getRoadmap(): Promise<RoadmapData> {
  return {
    ideas: [
      {
        title: "New Deployment Notification",
        description: "Send notification to team when new deployment is deployed.",
        tag: "Notification",
      },
      {
        title: "Reporting",
        description: "Generate reports for applications and servers.",
        tag: "Reporting",
      },
      {
        title: "Alert and notification",
        description: "Send alert and notification to team when application is down or degraded.",
        tag: "Notification",
      },
      {
        title: "Log Analyzer",
        description: "Analyze logs across all applications and servers.",
        tag: "Observability",
      }
    ],
    inProgress: [
      {
        title: "Centralized logs viewer",
        description: "Search and filter app logs across all servers in one place.",
        tag: "Observability",
      },
      {
        title: "Centralize agent config",
        description: "Centralize the configuration of the application monitoring agent.",
        tag: "Configuration",
      },
      {
        title: "Application configuration",
        description: "Centralize the configuration of the application for agents",
        tag: "Configuration",
      },
      {
        title: "Organization management",
        description: "Manage organizations and their servers.",
        tag: "Configuration",
      },
      {
        title: "Dependency Graph and Editor (BETA)",
        description: "Visualize the dependency graph of applications. ",
        tag: "Observability",
      }
    ],
    shipped: [
      {
        title: "Application Monitoring",
        description: "Monitor application version and deployment status.",
        tag: "Monitoring",
      },
      {
        title: "Server Tracking",
        description: "Track server for all environments.",
        tag: "Tracking",
      },
      {
        title: "Availability Monitoring",
        description: "Monitor applications availability and uptime.",
        tag: "Monitoring",
      },
      {
        title: "App Platform Agent",
        description: "Agent to monitor application performance and uptime in background.",
        tag: "Monitoring",
      },
      {
        title: "Server Monitoring",
        description: "Monitor server metrics and uptime.",
        tag: "Monitoring",
      }
    ],
  }
}
