import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AvailabilityStrip,
  Metric,
  Sparkline,
} from "@/components/platform/metrics"
import { StatusLabel } from "@/components/platform/status"
import { ServerMetricsDaysFilter } from "@/components/platform/server-metrics-days-filter"
import { formatDateTime } from "@/lib/platform/format"
import type { ServerDetail, ServerResourceMetrics, ServerTimelineDays } from "@/lib/platform/queries"
import { cn } from "@/lib/utils"

function Row({
  label,
  children,
  valueClassName,
}: {
  label: string
  children: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn("text-right font-semibold", valueClassName)}>{children}</dd>
    </div>
  )
}

function ResourceMetric({
  label,
  resource,
}: {
  label: string
  resource: ServerResourceMetrics | null
}) {
  if (!resource) {
    return <Metric label={label} value="—" />
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-xl font-bold">{resource.usagePercent.toFixed(2)}%</p>
      <p className="text-muted-foreground mt-1.5 text-xs font-normal">
        {resource.used} / {resource.total}
      </p>
      <p className="text-foreground mt-1 text-sm font-semibold">{resource.available} available</p>
    </div>
  )
}

function ResourceRows({ resource }: { resource: ServerResourceMetrics | null }) {
  if (!resource) {
    return <Row label="Usage">—</Row>
  }

  return (
    <>
      <Row
        label="Used / Total"
        valueClassName="text-muted-foreground text-xs font-normal"
      >
        {resource.used} / {resource.total}
      </Row>
      <Row label="Available" valueClassName="text-base font-bold">
        {resource.available}
      </Row>
      <Row label="Usage" valueClassName="text-base font-bold">
        {resource.usagePercent.toFixed(2)}%
      </Row>
    </>
  )
}

export function ServerMetricsPanel({
  detail,
  serverId,
  selectedDays,
}: {
  detail: ServerDetail
  serverId: number
  selectedDays: ServerTimelineDays
}) {
  const { metrics } = detail
  const hasData = metrics.cpu !== "—"
  const rangeLabel =
    selectedDays === 1 ? "24-hour" : `${metrics.timelineDays}-day`

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end">
        <ServerMetricsDaysFilter serverId={serverId} days={selectedDays} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resource usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="CPU" value={metrics.cpu} />
              <ResourceMetric label="Memory" resource={metrics.ram} />
              <ResourceMetric label="Disk" resource={metrics.diskUsage} />
              <Metric label="Availability" value={metrics.availability} />
            </div>

            {hasData && metrics.cpuSparkline.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    CPU ({metrics.timelineDays}d)
                  </p>
                  <Sparkline data={metrics.cpuSparkline} />
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    Memory ({metrics.timelineDays}d)
                  </p>
                  <Sparkline data={metrics.memorySparkline} />
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    Disk ({metrics.timelineDays}d)
                  </p>
                  <Sparkline data={metrics.diskSparkline} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{rangeLabel} availability</CardTitle>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.availability}
            </span>
          </CardHeader>
          <CardContent>
            {metrics.availabilityDays.length > 0 ? (
              <AvailabilityStrip days={metrics.availabilityDays} />
            ) : (
              <p className="text-muted-foreground text-sm">No availability data yet.</p>
            )}
          </CardContent>
        </Card> */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health overview</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {/* <Row label="Status">
              <StatusLabel status={metrics.status} />
            </Row>
            <Row label="Availability">{metrics.availability}</Row> */}
              {metrics.lastChecked && (
              <Row label="Last checked">{formatDateTime(metrics.lastChecked)}</Row>
            )}
            <Row label="CPU">{metrics.cpu}</Row>
          </dl>

          <p className="text-muted-foreground mt-4 mb-1 text-xs font-semibold tracking-wide uppercase">
            Memory
          </p>
          <dl className="divide-y text-sm">
            <ResourceRows resource={metrics.ram} />
          </dl>

          <p className="text-muted-foreground mt-4 mb-1 text-xs font-semibold tracking-wide uppercase">
            Disk
          </p>
          <dl className="divide-y text-sm">
            <ResourceRows resource={metrics.diskUsage} />
          </dl>

          <dl className="divide-y text-sm">
            <Row label="Applications">{detail.applications.length}</Row>
          </dl>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
