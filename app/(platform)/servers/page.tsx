"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ServersTable } from "@/components/platform/servers-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { Server } from "@/lib/platform/types"

export default function ServersPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [servers, setServers] = React.useState<Server[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await tmsApi.listServers()
        if (cancelled) return
        setServers([...(items ?? [])].sort((a, b) => a.domain.localeCompare(b.domain)))
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
          title="Servers"
          description="Infra listing — servers across environments"
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
        title="Servers"
        description="Infra listing — servers across environments"
        actions={
          <>
            <Button render={<Link href="/servers/new" />}>
              <Plus />
              Create Server
            </Button>
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
            <ServersTable servers={servers} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
