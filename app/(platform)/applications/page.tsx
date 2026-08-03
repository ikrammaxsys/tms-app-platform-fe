"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApplicationsTable } from "@/components/platform/applications-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import { toApplicationView } from "@/lib/platform/view"
import type { ApplicationView, UptimeTimeline } from "@/lib/platform/types"

export default function ApplicationsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [applications, setApplications] = React.useState<ApplicationView[]>([])
  const [uptimeTimelines, setUptimeTimelines] = React.useState<
    Record<number, UptimeTimeline | undefined>
  >({})
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [apps, servers] = await Promise.all([
          tmsApi.listApplications(),
          tmsApi.listServers(),
        ])
        if (cancelled) return
        const byId = new Map((servers ?? []).map((s) => [s.id, s]))
        const applicationViews = (apps ?? [])
          .map((a) => toApplicationView(a, byId.get(a.serverId)))
          .sort((a, b) => a.name.localeCompare(b.name))

        setApplications(applicationViews)

        const timelineEntries = await Promise.all(
          applicationViews.map(async (app) => {
            try {
              const timeline = await tmsApi.getApplicationUptimeTimeline(app.id, 1)
              return [app.id, timeline] as const
            } catch {
              return [app.id, undefined] as const
            }
          }),
        )

        if (cancelled) return
        setUptimeTimelines(Object.fromEntries(timelineEntries))
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
          title="Applications"
          description="Manage applications tracked across all servers and environments"
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
        title="Applications"
        description="Manage applications tracked across all servers and environments"
        actions={
          <>
            <Button render={<Link href="/applications/new" />}>
              <Plus />
              Create Application
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
            <ApplicationsTable
              applications={applications}
              uptimeTimelines={uptimeTimelines}
              withActions
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
