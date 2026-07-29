import type {
  Application,
  ApplicationView,
  AvailabilityDay,
  DayStatus,
  Server,
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

/** Map API uptime percent to day strip color (matches applications overview cards). */
export function dayStatusFromUptimePercent(uptime?: number | null): DayStatus {
  if (uptime === undefined || uptime === null) return "NoData"
  if (uptime < 70) return "Down"
  if (uptime < 90) return "Partial"
  return "Healthy"
}

export function availabilityDayFromUptimePoint(point: UptimeTimelinePoint): AvailabilityDay {
  return {
    date: point.from,
    label: point.label,
    status: dayStatusFromUptimePercent(point.uptimePercent),
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
  const days: AvailabilityDay[] = []
  for (let d = 29; d >= 0; d--) {
    const date = new Date(end)
    date.setUTCDate(date.getUTCDate() - d)
    let status: DayStatus = "Healthy"
    if (app.status === "Down" && [0, 1, 2, 10, 18].includes(d)) {
      status = "Down"
    } else if (app.status === "Degraded" && [3, 11, 15, 19].includes(d)) {
      status = d === 15 ? "Partial" : "Down"
    } else if (app.status === "Operational" && [8, 22].includes(d)) {
      status = "Down"
    }
    days.push({
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      status,
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
  let sum = 0
  for (let d = 29; d >= 0; d--) {
    let latency = 40 + ((app.id * 7 + d) % 80)
    if (app.status === "Down" && [0, 1, 2, 10, 18].includes(d)) latency += 500
    else if (app.status === "Degraded" && [3, 11, 15, 19].includes(d)) latency += 200
    else if (app.status === "Operational" && [8, 22].includes(d)) latency += 300
    sum += latency
  }
  return Math.round(sum / 30)
}

export function toApplicationView(app: Application, server?: Server): ApplicationView {
  const pct = uptimePercent(app)
  return {
    ...app,
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
