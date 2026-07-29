import { ApiError } from "./api"
import { tmsApi } from "./api-service"
import {
  availabilityDays,
  averageLatency,
  availabilityDayFromUptimePoint,
  toApplicationView,
} from "./view"
import type {
  Application,
  ApplicationGroup,
  ApplicationUpsert,
  ApplicationView,
  AvailabilityDay,
  DayStatus,
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
  days = 30,
): Promise<UptimeTimeline | undefined> {
  try {
    return await tmsApi.getApplicationUptimeTimeline(applicationId, days)
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
        title: "Centralized logs viewer",
        description: "Search and filter app logs across all servers in one place.",
        tag: "Observability",
      },
      {
        title: "New Deployment Notification",
        description: "Send notification to team when new deployment is deployed.",
        tag: "Notification",
      },
      {
        title: "Centralize agent config",
        description: "Centralize the configuration of the application monitoring agent.",
        tag: "Configuration",
      }
    ],
    inProgress: [
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
        description: "Agent to monitor application performance and latency in background.",
        tag: "Monitoring",
      },
    ],
    shipped: [],
  }
}
