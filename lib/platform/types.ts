export type Environment = "Live" | "Test" | "Development"
export type InternalExternal = "Internal" | "External"
export type Provider = "AWS" | "On-premise" | "Vendor" | "Azure"
export type AppStatus = "Operational" | "Degraded" | "Down" | "Inactive" | "Unknown"
/** Per-day / per-hour uptime strip bucket (not the same as live app status). */
export type DayStatus = "Healthy" | "Partial" | "Down" | "NoData"

export type UptimePointStatus = "Up" | "Down" | "Degraded" | "NoData"

export interface UptimeTimelinePoint {
  label: string
  from: string
  to: string
  uptimePercent: number | null
  status: UptimePointStatus
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
}

export interface UptimeTimeline {
  applicationId: number
  isOnline: boolean
  currentStatus: string
  lastChecked: string
  days: number
  granularity: string
  from: string
  to: string
  uptimePercent: number
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
  points: UptimeTimelinePoint[]
}

export interface HostResourceSnapshot {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
}

export interface HostMetricsTimelinePoint extends UptimeTimelinePoint {
  avgCpuUsage: number | null
  ram: HostResourceSnapshot | null
  disk: HostResourceSnapshot | null
}

export interface HostMetricsTimeline {
  serverId: number
  isOnline: boolean
  currentStatus: string
  lastChecked: string
  currentCpuUsage: number
  currentRam: HostResourceSnapshot
  currentDisk: HostResourceSnapshot
  days: number
  granularity: string
  from: string
  to: string
  uptimePercent: number
  totalChecks: number
  upCount: number
  degradedCount: number
  downCount: number
  points: HostMetricsTimelinePoint[]
}

/** Matches ApiResponse<T> from tms-template-net8. */
export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T | null
  errors: string[]
  timestamp: string
}

/** Matches ServerItem from the .NET API. */
export interface Server {
  id: number
  ipAddress: string
  environment: Environment
  internalExternal: InternalExternal
  country: string
  provider: Provider
  domain: string
  organizationId: number
  organizationName?: string
}

export interface ServerUpsert {
  domain: string
  ipAddress: string
  environment: string
  internalExternal: string
  country: string
  provider: string
  organizationId: number
}

/** Matches ApplicationGroupItem from the .NET API. */
export interface ApplicationGroup {
  id: number
  name: string
}

export interface ApplicationGroupUpsert {
  name: string
}

/** Matches OrganizationItem from the .NET API. */
export interface Organization {
  id: number
  name: string
  code: string
}

export interface OrganizationUpsert {
  name: string
  code: string
}

/** Matches ApplicationItem from the .NET API. */
export interface Application {
  id: number
  uid?: string
  name: string
  version: string
  commit: string
  status: AppStatus
  lastDeployment: string | null
  appUrl: string
  repositoryUrl: string
  serverId: number
  applicationGroupId: number
  serverDomain: string
  serverEnvironment: Environment | string
  serverIpAddress: string
  applicationGroupName: string
  isOnline?: boolean
  healthcheckUrl?: string | null
  isHealthcheck?: number | null
  logsPath?: string | null
  isScaningLogs?: number | null
  serverDetail?: {
    domain?: string
    environment?: string
    ipAddress?: string
    internalExternal?: string
    country?: string
    provider?: string
  } | null
}

export interface ApplicationUpsert {
  uid?: string
  name: string
  version: string
  commit: string
  status: string
  lastDeployment: string | null
  appUrl: string
  repositoryUrl: string
  serverId: number
  applicationGroupId: number
  healthcheckUrl?: string | null
  isHealthcheck?: number | null
  logsPath?: string | null
  isScaningLogs?: number | null
}

/** Application joined with display helpers for tables / detail. */
export interface ApplicationView extends Application {
  serverProvider: Provider | string
  serverInternalExternal: InternalExternal | string
  initial: string
  avatarColor: string
  uptime: string
  uptimePercent: number
}

export interface AvailabilityDayChecks {
  totalChecks: number
  upCount: number
  downCount: number
  degradedCount: number
}

export interface AvailabilityDay {
  date: string
  label: string
  status: DayStatus
  checks?: AvailabilityDayChecks
}

export interface SelectOption {
  value: string
  text: string
}

/** Matches ApplicationDeploymentItem from the .NET API. */
export interface ApplicationDeployment {
  id: number
  applicationId: number
  commitNo: string
  version: string
  timestamp: string
  applicationName: string
}

export interface ApplicationDeploymentUpsert {
  applicationId: number
  commitNo: string
  version: string
  timestamp: string
}

/** Matches ApplicationLogChunkItem from the .NET API. */
export interface ApplicationLogChunk {
  id: number
  name: string
  path: string
  size: string
  remoteName: string
}

/** Matches ApplicationLogDateItem from the .NET API. */
export interface ApplicationLogDate {
  applicationLogId: number
  date: string
  remoteBasePath: string
  chunks: ApplicationLogChunk[]
}

/** Matches ApplicationLogListResponse from the .NET API. */
export interface ApplicationLogList {
  applicationId: number
  appUid: string
  applicationName: string
  dates: ApplicationLogDate[]
}

export interface ApplicationLogEntry {
  date: string
  label: string
  content: string
}

export type AgentStatus = "pending" | "installed" | "ready" | "offline" | "disconnected"

/** Agent row from GET /api/agents/list (flat array, no wrapper). */
export interface AgentListItem {
  id: number
  uid: string
  name: string
  serverId: number
  serverDomain: string
  serverEnvironment: string
  status: string
  lastReadyAt: string | null
  createdAt: string
}

/** Agent from GET/POST /api/agents/{id}. */
export interface AgentApi {
  id: number
  uid: string
  name: string
  serverId: number
  authToken: string
  status: string
  lastReadyAt: string | null
  createdAt: string
  serverDomain: string
  serverEnvironment: string
}

export interface AgentUpsertRequest {
  name: string
  uid?: string
  serverId: number
  authToken?: string
}

/** Readiness status from GET /api/agents/{agentUid}/ready. */
export interface AgentReadyStatus {
  agentUid: string
  name: string
  status: string
  lastReadyAt: string | null
  serverDomain: string
}

/** Agent config from GET/PUT /api/agents/{agentUid}/config. */
export interface AgentConfigRecord {
  agentUid: string
  configJson: string
}

export interface AgentConfigUpdateRequest {
  configJson: string
}

/** Platform monitoring agent — UI view model. */
export interface Agent {
  id: number
  uid: string
  name: string
  serverId: number
  serverDomain: string
  token: string
  status: AgentStatus
  createdAt: string
  lastSeenAt: string | null
  connectionMessage: string | null
}

export interface AgentUpsert {
  name: string
  serverId: number
  uid?: string
  authToken?: string
}

/** Matches ApplicationLogChunkResponse from the .NET API. */
export interface ApplicationLogChunkContent {
  chunkId: number
  chunkName: string
  path: string
  size: string
  hasNext: boolean
  nextChunk: string | null
  logJson: ApplicationLogEntry[]
}
