"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ApiError } from "./api"
import { tmsApi } from "./api-service"
import {
  createApplicationApi,
  createGroupApi,
  createServerApi,
  deleteApplicationApi,
  deleteGroupApi,
  deleteServerApi,
  updateApplicationApi,
  updateGroupApi,
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
  revalidatePath("/deployments")
  if (applicationId) revalidatePath(`/applications/${applicationId}`)
}

/* ------------------------------- Servers -------------------------------- */

export async function createServer(formData: FormData) {
  await createServerApi({
    domain: str(formData, "domain"),
    ipAddress: str(formData, "ipAddress"),
    environment: str(formData, "environment") || "Live",
    internalExternal: str(formData, "internalExternal") || "Internal",
    country: str(formData, "country"),
    provider: str(formData, "provider") || "AWS",
  })
  revalidatePlatform()
  redirect("/servers")
}

export async function updateServer(formData: FormData) {
  const id = num(formData, "id")
  await updateServerApi(id, {
    domain: str(formData, "domain"),
    ipAddress: str(formData, "ipAddress"),
    environment: str(formData, "environment") || "Live",
    internalExternal: str(formData, "internalExternal") || "Internal",
    country: str(formData, "country"),
    provider: str(formData, "provider") || "AWS",
  })
  revalidatePlatform()
  redirect(`/servers/${id}`)
}

export async function deleteServer(formData: FormData) {
  const id = num(formData, "id")
  try {
    await deleteServerApi(id)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message)
    }
    throw error
  }
  revalidatePlatform()
  redirect("/servers")
}

/* --------------------------- Application Groups ------------------------- */

export async function createGroup(formData: FormData) {
  await createGroupApi({ name: str(formData, "name") })
  revalidatePlatform()
  redirect("/application-groups")
}

export async function updateGroup(formData: FormData) {
  const id = num(formData, "id")
  await updateGroupApi(id, { name: str(formData, "name") })
  revalidatePlatform()
  redirect(`/application-groups/${id}`)
}

export async function deleteGroup(formData: FormData) {
  const id = num(formData, "id")
  try {
    await deleteGroupApi(id)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message)
    }
    throw error
  }
  revalidatePlatform()
  redirect("/application-groups")
}

/* ----------------------------- Applications ----------------------------- */

function applicationBody(formData: FormData) {
  const lastDeployment = str(formData, "lastDeployment")
  let lastDeploymentIso: string | null = null
  if (lastDeployment) {
    const parsed = new Date(lastDeployment)
    if (!Number.isNaN(parsed.getTime())) lastDeploymentIso = parsed.toISOString()
  }

  return {
    name: str(formData, "name"),
    version: str(formData, "version"),
    commit: str(formData, "commit"),
    status: str(formData, "status") || "Healthy",
    lastDeployment: lastDeploymentIso,
    appUrl: str(formData, "appUrl"),
    repositoryUrl: str(formData, "repositoryUrl"),
    serverId: num(formData, "serverId"),
    applicationGroupId: num(formData, "applicationGroupId"),
  }
}

export async function createApplication(formData: FormData) {
  await createApplicationApi(applicationBody(formData))
  revalidatePlatform()
  redirect("/applications")
}

export async function updateApplication(formData: FormData) {
  const id = num(formData, "id")
  await updateApplicationApi(id, applicationBody(formData))
  revalidatePlatform()
  redirect(`/applications/${id}`)
}

export async function deleteApplication(formData: FormData) {
  const id = num(formData, "id")
  await deleteApplicationApi(id)
  revalidatePlatform()
  redirect("/applications")
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

export async function createDeployment(formData: FormData) {
  const body = deploymentBody(formData)
  await tmsApi.createDeployment(body)
  revalidatePlatform(body.applicationId)
  const returnTo = str(formData, "returnTo")
  redirect(returnTo || "/deployments")
}

export async function updateDeployment(formData: FormData) {
  const id = num(formData, "id")
  const body = deploymentBody(formData)
  await tmsApi.updateDeployment(id, body)
  revalidatePlatform(body.applicationId)
  const returnTo = str(formData, "returnTo")
  redirect(returnTo || "/deployments")
}

export async function deleteDeployment(formData: FormData) {
  const id = num(formData, "id")
  const applicationId = num(formData, "applicationId")
  await tmsApi.deleteDeployment(id)
  revalidatePlatform(applicationId || undefined)
  const returnTo = str(formData, "returnTo")
  redirect(returnTo || "/deployments")
}
