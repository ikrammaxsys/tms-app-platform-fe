import type { Agent, AgentApi, AgentListItem, AgentReadyStatus, AgentStatus } from "./types"

export const AGENT_DISCONNECTED_THRESHOLD_MS = 60_000

export function isAgentDisconnected(lastReadyAt: string | null): boolean {
  if (!lastReadyAt) return false
  const parsed = new Date(lastReadyAt)
  if (Number.isNaN(parsed.getTime())) return false
  return Date.now() - parsed.getTime() > AGENT_DISCONNECTED_THRESHOLD_MS
}

export function resolveAgentStatus(
  apiStatus: string,
  lastReadyAt: string | null,
): AgentStatus {
  if (isAgentDisconnected(lastReadyAt)) return "disconnected"
  return normalizeAgentStatus(apiStatus)
}

export function generateAgentUid(): string {
  const suffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `agent-${suffix}`
}

export function generateAgentToken(): string {
  const raw =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  return `tms_${raw}`
}

export function normalizeAgentStatus(status: string): AgentStatus {
  const value = status.trim().toLowerCase()
  if (value === "ready") return "ready"
  if (value === "installed") return "installed"
  if (value === "offline") return "offline"
  if (value === "disconnected") return "disconnected"
  return "pending"
}

export function mapAgentFromApi(item: AgentApi): Agent {
  const lastSeenAt = item.lastReadyAt || null
  const status = resolveAgentStatus(item.status, lastSeenAt)
  return {
    id: item.id,
    uid: item.uid,
    name: item.name,
    serverId: item.serverId,
    serverDomain: item.serverDomain,
    token: item.authToken,
    status,
    createdAt: item.createdAt,
    lastSeenAt,
    connectionMessage: null,
  }
}

export function mapAgentListItem(item: AgentListItem): Agent {
  const lastSeenAt = item.lastReadyAt || null
  const status = resolveAgentStatus(item.status, lastSeenAt)
  return {
    id: item.id,
    uid: item.uid,
    name: item.name,
    serverId: item.serverId,
    serverDomain: item.serverDomain,
    token: "",
    status,
    createdAt: item.createdAt,
    lastSeenAt,
    connectionMessage: null,
  }
}

export function mapReadyStatusToAgentPatch(
  agent: Agent,
  ready: AgentReadyStatus,
): Agent {
  const lastSeenAt = ready.lastReadyAt || null
  const status = resolveAgentStatus(ready.status, lastSeenAt)
  return {
    ...agent,
    status,
    lastSeenAt,
    connectionMessage:
      status === "disconnected"
        ? "Agent last reported ready more than 1 minute ago."
        : status === "ready"
          ? "Agent reported ready and responding to health checks."
          : `Waiting for agent ready callback. Current status: ${ready.status}.`,
  }
}

export function readyStatusMessage(ready: AgentReadyStatus): string {
  const lastSeenAt = ready.lastReadyAt || null
  const status = resolveAgentStatus(ready.status, lastSeenAt)
  if (status === "disconnected") {
    return "Agent is disconnected — last ready signal was more than 1 minute ago."
  }
  if (status === "ready") {
    return "Agent is ready and responding."
  }
  return `Agent status: ${ready.status}. Waiting for POST /api/agents/${ready.agentUid}/ready.`
}
