"use client"

import * as React from "react"
import Link from "next/link"
import { LayoutGrid, Network, Plus, Search } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { ServerTopologyFlow } from "@/components/platform/server-topology-flow"
import { ServersResourceOverview } from "@/components/platform/servers-resource-overview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildServerTopology } from "@/lib/platform/server-topology-layout"
import { tmsApi } from "@/lib/platform/api-service"
import type { Application, Server, UptimeTimeline } from "@/lib/platform/types"
import { resolveApplicationLiveStatus } from "@/lib/platform/view"
import { cn } from "@/lib/utils"

type OverviewView = "graph" | "grid"

export default function ServersOverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [servers, setServers] = React.useState<Server[]>([])
  const [applications, setApplications] = React.useState<Application[]>([])
  const [uptimeTimelines, setUptimeTimelines] = React.useState<
    Record<number, UptimeTimeline | undefined>
  >({})
  const [serverFilter, setServerFilter] = React.useState("all")
  const [environmentFilter, setEnvironmentFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const [view, setView] = React.useState<OverviewView>("graph")
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [serverList, appList] = await Promise.all([
          tmsApi.listServers(),
          tmsApi.listApplications(),
        ])
        if (cancelled) return
        setServers([...(serverList ?? [])].sort((a, b) => a.domain.localeCompare(b.domain)))
        const appListSorted = appList ?? []
        setApplications(appListSorted)

        const timelineEntries = await Promise.all(
          appListSorted.map(async (app) => {
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

  const filteredServers = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    return servers.filter((s) => {
      if (serverFilter !== "all" && String(s.id) !== serverFilter) return false
      if (environmentFilter !== "all" && s.environment !== environmentFilter) return false
      if (!search) return true
      return `${s.domain} ${s.ipAddress} ${s.environment} ${s.provider}`
        .toLowerCase()
        .includes(search)
    })
  }, [environmentFilter, query, serverFilter, servers])

  const { nodes, edges } = React.useMemo(() => {
    const serverIds =
      serverFilter === "all" ? filteredServers.map((s) => s.id) : [Number(serverFilter)]
    const visibleServers =
      serverFilter === "all"
        ? filteredServers
        : servers.filter((s) => s.id === Number(serverFilter))

    let apps = applications
    const search = query.trim().toLowerCase()
    if (search) {
      const allowedServerIds = new Set(visibleServers.map((s) => s.id))
      apps = applications.filter((a) => {
        if (!allowedServerIds.has(a.serverId)) return false
        return `${a.name} ${a.version} ${a.applicationGroupName}`.toLowerCase().includes(search)
      })
    } else if (serverFilter !== "all") {
      apps = applications.filter((a) => a.serverId === Number(serverFilter))
    } else {
      apps = applications.filter((a) => filteredServers.some((s) => s.id === a.serverId))
    }

    const appsWithLiveStatus = apps.map((app) => ({
      ...app,
      status: resolveApplicationLiveStatus(app, uptimeTimelines[app.id]),
    }))

    return buildServerTopology(visibleServers, appsWithLiveStatus, { serverIds })
  }, [applications, filteredServers, query, serverFilter, servers, uptimeTimelines])

  const totalAppsOnView = nodes.filter((n) => n.data.kind === "application").length

  if (error) {
    return (
      <div>
        <PageHeader
          title="Servers overview"
          description="Visual map of servers and connected applications"
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
        title="Servers overview"
        description="Visual map of servers and connected applications"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/servers" />}
            >
              <LayoutGrid className="size-4" />
              Table view
            </Button>
            <Button nativeButton={false} render={<Link href="/servers/new" />}>
              <Plus className="size-4" />
              Create Server
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
            placeholder="Search servers or applications..."
            className="pl-8"
          />
        </div>
        <Select value={serverFilter} onValueChange={(value) => setServerFilter(value ?? "all")}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="All servers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All servers</SelectItem>
            {servers.map((server) => (
              <SelectItem key={server.id} value={String(server.id)}>
                {server.domain}
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
            {[...new Set(servers.map((server) => server.environment))]
              .sort()
              .map((environment) => (
                <SelectItem key={environment} value={environment}>
                  {environment}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-sm">
        {view === "graph" ? <Network className="size-4" /> : <LayoutGrid className="size-4" />}
        <span>
          {filteredServers.length} server{filteredServers.length === 1 ? "" : "s"}
          {view === "graph"
            ? ` · ${totalAppsOnView} application${totalAppsOnView === 1 ? "" : "s"} on canvas`
            : " · resource usage"}
        </span>
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as OverviewView)}
        className="gap-4"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger
            value="graph"
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
            )}
          >
            <Network className="size-4" />
            Graph
          </TabsTrigger>
          <TabsTrigger
            value="grid"
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
            )}
          >
            <LayoutGrid className="size-4" />
            Grid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-1">
          {loading ? (
            <Skeleton className="h-[min(70vh,640px)] w-full rounded-xl" />
          ) : (
            <ServerTopologyFlow
              nodes={nodes}
              edges={edges}
              focusServerId={serverFilter !== "all" ? Number(serverFilter) : null}
            />
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Each application node connects to its host server. Drag nodes to rearrange; use controls
            to zoom and pan.
          </p>
        </TabsContent>

        <TabsContent value="grid" className="mt-1">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredServers.map((server) => (
                <Skeleton key={server.id} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
              No servers to display.
            </div>
          ) : (
            <ServersResourceOverview
              servers={filteredServers}
              refreshKey={refreshCounter}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
