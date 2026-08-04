"use server"

import { revalidatePath } from "next/cache"

import {
  actionErrorMessage,
  type PlatformActionState,
} from "./action-state"
import { tmsApi } from "./api-service"
import type { ApplicationUpsert } from "./types"
import {
  createApplicationApi,
  createGroupApi,
  createOrganizationApi,
  createServerApi,
  deleteApplicationApi,
  deleteGroupApi,
  deleteOrganizationApi,
  deleteServerApi,
  updateApplicationApi,
  updateGroupApi,
  updateOrganizationApi,
  updateServerApi,
} from "./queries"

function str(formData: FormData, key: string): string {
  return (formData.get(key) ?? "").toString().trim()
}

function num(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? 0)
}

function revalidatePlatform(applicationId?: number) {
  revalidatePath("/")
  revalidatePath("/applications")
  revalidatePath("/servers")
  revalidatePath("/application-groups")
  revalidatePath("/organizations")
  revalidatePath("/deployments")
  if (applicationId) revalidatePath(`/applications/${applicationId}`)
}

async function runAction(
  work: () => Promise<unknown>,
  success: { message: string; redirectTo: string },
  applicationId?: number,
): Promise<PlatformActionState> {
  try {
    await work()
    revalidatePlatform(applicationId)
    return { ok: true, message: success.message, redirectTo: success.redirectTo }
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error) }
  }
}

/* ------------------------------- Servers -------------------------------- */

export async function createServer(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  return runAction(
    () =>
      createServerApi({
        domain: str(formData, "domain"),
        ipAddress: str(formData, "ipAddress"),
        environment: str(formData, "environment") || "Live",
        internalExternal: str(formData, "internalExternal") || "Internal",
        country: str(formData, "country"),
        provider: str(formData, "provider") || "AWS",
        organizationId: num(formData, "organizationId"),
      }),
    { message: "Server created", redirectTo: "/servers" },
  )
}

export async function updateServer(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () =>
      updateServerApi(id, {
        domain: str(formData, "domain"),
        ipAddress: str(formData, "ipAddress"),
        environment: str(formData, "environment") || "Live",
        internalExternal: str(formData, "internalExternal") || "Internal",
        country: str(formData, "country"),
        provider: str(formData, "provider") || "AWS",
        organizationId: num(formData, "organizationId"),
      }),
    { message: "Server updated", redirectTo: `/servers/${id}` },
  )
}

export async function deleteServer(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () => deleteServerApi(id),
    { message: "Server deleted", redirectTo: "/servers" },
  )
}

/* --------------------------- Application Groups ------------------------- */

export async function createGroup(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  return runAction(
    () => createGroupApi({ name: str(formData, "name") }),
    { message: "Application group created", redirectTo: "/application-groups" },
  )
}

export async function updateGroup(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () => updateGroupApi(id, { name: str(formData, "name") }),
    { message: "Application group updated", redirectTo: `/application-groups/${id}` },
  )
}

export async function deleteGroup(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () => deleteGroupApi(id),
    { message: "Application group deleted", redirectTo: "/application-groups" },
  )
}

/* ------------------------------- Organizations ------------------------------ */

export async function createOrganization(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  return runAction(
    () =>
      createOrganizationApi({
        name: str(formData, "name"),
        code: str(formData, "code"),
      }),
    { message: "Organization created", redirectTo: "/organizations" },
  )
}

export async function updateOrganization(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () =>
      updateOrganizationApi(id, {
        name: str(formData, "name"),
        code: str(formData, "code"),
      }),
    { message: "Organization updated", redirectTo: `/organizations/${id}` },
  )
}

export async function deleteOrganization(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () => deleteOrganizationApi(id),
    { message: "Organization deleted", redirectTo: "/organizations" },
  )
}

/* ----------------------------- Applications ----------------------------- */

function generateApplicationUid(): string {
  const now = new Date()
  const year = now.getUTCFullYear().toString().padStart(4, "0")
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0")
  const day = now.getUTCDate().toString().padStart(2, "0")
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
  return `T${year}${month}${day}${random}`
}

function applicationBody(formData: FormData, includeUid = false, monitoringDefaults?: Partial<ApplicationUpsert>) {
  const lastDeployment = str(formData, "lastDeployment")
  let lastDeploymentIso: string | null = null
  if (lastDeployment) {
    const parsed = new Date(lastDeployment)
    if (!Number.isNaN(parsed.getTime())) lastDeploymentIso = parsed.toISOString()
  }

  const uid = str(formData, "uid")

  return {
    ...((includeUid || uid) ? { uid: uid || generateApplicationUid() } : {}),
    name: str(formData, "name"),
    version: str(formData, "version"),
    commit: str(formData, "commit"),
    status: str(formData, "status") || "Healthy",
    lastDeployment: lastDeploymentIso,
    appUrl: str(formData, "appUrl"),
    repositoryUrl: str(formData, "repositoryUrl"),
    serverId: num(formData, "serverId"),
    applicationGroupId: num(formData, "applicationGroupId"),
    healthcheckUrl: monitoringDefaults?.healthcheckUrl ?? null,
    isHealthcheck: monitoringDefaults?.isHealthcheck ?? 0,
    logsPath: monitoringDefaults?.logsPath ?? null,
    isScaningLogs: monitoringDefaults?.isScaningLogs ?? 0,
  }
}

export async function createApplication(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  return runAction(
    () => createApplicationApi(applicationBody(formData, true)),
    { message: "Application created", redirectTo: "/applications" },
  )
}

export async function updateApplication(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    async () => {
      const existing = await tmsApi.getApplication(id)
      await updateApplicationApi(
        id,
        applicationBody(formData, false, {
          healthcheckUrl: existing.healthcheckUrl ?? existing.appUrl ?? "",
          isHealthcheck: existing.isHealthcheck ?? 0,
          logsPath: existing.logsPath ?? "",
          isScaningLogs: existing.isScaningLogs ?? 0,
        }),
      )
    },
    { message: "Application updated", redirectTo: `/applications/${id}` },
  )
}

export async function deleteApplication(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  return runAction(
    () => deleteApplicationApi(id),
    { message: "Application deleted", redirectTo: "/applications" },
  )
}

/* ------------------------- Application Deployments ------------------------- */

function deploymentBody(formData: FormData) {
  return {
    applicationId: num(formData, "applicationId"),
    commitNo: str(formData, "commitNo"),
    version: str(formData, "version"),
    timestamp:
      str(formData, "timestamp") ||
      new Date().toISOString().slice(0, 19).replace("T", " "),
  }
}

export async function createDeployment(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const body = deploymentBody(formData)
  const returnTo = str(formData, "returnTo") || "/deployments"
  return runAction(
    () => tmsApi.createDeployment(body),
    { message: "Deployment created", redirectTo: returnTo },
    body.applicationId,
  )
}

export async function updateDeployment(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  const body = deploymentBody(formData)
  const returnTo = str(formData, "returnTo") || "/deployments"
  return runAction(
    () => tmsApi.updateDeployment(id, body),
    { message: "Deployment updated", redirectTo: returnTo },
    body.applicationId,
  )
}

export async function deleteDeployment(
  _prev: PlatformActionState | null,
  formData: FormData,
): Promise<PlatformActionState> {
  const id = num(formData, "id")
  const applicationId = num(formData, "applicationId")
  const returnTo = str(formData, "returnTo") || "/deployments"
  return runAction(
    () => tmsApi.deleteDeployment(id),
    { message: "Deployment deleted", redirectTo: returnTo },
    applicationId || undefined,
  )
}
