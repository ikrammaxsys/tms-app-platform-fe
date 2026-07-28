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
import { EnvironmentBadge } from "@/components/platform/status"
import { RowActions } from "@/components/platform/row-actions"
import { deleteServer } from "@/lib/platform/actions"
import type { Environment, Server } from "@/lib/platform/types"

const PAGE_SIZE = 10

export function ServersTable({ servers }: { servers: Server[] }) {
  const [query, setQuery] = React.useState("")
  const [environment, setEnvironment] = React.useState("all")
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return servers.filter((s) => {
      if (environment !== "all" && s.environment !== environment) return false
      if (
        q &&
        !`${s.domain} ${s.ipAddress} ${s.provider} ${s.country}`.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [servers, query, environment])

  React.useEffect(() => setPage(1), [query, environment])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const envItems = {
    all: "All Environments",
    Live: "Live",
    Test: "Test",
    Development: "Development",
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers..."
            className="pl-8"
          />
        </div>
        <Select
          items={envItems}
          value={environment}
          onValueChange={(v) => setEnvironment(v as string)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(envItems).map(([value, label]) => (
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
              <TableHead>Domain</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No servers found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>
                    <Link
                      href={`/servers/${server.id}`}
                      className="font-medium hover:underline"
                    >
                      {server.domain}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{server.ipAddress}</TableCell>
                  <TableCell>
                    <EnvironmentBadge environment={server.environment as Environment} />
                  </TableCell>
                  <TableCell>{server.internalExternal}</TableCell>
                  <TableCell>{server.provider}</TableCell>
                  <TableCell>{server.country || "-"}</TableCell>
                  <TableCell>
                    <RowActions
                      id={server.id}
                      label={server.domain}
                      viewHref={`/servers/${server.id}`}
                      editHref={`/servers/${server.id}/edit`}
                      deleteAction={deleteServer}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Showing {rows.length} of {filtered.length} servers
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
