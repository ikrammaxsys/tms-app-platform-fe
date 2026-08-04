"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { OrganizationsTable } from "@/components/platform/organizations-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { ExportCsvButton } from "@/components/platform/export-csv-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import { organizationCsvColumns } from "@/lib/platform/csv-exports"
import type { Organization } from "@/lib/platform/types"

export default function OrganizationsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await tmsApi.listOrganizations()
        if (cancelled) return
        setOrganizations([...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name)))
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [refreshCounter])

  if (error) {
    return (
      <div>
        <PageHeader
          title="Organizations"
          description="Manage organizations"
          actions={
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((count) => count + 1)}
              refreshing={loading}
            />
          }
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage organizations"
        actions={
          <>
            <Button render={<Link href="/organizations/new" />}>
              <Plus />
              Create Organization
            </Button>
            <ExportCsvButton
              filename="organizations"
              columns={organizationCsvColumns}
              rows={organizations}
              disabled={loading}
            />
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((count) => count + 1)}
              refreshing={loading}
            />
          </>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <OrganizationsTable organizations={organizations} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
