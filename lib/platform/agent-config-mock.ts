import type { Agent } from "./types"

export interface AgentConfigThresholds {
  cpuUsagePercent: number
  memoryUsagePercent: number
  diskUsagePercent: number
}

export interface AgentConfigHostMetrics {
  enabled: boolean
  hostId: string
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
        hostId: agent.serverDomain,
        thresholds: {
          cpuUsagePercent: 90,
          memoryUsagePercent: 90,
          diskUsagePercent: 90,
        },
      },
    },
    applications: [
      {
        appId: "T0005",
        name: "Acl App",
        url: "http://localhost:5043/api/index",
        logs_path: "C:/Users/muhammad_ikram/authacl/Logs",
        enabled: true,
      },
    ],
    intervalMs: 60_000,
    logScanning: {
      enabled: true,
      intervalMs: 10_000,
      linesPerScan: 100,
      progressDir: "./log-progress",
      ingestEndpoint: `${baseUrl}/api/application-logs/ingest`,
    },
  }
}

export interface EntityAgentConfigSettings {
  uptimeMonitoringEnabled: boolean
  logMonitoringEnabled: boolean
}

export function defaultEntityAgentConfigSettings(): EntityAgentConfigSettings {
  return {
    uptimeMonitoringEnabled: true,
    logMonitoringEnabled: false,
  }
}
