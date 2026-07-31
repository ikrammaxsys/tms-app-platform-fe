"use client"

import * as React from "react"
import Link from "next/link"
import { LayoutGrid, Plus, Search } from "lucide-react"

import { ApplicationCards } from "@/components/platform/application-cards"
import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { tmsApi } from "@/lib/platform/api-service"
import { toApplicationView } from "@/lib/platform/view"
import type { ApplicationView, UptimeTimeline } from "@/lib/platform/types"

export default function ApplicationOverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [applications, setApplications] = React.useState<ApplicationView[]>([])
  const [uptimeTimelines, setUptimeTimelines] = React.useState<Record<number, UptimeTimeline | undefined>>({})
  const [query, setQuery] = React.useState("")
  const [serverFilter, setServerFilter] = React.useState("all")
  const [environmentFilter, setEnvironmentFilter] = React.useState("all")
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
              const timeline = await tmsApi.getApplicationUptimeTimeline(app.id)
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

  const filteredApplications = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    return applications.filter((app) => {
      if (serverFilter !== "all" && app.serverDomain !== serverFilter) return false
      if (environmentFilter !== "all" && app.serverEnvironment !== environmentFilter) return false
      if (!search) return true
      return `${app.name} ${app.applicationGroupName} ${app.serverDomain} ${app.version}`
        .toLowerCase()
        .includes(search)
    })
  }, [applications, environmentFilter, query, serverFilter])

  if (error) {
    return (
      <div>
        <PageHeader
          title="Applications overview"
          description="Live application health and 7-day uptime at a glance"
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
        title="Applications overview"
        description="Live application health and 7-day uptime at a glance"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/applications" />}
            >
              <LayoutGrid className="size-4" />
              Table view
            </Button>
            <Button nativeButton={false} render={<Link href="/applications/new" />}>
              <Plus className="size-4" />
              Create Application
            </Button>
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((count) => count + 1)}
              refreshing={loading}
            />
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card/60 p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            className="pl-8"
          />
        </div>
        <Select value={serverFilter} onValueChange={(value) => setServerFilter(value ?? "all")}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="All servers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All servers</SelectItem>
            {[...new Set(applications.map((app) => app.serverDomain))]
              .sort()
              .map((server) => (
                <SelectItem key={server} value={server}>
                  {server}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select
          value={environmentFilter}
          onValueChange={(value) => setEnvironmentFilter(value ?? "all")}
        >
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="All environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {[...new Set(applications.map((app) => app.serverEnvironment))]
              .sort()
              .map((environment) => (
                <SelectItem key={environment} value={environment as string}>
                  {environment as string}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <ApplicationCards
        applications={filteredApplications}
        loading={loading}
        uptimeTimelines={uptimeTimelines}
      />
    </div>
  )
}
