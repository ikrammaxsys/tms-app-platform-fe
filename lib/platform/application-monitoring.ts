import type { Application, ApplicationUpsert } from "./types"
import type { EntityAgentConfigSettings } from "./agent-config-mock"

export function boolFromApiFlag(value: number | boolean | undefined | null, defaultValue = false): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === "boolean") return value
  return value !== 0
}

export function apiFlagFromBool(value: boolean): number {
  return value ? 1 : 0
}

export function applicationToMonitoringSettings(app: Application): EntityAgentConfigSettings {
  return {
    uptimeMonitoringEnabled: boolFromApiFlag(app.isHealthcheck, false),
    logMonitoringEnabled: boolFromApiFlag(app.isScaningLogs, false),
    healthcheckUrl: app.healthcheckUrl ?? app.appUrl ?? "",
    logPath: app.logsPath ?? "",
  }
}

export function monitoringSettingsToApplicationFields(
  settings: EntityAgentConfigSettings,
): Pick<ApplicationUpsert, "healthcheckUrl" | "isHealthcheck" | "logsPath" | "isScaningLogs"> {
  return {
    healthcheckUrl: settings.healthcheckUrl,
    isHealthcheck: apiFlagFromBool(settings.uptimeMonitoringEnabled),
    logsPath: settings.logPath,
    isScaningLogs: apiFlagFromBool(settings.logMonitoringEnabled),
  }
}

export function applicationToUpsert(
  app: Application,
  patch: Partial<ApplicationUpsert> = {},
): ApplicationUpsert {
  return {
    uid: app.uid,
    name: app.name,
    version: app.version,
    commit: app.commit,
    status: app.status,
    lastDeployment: app.lastDeployment,
    appUrl: app.appUrl,
    repositoryUrl: app.repositoryUrl,
    serverId: app.serverId,
    applicationGroupId: app.applicationGroupId,
    healthcheckUrl: app.healthcheckUrl ?? app.appUrl ?? "",
    isHealthcheck: app.isHealthcheck ?? 0,
    logsPath: app.logsPath ?? "",
    isScaningLogs: app.isScaningLogs ?? 0,
    ...patch,
  }
}
