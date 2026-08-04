import { formatDateTime } from "./format"
import type {
  Agent,
  ApplicationDeployment,
  ApplicationGroup,
  ApplicationView,
  Organization,
  Server,
  UptimeTimeline,
} from "./types"
import type { CsvColumn } from "./export-csv"
import { organizationCodeById, resolveApplicationLiveStatus } from "./view"

export const organizationCsvColumns: CsvColumn<Organization>[] = [
  { header: "ID", value: (row) => row.id },
  { header: "Code", value: (row) => row.code },
  { header: "Name", value: (row) => row.name },
]

export function applicationGroupCsvColumns(
  appCounts: Record<number, number>,
): CsvColumn<ApplicationGroup>[] {
  return [
    { header: "ID", value: (row) => row.id },
    { header: "Name", value: (row) => row.name },
    { header: "Applications", value: (row) => appCounts[row.id] ?? 0 },
  ]
}

export function applicationCsvColumns(
  uptimeTimelines?: Record<number, UptimeTimeline | undefined>,
): CsvColumn<ApplicationView>[] {
  return [
    { header: "ID", value: (row) => row.id },
    { header: "Name", value: (row) => row.name },
    { header: "UID", value: (row) => row.uid ?? "" },
    { header: "Group", value: (row) => row.applicationGroupName },
    { header: "Version", value: (row) => row.version },
    { header: "Commit", value: (row) => row.commit },
    {
      header: "Status",
      value: (row) => resolveApplicationLiveStatus(row, uptimeTimelines?.[row.id]),
    },
    { header: "Server", value: (row) => row.serverDomain },
    { header: "Server IP", value: (row) => row.serverIpAddress },
    { header: "Environment", value: (row) => row.serverEnvironment },
    { header: "Uptime", value: (row) => row.uptime },
    {
      header: "Last Deployment",
      value: (row) => (row.lastDeployment ? formatDateTime(row.lastDeployment) : ""),
    },
    { header: "App URL", value: (row) => row.appUrl },
    { header: "Repository URL", value: (row) => row.repositoryUrl },
  ]
}

export function serverCsvColumns(
  organizations: Organization[],
): CsvColumn<Server>[] {
  return [
    { header: "ID", value: (row) => row.id },
    {
      header: "Company Code",
      value: (row) => organizationCodeById(organizations, row.organizationId),
    },
    { header: "Domain", value: (row) => row.domain },
    { header: "IP Address", value: (row) => row.ipAddress },
    { header: "Environment", value: (row) => row.environment },
    { header: "Scope", value: (row) => row.internalExternal },
    { header: "Provider", value: (row) => row.provider },
    { header: "Country", value: (row) => row.country },
  ]
}

export const agentCsvColumns: CsvColumn<Agent>[] = [
  { header: "ID", value: (row) => row.id },
  { header: "Name", value: (row) => row.name },
  { header: "UID", value: (row) => row.uid },
  { header: "Server", value: (row) => row.serverDomain },
  { header: "Status", value: (row) => row.status },
  {
    header: "Last Seen",
    value: (row) => (row.lastSeenAt ? formatDateTime(row.lastSeenAt) : ""),
  },
  {
    header: "Created At",
    value: (row) => (row.createdAt ? formatDateTime(row.createdAt) : ""),
  },
]

export const deploymentCsvColumns: CsvColumn<ApplicationDeployment>[] = [
  { header: "ID", value: (row) => row.id },
  { header: "Application ID", value: (row) => row.applicationId },
  {
    header: "Application",
    value: (row) => row.applicationName || `App #${row.applicationId}`,
  },
  { header: "Version", value: (row) => row.version },
  { header: "Commit", value: (row) => row.commitNo },
  { header: "Timestamp", value: (row) => row.timestamp },
]
