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
import { collectDailyUptimeColumns, type ApplicationReportRow, type ServerReportRow } from "./reporting"
import { organizationCodeById, resolveApplicationLiveStatus, uptimePercentCellStyle } from "./view"

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

const APPLICATION_REPORT_BASE_COLUMNS: CsvColumn<ApplicationReportRow>[] = [
  { header: "ID", value: (row) => row.app.id },
  { header: "Name", value: (row) => row.app.name },
  { header: "UID", value: (row) => row.app.uid ?? "" },
  { header: "Status", value: (row) => row.liveStatus },
  {
    header: "Overall Uptime %",
    value: (row) => (row.uptimePercent !== null ? row.uptimePercent.toFixed(2) : ""),
    cellStyle: (row) => uptimePercentCellStyle(row.uptimePercent),
  },
  { header: "Total Checks", value: (row) => row.totalChecks },
  { header: "Up Checks", value: (row) => row.upCount },
  { header: "Degraded Checks", value: (row) => row.degradedCount },
  { header: "Down Checks", value: (row) => row.downCount },
  { header: "Group", value: (row) => row.app.applicationGroupName },
  { header: "Version", value: (row) => row.app.version },
  { header: "Commit", value: (row) => row.app.commit },
  { header: "Version Drift", value: (row) => (row.hasVersionDrift ? "Yes" : "No") },
  { header: "Server", value: (row) => row.app.serverDomain },
  { header: "Server IP", value: (row) => row.app.serverIpAddress },
  { header: "Environment", value: (row) => row.app.serverEnvironment },
]

const APPLICATION_REPORT_TRAILING_COLUMNS: CsvColumn<ApplicationReportRow>[] = [
  {
    header: "Last Checked",
    value: (row) => (row.lastChecked ? formatDateTime(row.lastChecked) : ""),
  },
  {
    header: "Last Deployment",
    value: (row) => (row.app.lastDeployment ? formatDateTime(row.app.lastDeployment) : ""),
  },
  { header: "App URL", value: (row) => row.app.appUrl },
]

export function applicationReportCsvColumns(
  rows: ApplicationReportRow[],
): CsvColumn<ApplicationReportRow>[] {
  const dayColumns: CsvColumn<ApplicationReportRow>[] = collectDailyUptimeColumns(rows).map(
    (day) => ({
      header: `${day.label}`,
      value: (row) => {
        const entry = row.dailyUptime.find((d) => d.date === day.date)
        if (!entry || entry.uptimePercent === null) return ""
        return entry.uptimePercent.toFixed(2)
      },
      cellStyle: (row) => {
        const entry = row.dailyUptime.find((d) => d.date === day.date)
        return uptimePercentCellStyle(entry?.uptimePercent ?? null)
      },
    }),
  )

  return [
    ...APPLICATION_REPORT_BASE_COLUMNS,
    ...dayColumns,
    ...APPLICATION_REPORT_TRAILING_COLUMNS,
  ]
}

export const serverReportCsvColumns: CsvColumn<ServerReportRow>[] = [
  { header: "ID", value: (row) => row.server.id },
  { header: "Domain", value: (row) => row.server.domain },
  { header: "IP Address", value: (row) => row.server.ipAddress },
  { header: "Status", value: (row) => row.status },
  { header: "Organization", value: (row) => row.organizationName },
  { header: "Environment", value: (row) => row.server.environment },
  { header: "Provider", value: (row) => row.server.provider },
  { header: "Scope", value: (row) => row.server.internalExternal },
  { header: "Country", value: (row) => row.server.country },
  { header: "CPU %", value: (row) => (row.cpuUsage !== null ? row.cpuUsage.toFixed(2) : "") },
  {
    header: "RAM %",
    value: (row) => (row.ramUsagePercent !== null ? row.ramUsagePercent.toFixed(2) : ""),
  },
  {
    header: "Disk %",
    value: (row) => (row.diskUsagePercent !== null ? row.diskUsagePercent.toFixed(2) : ""),
  },
  {
    header: "Uptime %",
    value: (row) => (row.uptimePercent !== null ? row.uptimePercent.toFixed(2) : ""),
  },
  { header: "Total Checks", value: (row) => row.totalChecks },
  { header: "Up Checks", value: (row) => row.upCount },
  { header: "Degraded Checks", value: (row) => row.degradedCount },
  { header: "Down Checks", value: (row) => row.downCount },
  { header: "App Count", value: (row) => row.appCount },
  { header: "Apps Operational", value: (row) => row.appsOperational },
  { header: "Apps Degraded", value: (row) => row.appsDegraded },
  { header: "Apps Down", value: (row) => row.appsDown },
  {
    header: "Last Checked",
    value: (row) => (row.lastChecked ? formatDateTime(row.lastChecked) : ""),
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
