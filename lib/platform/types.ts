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
}

export interface ServerUpsert {
  domain: string
  ipAddress: string
  environment: string
  internalExternal: string
  country: string
  provider: string
}

/** Matches ApplicationGroupItem from the .NET API. */
export interface ApplicationGroup {
  id: number
  name: string
}

export interface ApplicationGroupUpsert {
  name: string
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
