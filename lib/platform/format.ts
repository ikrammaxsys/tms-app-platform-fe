const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur"

/** TMS API datetimes without an offset are Malaysia local (UTC+8). */
export function parseApiDateTime(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const hasOffset = /[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)
  const isoLike = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  const normalized = hasOffset ? isoLike : `${isoLike}+08:00`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const date = parseApiDateTime(value)
  if (!date) return "-"
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: MALAYSIA_TIME_ZONE,
  })
}

/** Value for a datetime-local input (YYYY-MM-DDTHH:mm). */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 16)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-"
  const date = parseApiDateTime(value)
  if (!date) return "-"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MALAYSIA_TIME_ZONE,
  })
}

/** Compact relative time, e.g. "2h ago", "3d ago". Falls back to formatted date. */
export function formatRelativeTime(value: string | null | undefined): string {
  const date = value ? parseApiDateTime(value) : null
  if (!date) return "-"

  const diffMs = date.getTime() - Date.now()
  const absSeconds = Math.round(Math.abs(diffMs) / 1000)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), "second")
  if (absSeconds < 3600) return rtf.format(Math.round(diffMs / 60000), "minute")
  if (absSeconds < 86400) return rtf.format(Math.round(diffMs / 3600000), "hour")
  if (absSeconds < 86400 * 7) return rtf.format(Math.round(diffMs / 86400000), "day")

  return formatDateTime(value)
}

/** Human-readable byte size (1024-based). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes < 0) return "—"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"] as const
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** unitIndex
  const decimals = unitIndex >= 2 ? 1 : 0
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}
