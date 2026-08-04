import type { Application } from "./types"

export type ServerFilterOption = {
  id: number
  domain: string
  environment: string
}

export function getServerFilterOptions(applications: Application[]): ServerFilterOption[] {
  const byServer = new Map<number, ServerFilterOption>()

  for (const app of applications) {
    if (byServer.has(app.serverId)) continue
    byServer.set(app.serverId, {
      id: app.serverId,
      domain:
        app.serverDomain ||
        app.serverDetail?.domain ||
        `Server #${app.serverId}`,
      environment: String(app.serverEnvironment || app.serverDetail?.environment || ""),
    })
  }

  return [...byServer.values()].sort((a, b) => a.domain.localeCompare(b.domain))
}

export function filterApplicationsByServer(
  applications: Application[],
  serverFilter: string,
): Application[] {
  if (serverFilter === "all") return applications
  const serverId = Number(serverFilter)
  if (!Number.isFinite(serverId)) return applications
  return applications.filter((app) => app.serverId === serverId)
}

/** Pick the focus app for a server-scoped dependency graph. */
export function resolveCenterAppForServer(
  applicationId: number,
  applicationName: string,
  applications: Application[],
  serverFilter: string,
): Application | undefined {
  const scoped = filterApplicationsByServer(applications, serverFilter)
  const current = scoped.find((app) => app.id === applicationId)
  if (current) return current

  if (serverFilter === "all") {
    return applications.find((app) => app.id === applicationId)
  }

  const sameName = scoped.find(
    (app) => app.name.toLowerCase() === applicationName.toLowerCase(),
  )
  return sameName ?? scoped[0]
}
