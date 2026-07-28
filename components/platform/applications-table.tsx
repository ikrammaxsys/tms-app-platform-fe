"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { AppAvatar, StatusLabel } from "@/components/platform/status"
import { RowActions } from "@/components/platform/row-actions"
import { formatDateTime } from "@/lib/platform/format"
import { deleteApplication } from "@/lib/platform/actions"
import type { ApplicationView } from "@/lib/platform/types"

const PAGE_SIZE = 8

export function ApplicationsTable({
  applications,
  withActions = false,
}: {
  applications: ApplicationView[]
  withActions?: boolean
}) {
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [server, setServer] = React.useState("all")
  const [page, setPage] = React.useState(1)

  const servers = React.useMemo(
    () => Array.from(new Set(applications.map((a) => a.serverDomain))).sort(),
    [applications],
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter((a) => {
      if (status !== "all" && a.status !== status) return false
      if (server !== "all" && a.serverDomain !== server) return false
      if (q && !`${a.name} ${a.applicationGroupName} ${a.version}`.toLowerCase().includes(q))
        return false
      return true
    })
  }, [applications, query, status, server])

  React.useEffect(() => setPage(1), [query, status, server])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const statusItems = { all: "All Status", Healthy: "Healthy", Warning: "Warning", Down: "Down", Inactive: "Inactive" }
  const serverItems: Record<string, string> = { all: "All Servers" }
  servers.forEach((s) => (serverItems[s] = s))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            className="pl-8"
          />
        </div>
        <Select items={statusItems} value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={serverItems} value={server} onValueChange={(v) => setServer(v as string)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(serverItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Last Deployment</TableHead>
              {withActions ? <TableHead className="w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={withActions ? 7 : 6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <AppAvatar initial={app.initial} color={app.avatarColor} />
                      <div className="min-w-0">
                        <Link
                          href={`/applications/${app.id}`}
                          className="font-medium hover:underline"
                        >
                          {app.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {app.applicationGroupName || "Application"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{app.serverDomain}</div>
                    <div className="text-muted-foreground text-xs">{app.serverEnvironment}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-primary font-mono text-sm font-semibold">
                      {app.version}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusLabel status={app.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{app.uptime}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(app.lastDeployment)}
                  </TableCell>
                  {withActions ? (
                    <TableCell>
                      <RowActions
                        id={app.id}
                        label={app.name}
                        viewHref={`/applications/${app.id}`}
                        editHref={`/applications/${app.id}/edit`}
                        deleteAction={deleteApplication}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Showing {rows.length} of {filtered.length} applications
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground px-2 text-sm">
            Page {current} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= totalPages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
