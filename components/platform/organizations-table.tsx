"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RowActions } from "@/components/platform/row-actions"
import { deleteOrganization } from "@/lib/platform/actions"
import type { Organization } from "@/lib/platform/types"

const PAGE_SIZE = 10

export function OrganizationsTable({ organizations }: { organizations: Organization[] }) {
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return organizations
    return organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q),
    )
  }, [organizations, query])

  React.useEffect(() => setPage(1), [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations..."
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell className="font-mono text-sm">{organization.code}</TableCell>
                  <TableCell>
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      id={organization.id}
                      label={organization.name}
                      viewHref={`/organizations/${organization.id}`}
                      editHref={`/organizations/${organization.id}/edit`}
                      deleteAction={deleteOrganization}
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
          Showing {rows.length} of {filtered.length} organizations
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
