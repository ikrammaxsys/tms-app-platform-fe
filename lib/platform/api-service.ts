/**
 * Typed client for the TMS Dev Platform API
 * (OpenAPI: /swagger/v1/swagger.json — applications, groups, servers, products, deployments).
 */
import { apiFetch } from "./api"
import type {
  Application,
  ApplicationDeployment,
  ApplicationDeploymentUpsert,
  ApplicationGroup,
  ApplicationGroupUpsert,
  Organization,
  OrganizationUpsert,
  ApplicationLogChunkContent,
  ApplicationLogList,
  ApplicationUpsert,
  AgentApi,
  AgentListItem,
  AgentReadyStatus,
  AgentConfigRecord,
  AgentConfigUpdateRequest,
  AgentUpsertRequest,
  SelectOption,
  Server,
  ServerUpsert,
  HostMetricsTimeline,
  UptimeTimeline,
} from "./types"

export const tmsApi = {
  /* ---------------------------- Application Groups ---------------------------- */

  listApplicationGroups: () =>
    apiFetch<ApplicationGroup[]>("/api/application-groups"),

  getApplicationGroup: (id: number) =>
    apiFetch<ApplicationGroup>(`/api/application-groups/${id}`),

  createApplicationGroup: (body: ApplicationGroupUpsert) =>
    apiFetch<ApplicationGroup>("/api/application-groups", { method: "POST", body }),

  updateApplicationGroup: (id: number, body: ApplicationGroupUpsert) =>
    apiFetch<boolean>(`/api/application-groups/${id}`, { method: "PUT", body }),

  deleteApplicationGroup: (id: number) =>
    apiFetch<boolean>(`/api/application-groups/${id}`, { method: "DELETE" }),

  applicationGroupOptions: () =>
    apiFetch<SelectOption[]>("/api/application-groups/options"),

  applicationsByGroup: (id: number) =>
    apiFetch<Application[]>(`/api/application-groups/${id}/applications`),

  /* ------------------------------- Organizations ------------------------------ */

  listOrganizations: () => apiFetch<Organization[]>("/api/organizations"),

  getOrganization: (id: number) =>
    apiFetch<Organization>(`/api/organizations/${id}`),

  createOrganization: (body: OrganizationUpsert) =>
    apiFetch<Organization>("/api/organizations", { method: "POST", body }),

  updateOrganization: (id: number, body: OrganizationUpsert) =>
    apiFetch<boolean>(`/api/organizations/${id}`, { method: "PUT", body }),

  deleteOrganization: (id: number) =>
    apiFetch<boolean>(`/api/organizations/${id}`, { method: "DELETE" }),

  organizationOptions: () => apiFetch<SelectOption[]>("/api/organizations/options"),

  /* ------------------------------- Applications ------------------------------- */

  listApplications: () => apiFetch<Application[]>("/api/applications"),

  /** Flat table rows (no ApiResponse wrapper). */
  listApplicationsTable: () => apiFetch<Record<string, unknown>[]>("/api/applications/list"),

  getApplication: (id: number) => apiFetch<Application>(`/api/applications/${id}`),

  getApplicationUptimeTimeline: (applicationId: number, days = 30) =>
    apiFetch<UptimeTimeline>(`/api/uptime/${applicationId}/timeline?days=${days}`),

  getServerHostTimeline: (serverId: number, days = 7) =>
    apiFetch<HostMetricsTimeline>(`/api/uptime/${serverId}/host-timeline?days=${days}`),

  createApplication: (body: ApplicationUpsert) =>
    apiFetch<Application>("/api/applications", { method: "POST", body }),

  updateApplication: (id: number, body: ApplicationUpsert) =>
    apiFetch<boolean>(`/api/applications/${id}`, { method: "PUT", body }),

  deleteApplication: (id: number) =>
    apiFetch<boolean>(`/api/applications/${id}`, { method: "DELETE" }),

  /* --------------------------------- Servers --------------------------------- */

  listServers: () => apiFetch<Server[]>("/api/servers"),

  /** Flat table rows (no ApiResponse wrapper). */
  listServersTable: () => apiFetch<Record<string, unknown>[]>("/api/servers/list"),

  serverOptions: () => apiFetch<SelectOption[]>("/api/servers/options"),

  getServer: (id: number) => apiFetch<Server>(`/api/servers/${id}`),

  createServer: (body: ServerUpsert) =>
    apiFetch<Server>("/api/servers", { method: "POST", body }),

  updateServer: (id: number, body: ServerUpsert) =>
    apiFetch<boolean>(`/api/servers/${id}`, { method: "PUT", body }),

  deleteServer: (id: number) =>
    apiFetch<boolean>(`/api/servers/${id}`, { method: "DELETE" }),

  /* ------------------------- Application Deployments ------------------------- */

  listDeployments: (applicationId?: number) =>
    apiFetch<ApplicationDeployment[]>(
      applicationId
        ? `/api/application-deployments?applicationId=${applicationId}`
        : "/api/application-deployments",
    ),

  getDeployment: (id: number) =>
    apiFetch<ApplicationDeployment>(`/api/application-deployments/${id}`),

  createDeployment: (body: ApplicationDeploymentUpsert) =>
    apiFetch<ApplicationDeployment>("/api/application-deployments", {
      method: "POST",
      body,
    }),

  updateDeployment: (id: number, body: ApplicationDeploymentUpsert) =>
    apiFetch<boolean>(`/api/application-deployments/${id}`, {
      method: "PUT",
      body,
    }),

  deleteDeployment: (id: number) =>
    apiFetch<boolean>(`/api/application-deployments/${id}`, { method: "DELETE" }),

  /* --------------------------- Application Logs --------------------------- */

  listApplicationLogs: (applicationId: number) =>
    apiFetch<ApplicationLogList>(`/api/application-logs/${applicationId}/list`),

  getApplicationLogChunk: (
    applicationId: number,
    date: string,
    chunk: string,
  ) =>
    apiFetch<ApplicationLogChunkContent>(
      `/api/application-logs/${applicationId}?date=${encodeURIComponent(date)}&chunk=${encodeURIComponent(chunk)}`,
    ),

  /* --------------------------------- Agents --------------------------------- */

  listAgents: () => apiFetch<AgentListItem[]>("/api/agents/list"),

  getAgent: (id: number) => apiFetch<AgentApi>(`/api/agents/${id}`),

  createAgent: (body: AgentUpsertRequest) =>
    apiFetch<AgentApi>("/api/agents", { method: "POST", body }),

  updateAgent: (id: number, body: AgentUpsertRequest) =>
    apiFetch<boolean>(`/api/agents/${id}`, { method: "PUT", body }),

  deleteAgent: (id: number) =>
    apiFetch<boolean>(`/api/agents/${id}`, { method: "DELETE" }),

  getAgentReady: (agentUid: string) =>
    apiFetch<AgentReadyStatus>(`/api/agents/${encodeURIComponent(agentUid)}/ready`),

  getAgentConfig: (agentUid: string) =>
    apiFetch<AgentConfigRecord>(`/api/agents/${encodeURIComponent(agentUid)}/config`),

  updateAgentConfig: (agentUid: string, body: AgentConfigUpdateRequest) =>
    apiFetch<AgentConfigRecord>(`/api/agents/${encodeURIComponent(agentUid)}/config`, {
      method: "PUT",
      body,
    }),
}
