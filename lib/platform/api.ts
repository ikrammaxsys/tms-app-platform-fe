import type { ApiResponse } from "./types"

// const DEFAULT_BASE = "http://13.229.238.4:5128"
const DEFAULT_BASE = "http://localhost:5128"
/**
 * Server: talk directly to the .NET API.
 * Browser: use the Next.js rewrite `/backend-api/*` → TMS_API_BASE_URL
 * so calls show up in DevTools and avoid CORS.
 */
export function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/backend-api"
  }
  console.log(process.env.NEXT_PUBLIC_TMS_API_BASE_URL)
  console.log(DEFAULT_BASE)
  return (process.env.NEXT_PUBLIC_TMS_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, "")
}

export class ApiError extends Error {
  status: number
  errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const url = `${apiBaseUrl()}${normalized}`
  const headers: HeadersInit = { Accept: "application/json" }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: options.cache ?? "no-store",
      next: options.next,
    })
  } catch (error) {
    throw new ApiError(
      `Cannot reach TMS API at ${apiBaseUrl()}. Is tms-template-net8 running?`,
      0,
      [error instanceof Error ? error.message : String(error)],
    )
  }

  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new ApiError(
        `Invalid JSON from ${path} (${response.status})`,
        response.status,
      )
    }
  }

  // Flat list endpoints (e.g. /list, /options) return raw arrays/objects.
  if (!isApiResponse(json)) {
    if (!response.ok) {
      throw new ApiError(`Request failed (${response.status})`, response.status)
    }
    return json as T
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.message || `Request failed (${response.status})`,
      response.status,
      json.errors ?? [],
    )
  }

  return json.data as T
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as ApiResponse<unknown>).success === "boolean"
  )
}
