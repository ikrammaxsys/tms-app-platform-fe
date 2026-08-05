"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpDown, Search } from "lucide-react"

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
import { formatPercent, type ApplicationReportRow } from "@/lib/platform/reporting"
import type { AppStatus, Environment } from "@/lib/platform/types"
import { uptimePercentTextClass } from "@/lib/platform/view"
import { cn } from "@/lib/utils"

type SortKey =
  | "name"
  | "status"
  | "uptime"
  | "checks"
  | "environment"
  | "group"
  | "server"

export function ApplicationReportTable({
  rows,
  compact = false,
}: {
  rows: ApplicationReportRow[]
  compact?: boolean
}) {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [envFilter, setEnvFilter] = React.useState("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("name")
  const [sortAsc, setSortAsc] = React.useState(true)

  const environments = React.useMemo(
    () => [...new Set(rows.map((r) => String(r.app.serverEnvironment)))].sort(),
    [rows],
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = rows.filter((row) => {
      if (statusFilter !== "all" && row.liveStatus !== statusFilter) return false
      if (envFilter !== "all" && String(row.app.serverEnvironment) !== envFilter) return false
      if (!q) return true
      return (
        row.app.name.toLowerCase().includes(q) ||
        row.app.applicationGroupName.toLowerCase().includes(q) ||
        row.app.serverDomain.toLowerCase().includes(q) ||
        row.app.version.toLowerCase().includes(q)
      )
    })

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.app.name.localeCompare(b.app.name)
          break
        case "status":
          cmp = a.liveStatus.localeCompare(b.liveStatus)
          break
        case "uptime":
          cmp = (a.uptimePercent ?? -1) - (b.uptimePercent ?? -1)
          break
        case "checks":
          cmp = a.totalChecks - b.totalChecks
          break
        case "environment":
          cmp = String(a.app.serverEnvironment).localeCompare(String(b.app.serverEnvironment))
          break
        case "group":
          cmp = a.app.applicationGroupName.localeCompare(b.app.applicationGroupName)
          break
        case "server":
          cmp = a.app.serverDomain.localeCompare(b.app.serverDomain)
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
      setSortAsc(key === "name" || key === "environment" || key === "group" || key === "server")
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
            placeholder="Search applications…"
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
            {(["Operational", "Degraded", "Down", "Inactive", "Unknown"] as AppStatus[]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ),
            )}
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
              <SortableHead label="Application" column="name" className="min-w-[180px]" />
              <SortableHead label="Status" column="status" />
              <SortableHead label="Uptime" column="uptime" />
              {!compact && <SortableHead label="Checks" column="checks" />}
              <SortableHead label="Environment" column="environment" />
              {!compact && <SortableHead label="Group" column="group" />}
              <SortableHead label="Server" column="server" />
              {!compact && <TableHead>Version</TableHead>}
              {!compact && <TableHead>Last checked</TableHead>}
              {!compact && <TableHead className="min-w-[200px]">Availability</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={compact ? 6 : 10}
                  className="text-muted-foreground h-24 text-center"
                >
                  No applications match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.app.id}>
                  <TableCell>
                    <Link
                      href={`/applications/${row.app.id}`}
                      className="hover:text-primary inline-flex items-center gap-1.5 font-semibold"
                    >
                      {row.app.name}
                      {row.hasVersionDrift ? (
                        <AlertTriangle
                          className="size-3.5 text-amber-500"
                          aria-label="Version drift detected"
                        />
                      ) : null}
                    </Link>
                    {!compact && row.app.uid ? (
                      <p className="text-muted-foreground text-xs">{row.app.uid}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusLabel status={row.liveStatus} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        uptimePercentTextClass(row.uptimePercent),
                      )}
                    >
                      {formatPercent(row.uptimePercent)}
                    </span>
                  </TableCell>
                  {!compact && (
                    <TableCell>
                      <div className="text-sm tabular-nums">
                        {row.totalChecks.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {row.upCount}↑ {row.degradedCount}~ {row.downCount}↓
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <EnvironmentBadge
                      environment={row.app.serverEnvironment as Environment}
                    />
                  </TableCell>
                  {!compact && (
                    <TableCell className="max-w-[140px] truncate">
                      {row.app.applicationGroupName}
                    </TableCell>
                  )}
                  <TableCell>
                    <Link
                      href={`/servers/${row.app.serverId}`}
                      className="hover:text-primary text-sm"
                    >
                      {row.app.serverDomain}
                    </Link>
                  </TableCell>
                  {!compact && (
                    <TableCell className="font-mono text-xs">{row.app.version}</TableCell>
                  )}
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
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
