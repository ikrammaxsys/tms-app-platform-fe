import type {
  Application,
  ApplicationView,
  AppStatus,
  AvailabilityDay,
  DayStatus,
  Server,
  UptimeTimeline,
  UptimeTimelinePoint,
} from "./types"

const AVATAR_COLORS = [
  "#16a34a",
  "#014099",
  "#0891b2",
  "#db2777",
  "#7c3aed",
  "#ca8a04",
  "#0d9488",
  "#ea580c",
]

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function avatarColor(name: string): string {
  return AVATAR_COLORS[hash(name) % AVATAR_COLORS.length]
}

export function initialOf(name: string): string {
  return name.trim().length ? name.trim()[0].toUpperCase() : "?"
}

/** Map legacy / API status strings to canonical AppStatus. */
export function normalizeAppStatus(raw: string | undefined | null): AppStatus {
  const value = (raw ?? "").trim()
  if (value === "Healthy" || value === "Operational") return "Operational"
  if (value === "Warning" || value === "Degraded") return "Degraded"
  if (value === "Down") return "Down"
  if (value === "Inactive") return "Inactive"
  return "Unknown"
}

export type ApplicationLiveStatus = "Operational" | "Degraded" | "Down" | "Unknown"

export function getLatestElapsedTimelinePoint(
  timeline: UptimeTimeline,
): UptimeTimelinePoint | undefined {
  const asOfMs = new Date(timeline.to || timeline.lastChecked).getTime()

  let latest: UptimeTimelinePoint | undefined
  for (const point of timeline.points) {
    const fromMs = new Date(point.from).getTime()
    if (Number.isNaN(fromMs)) continue
    if (!Number.isNaN(asOfMs) && fromMs > asOfMs) continue
    latest = point
  }

  return latest ?? timeline.points.at(-1)
}

export function timelinePointHasScanData(point: UptimeTimelinePoint): boolean {
  return point.totalChecks > 0 && point.status !== "NoData"
}

export function liveStatusFromTimelinePoint(
  point: UptimeTimelinePoint,
): ApplicationLiveStatus {
  if (!timelinePointHasScanData(point)) return "Unknown"
  if (point.status === "Down") return "Down"
  if (point.status === "Degraded") return "Degraded"
  if (point.status === "Up") return "Operational"
  if (point.downCount > 0 && point.upCount === 0) return "Down"
  if (point.degradedCount > 0 || point.downCount > 0) return "Degraded"
  return "Operational"
}

/** Resolve live health from the latest elapsed uptime bucket, then fallbacks. */
export function resolveApplicationLiveStatus(
  app: Pick<Application, "status" | "isOnline">,
  uptimeTimeline?: UptimeTimeline | null,
): ApplicationLiveStatus {
  if (uptimeTimeline) {
    const latestPoint = getLatestElapsedTimelinePoint(uptimeTimeline)
    if (latestPoint) {
      return liveStatusFromTimelinePoint(latestPoint)
    }

    if (uptimeTimeline.totalChecks === 0) return "Unknown"

    if (uptimeTimeline.isOnline) return "Operational"

    const current = uptimeTimeline.currentStatus?.trim().toLowerCase()
    if (current === "down") return "Down"
    return "Degraded"
  }

  if (app.isOnline === true) return "Operational"
  if (app.isOnline === false) return "Degraded"

  return normalizeAppStatus(app.status)
}

/** Map API uptime percent to day strip color (matches applications overview cards). */
export function dayStatusFromUptimePercent(uptime?: number | null): DayStatus {
  if (uptime === undefined || uptime === null) return "NoData"
  if (uptime < 70) return "Down"
  if (uptime < 90) return "Partial"
  return "Healthy"
}

export function availabilityDayFromUptimePoint(point: UptimeTimelinePoint): AvailabilityDay {
  const status =
    point.totalChecks === 0 || point.status === "NoData"
      ? "NoData"
      : dayStatusFromUptimePercent(point.uptimePercent)

  return {
    date: point.from,
    label: point.label,
    status,
    checks: {
      totalChecks: point.totalChecks,
      upCount: point.upCount,
      downCount: point.downCount,
      degradedCount: point.degradedCount,
    },
  }
}

/** Lines shown in the per-day uptime bar tooltip. */
export function availabilityDayTooltipLines(day: AvailabilityDay): string[] {
  const checks = day.checks
  if (!checks) {
    return ["No scan data for this day"]
  }
  if (checks.totalChecks === 0) {
    return ["Scans: 0", "Success: 0", "Failed: 0"]
  }
  const lines = [
    `Scans: ${checks.totalChecks}`,
    `Success: ${checks.upCount}`,
    `Failed: ${checks.downCount}`,
  ]
  if (checks.degradedCount > 0) {
    lines.push(`Degraded: ${checks.degradedCount}`)
  }
  return lines
}

/** True when the hour bucket has not started yet (segment `from` is after `asOf`). */
export function isTimelineHourNotYetReached(segmentFrom: string, asOf: string): boolean {
  const start = new Date(segmentFrom).getTime()
  const now = new Date(asOf).getTime()
  if (Number.isNaN(start) || Number.isNaN(now)) return false
  return start > now
}

/** Approximate 30-day availability from status (uptime logs not in OpenAPI yet). */
export function availabilityDays(app: Pick<Application, "id" | "status">): AvailabilityDay[] {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  const status = normalizeAppStatus(app.status)
  const days: AvailabilityDay[] = []
  for (let d = 29; d >= 0; d--) {
    const date = new Date(end)
    date.setUTCDate(date.getUTCDate() - d)
    let dayStatus: DayStatus = "Healthy"
    if (status === "Down" && [0, 1, 2, 10, 18].includes(d)) {
      dayStatus = "Down"
    } else if (status === "Degraded" && [3, 11, 15, 19].includes(d)) {
      dayStatus = d === 15 ? "Partial" : "Down"
    } else if (status === "Operational" && [8, 22].includes(d)) {
      dayStatus = "Down"
    }
    days.push({
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      status: dayStatus,
    })
  }
  return days
}

export function uptimePercent(app: Pick<Application, "id" | "status">): number {
  const days = availabilityDays(app)
  const healthy = days.filter((d) => d.status === "Healthy").length
  return days.length === 0 ? 100 : (100 * healthy) / days.length
}

export function averageLatency(app: Pick<Application, "id" | "status">): number {
  const status = normalizeAppStatus(app.status)
  let sum = 0
  for (let d = 29; d >= 0; d--) {
    let latency = 40 + ((app.id * 7 + d) % 80)
    if (status === "Down" && [0, 1, 2, 10, 18].includes(d)) latency += 500
    else if (status === "Degraded" && [3, 11, 15, 19].includes(d)) latency += 200
    else if (status === "Operational" && [8, 22].includes(d)) latency += 300
    sum += latency
  }
  return Math.round(sum / 30)
}

export function toApplicationView(app: Application, server?: Server): ApplicationView {
  const normalized = { ...app, status: normalizeAppStatus(app.status) }
  const pct = uptimePercent(normalized)
  return {
    ...normalized,
    serverEnvironment: (app.serverEnvironment ||
      server?.environment ||
      "Live") as ApplicationView["serverEnvironment"],
    serverDomain: app.serverDomain || server?.domain || "-",
    serverIpAddress: app.serverIpAddress || server?.ipAddress || "-",
    serverProvider: server?.provider ?? app.serverDetail?.provider ?? "AWS",
    serverInternalExternal:
      server?.internalExternal ?? app.serverDetail?.internalExternal ?? "Internal",
    initial: initialOf(app.name),
    avatarColor: avatarColor(app.name),
    uptime: `${pct.toFixed(2)}%`,
    uptimePercent: pct,
  }
}
