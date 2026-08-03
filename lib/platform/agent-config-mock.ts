import type { Agent, Application } from "./types"
import { boolFromApiFlag } from "./application-monitoring"

export interface AgentConfigThresholds {
  cpuUsagePercent: number
  memoryUsagePercent: number
  diskUsagePercent: number
}

export interface AgentConfigHostMetrics {
  enabled: boolean
  hostId: string
  hostIp: string
  thresholds: AgentConfigThresholds
}

export interface AgentConfigApplication {
  appId: string
  name: string
  url: string
  logs_path: string
  enabled: boolean
}

export interface AgentConfigCentral {
  baseUrl: string
  endpointGetMonitoredApps: string
  applicationUptimeReportEndpoint: string
  hostMetricsReportEndpoint: string
  updateSelfReadness: string
}

export interface AgentConfigLogScanning {
  enabled: boolean
  intervalMs: number
  linesPerScan: number
  progressDir: string
  ingestEndpoint: string
}

export interface AgentConfig {
  agentUid: string
  token: string
  central: AgentConfigCentral
  host: {
    metrics: AgentConfigHostMetrics
  }
  applications: AgentConfigApplication[]
  intervalMs: number
  logScanning: AgentConfigLogScanning
}

function platformBaseUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "")
    return `${origin}/backend-api`
  }
  return "http://localhost:5128"
}

export function buildDefaultAgentConfig(
  agent: Pick<Agent, "uid" | "token" | "serverDomain">,
  hostIp = "",
): AgentConfig {
  const baseUrl = platformBaseUrl()

  return {
    agentUid: agent.uid,
    token: agent.token,
    central: {
      baseUrl,
      endpointGetMonitoredApps: "/api/uptime/get-monitored-apps",
      applicationUptimeReportEndpoint: "/api/uptime/report",
      hostMetricsReportEndpoint: "/api/uptime/report-host",
      updateSelfReadness: `/api/agents/${agent.uid}/ready`,
    },
    host: {
      metrics: {
        enabled: true,
        hostIp: hostIp,
        hostId: agent.serverDomain,
        thresholds: {
          cpuUsagePercent: 90,
          memoryUsagePercent: 90,
          diskUsagePercent: 90,
        },
      },
    },
    applications: [],
    intervalMs: 60_000,
    logScanning: {
      enabled: true,
      intervalMs: 10_000,
      linesPerScan: 500,
      progressDir: "./log-progress",
      ingestEndpoint: `${baseUrl}/api/application-logs/ingest`,
    },
  }
}

function normalizeApplication(app: Partial<AgentConfigApplication>): AgentConfigApplication {
  return {
    appId: app.appId ?? "",
    name: app.name ?? "",
    url: app.url ?? "",
    logs_path: app.logs_path ?? "",
    enabled: app.enabled ?? true,
  }
}

export function applicationToConfigApp(app: Application): AgentConfigApplication {
  const appId = app.uid ?? `app-${app.id}`
  return normalizeApplication({
    appId,
    name: app.name,
    url: app.healthcheckUrl ?? app.appUrl ?? "",
    logs_path: app.logsPath ?? "",
    enabled: boolFromApiFlag(app.isHealthcheck, false),
  })
}

export function buildApplicationsFromRecords(
  serverApplications: Application[],
): AgentConfigApplication[] {
  return serverApplications.map(applicationToConfigApp)
}

function resolveHostIp(serverApplications: Application[]): string {
  return serverApplications.find((app) => app.serverIpAddress)?.serverIpAddress ?? ""
}

/** Full expected config generated from platform template + application records. */
export function buildTemplateAgentConfig(
  agent: Pick<Agent, "uid" | "token" | "serverDomain">,
  serverApplications: Application[] = [],
): AgentConfig {
  const hostIp = resolveHostIp(serverApplications)
  return {
    ...buildDefaultAgentConfig(agent, hostIp),
    applications: buildApplicationsFromRecords(serverApplications),
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

function normalizeConfigForCompare(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

export function agentConfigDrifted(
  savedJson: string | null | undefined,
  template: AgentConfig,
): boolean {
  if (!savedJson?.trim() || savedJson.trim() === "{}") {
    return normalizeConfigForCompare(template) !== normalizeConfigForCompare({})
  }

  try {
    const saved = JSON.parse(savedJson) as unknown
    return normalizeConfigForCompare(saved) !== normalizeConfigForCompare(template)
  } catch {
    return true
  }
}

export interface AnnotatedJsonLine {
  text: string
  drifted: boolean
  lineNumber: number
}

export function annotateJsonDriftLinesFromTemplate(
  json: string,
  template: AgentConfig,
): AnnotatedJsonLine[] {
  let savedObj: unknown
  try {
    savedObj = JSON.parse(json)
  } catch {
    return formatConfigJson(json).split("\n").map((text, index) => ({
      text,
      drifted: true,
      lineNumber: index + 1,
    }))
  }

  const templateObj = JSON.parse(serializeAgentConfig(template)) as unknown
  const savedLines = JSON.stringify(sortKeysDeep(savedObj), null, 2).split("\n")
  const templateLines = JSON.stringify(sortKeysDeep(templateObj), null, 2).split("\n")

  return savedLines.map((text, index) => ({
    text,
    drifted: text.trim() !== (templateLines[index] ?? "").trim(),
    lineNumber: index + 1,
  }))
}

export function parseAgentConfig(
  configJson: string | null | undefined,
  agent: Pick<Agent, "uid" | "token" | "serverDomain">,
  serverApplications: Application[] = [],
): AgentConfig {
  const hostIp = resolveHostIp(serverApplications)
  const defaults = buildDefaultAgentConfig(agent, hostIp)
  const serverApps = buildApplicationsFromRecords(serverApplications)

  if (!configJson?.trim() || configJson.trim() === "{}") {
    return { ...defaults, applications: serverApps }
  }

  try {
    const parsed = JSON.parse(configJson) as Partial<AgentConfig>
    return {
      ...defaults,
      ...parsed,
      agentUid: parsed.agentUid ?? agent.uid,
      token: parsed.token ?? agent.token,
      central: { ...defaults.central, ...parsed.central },
      host: {
        metrics: {
          ...defaults.host.metrics,
          ...parsed.host?.metrics,
          hostIp: parsed.host?.metrics?.hostIp ?? defaults.host.metrics.hostIp,
          thresholds: {
            ...defaults.host.metrics.thresholds,
            ...parsed.host?.metrics?.thresholds,
          },
        },
      },
      applications: serverApps,
      logScanning: { ...defaults.logScanning, ...parsed.logScanning },
      intervalMs: parsed.intervalMs ?? defaults.intervalMs,
    }
  } catch {
    return { ...defaults, applications: serverApps }
  }
}

export function formatConfigJson(json: string): string {
  if (!json.trim()) return "{}"
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

export function serializeAgentConfig(config: AgentConfig): string {
  return JSON.stringify(config, null, 2)
}

export interface EntityAgentConfigSettings {
  uptimeMonitoringEnabled: boolean
  logMonitoringEnabled: boolean
  logPath: string
  healthcheckUrl: string
}

export function defaultEntityAgentConfigSettings(
  overrides: Partial<EntityAgentConfigSettings> = {},
): EntityAgentConfigSettings {
  return {
    uptimeMonitoringEnabled: true,
    logMonitoringEnabled: false,
    logPath: "",
    healthcheckUrl: "",
    ...overrides,
  }
}
