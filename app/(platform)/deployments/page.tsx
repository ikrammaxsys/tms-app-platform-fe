"use client"

import * as React from "react"

import { PageHeader } from "@/components/platform/page-header"
import { DeploymentsPanel } from "@/components/platform/deployments-panel"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { Application } from "@/lib/platform/types"

export default function DeploymentsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [applications, setApplications] = React.useState<Application[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const apps = await tmsApi.listApplications()
        if (!cancelled) setApplications(apps ?? [])
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
          title="Deployments"
          description="Track application deployment versions and commits"
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
        title="Deployments"
        description="Track application deployment versions and commits"
        actions={
          <OverviewRefreshButton
            onRefresh={() => setRefreshCounter((count) => count + 1)}
            refreshing={loading}
          />
        }
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DeploymentsPanel applications={applications} />
      )}
    </div>
  )
}
