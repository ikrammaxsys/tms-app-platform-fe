"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpDown, Search } from "lucide-react"

import { AvailabilityStrip } from "@/components/platform/metrics"
import { EnvironmentBadge, StatusLabel } from "@/components/platform/status"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/platform/format"
import { formatPercent, type ServerReportRow } from "@/lib/platform/reporting"
import type { Environment } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

type SortKey =
  | "domain"
  | "status"
  | "cpu"
  | "ram"
  | "disk"
  | "uptime"
  | "apps"
  | "environment"
  | "provider"

function resourceTone(percent: number | null): string {
  if (percent === null) return "text-muted-foreground"
  if (percent >= 90) return "text-red-600 dark:text-red-400"
  if (percent >= 75) return "text-amber-600 dark:text-amber-400"
  return "text-emerald-600 dark:text-emerald-400"
}

function ResourceCell({ value }: { value: number | null }) {
  return (
    <span className={cn("font-semibold tabular-nums", resourceTone(value))}>
      {formatPercent(value, 1)}
    </span>
  )
}

export function ServerReportTable({
  rows,
  compact = false,
}: {
  rows: ServerReportRow[]
  compact?: boolean
}) {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [envFilter, setEnvFilter] = React.useState("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("domain")
  const [sortAsc, setSortAsc] = React.useState(true)

  const environments = React.useMemo(
    () => [...new Set(rows.map((r) => r.server.environment))].sort(),
    [rows],
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (envFilter !== "all" && row.server.environment !== envFilter) return false
      if (!q) return true
      return (
        row.server.domain.toLowerCase().includes(q) ||
        row.server.ipAddress.toLowerCase().includes(q) ||
        row.organizationName.toLowerCase().includes(q) ||
        row.server.country.toLowerCase().includes(q) ||
        row.server.provider.toLowerCase().includes(q)
      )
    })

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "domain":
          cmp = a.server.domain.localeCompare(b.server.domain)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "cpu":
          cmp = (a.cpuUsage ?? -1) - (b.cpuUsage ?? -1)
          break
        case "ram":
          cmp = (a.ramUsagePercent ?? -1) - (b.ramUsagePercent ?? -1)
          break
        case "disk":
          cmp = (a.diskUsagePercent ?? -1) - (b.diskUsagePercent ?? -1)
          break
        case "uptime":
          cmp = (a.uptimePercent ?? -1) - (b.uptimePercent ?? -1)
          break
        case "apps":
          cmp = a.appCount - b.appCount
          break
        case "environment":
          cmp = a.server.environment.localeCompare(b.server.environment)
          break
        case "provider":
          cmp = a.server.provider.localeCompare(b.server.provider)
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [rows, query, statusFilter, envFilter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key === "domain" || key === "environment" || key === "provider")
    }
  }

  function SortableHead({
    label,
    column,
    className,
  }: {
    label: string
    column: SortKey
    className?: string
  }) {
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className="hover:text-foreground inline-flex items-center gap-1 font-semibold"
        >
          {label}
          <ArrowUpDown
            className={cn(
              "size-3.5",
              sortKey === column ? "text-foreground" : "text-muted-foreground/50",
            )}
          />
        </button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search servers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(["Operational", "Degraded", "Down", "Unknown"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={(value) => setEnvFilter(value ?? "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env} value={env}>
                {env}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm tabular-nums">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Server" column="domain" className="min-w-[160px]" />
              {/* <SortableHead label="Status" column="status" /> */}
              <SortableHead label="CPU" column="cpu" />
              <SortableHead label="RAM" column="ram" />
              <SortableHead label="Disk" column="disk" />
              {/* <SortableHead label="Uptime" column="uptime" /> */}
              <SortableHead label="Apps" column="apps" />
              {!compact && <SortableHead label="Environment" column="environment" />}
              {!compact && <SortableHead label="Provider" column="provider" />}
              {!compact && <TableHead>Organization</TableHead>}
              {!compact && <TableHead>Country</TableHead>}
              {!compact && <TableHead>Last checked</TableHead>}
              {!compact && <TableHead className="min-w-[200px]">Availability</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={compact ? 7 : 13}
                  className="text-muted-foreground h-24 text-center"
                >
                  No servers match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.server.id}>
                  <TableCell>
                    <Link
                      href={`/servers/${row.server.id}`}
                      className="hover:text-primary font-semibold"
                    >
                      {row.server.domain}
                    </Link>
                    {!compact && (
                      <p className="text-muted-foreground font-mono text-xs">
                        {row.server.ipAddress}
                      </p>
                    )}
                  </TableCell>
                  {/* <TableCell>
                    <StatusLabel status={row.status} />
                  </TableCell> */}
                  <TableCell>
                    <ResourceCell value={row.cpuUsage} />
                  </TableCell>
                  <TableCell>
                    <ResourceCell value={row.ramUsagePercent} />
                  </TableCell>
                  <TableCell>
                    <ResourceCell value={row.diskUsagePercent} />
                  </TableCell>
                  {/* <TableCell>
                    <span className="font-semibold tabular-nums">
                      {formatPercent(row.uptimePercent)}
                    </span>
                  </TableCell> */}
                  <TableCell>
                    <div className="text-sm tabular-nums">{row.appCount}</div>
                    {/* {row.appCount > 0 && (
                      <div className="text-muted-foreground text-xs">
                        {row.appsOperational} ok · {row.appsDegraded} deg · {row.appsDown} down
                      </div>
                    )} */}
                  </TableCell>
                  {/* {!compact && (
                    <TableCell>
                      <EnvironmentBadge environment={row.server.environment as Environment} />
                    </TableCell>
                  )}
                  {!compact && <TableCell className="text-sm">{row.server.provider}</TableCell>}
                  {!compact && (
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {row.organizationName}
                    </TableCell>
                  )}
                  {!compact && <TableCell className="text-sm">{row.server.country}</TableCell>}
                  {!compact && (
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {row.lastChecked ? formatDateTime(row.lastChecked) : "—"}
                    </TableCell>
                  )}
                  {!compact && (
                    <TableCell>
                      {row.availabilityDays.length > 0 ? (
                        <AvailabilityStrip days={row.availabilityDays} />
                      ) : (
                        <span className="text-muted-foreground text-xs">No data</span>
                      )}
                    </TableCell>
                  )} */}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
