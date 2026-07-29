"use client"

import * as React from "react"
import Link from "next/link"
import { LayoutGrid, Network, Plus, Search } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { ServerTopologyFlow } from "@/components/platform/server-topology-flow"
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
import { buildServerTopology } from "@/lib/platform/server-topology-layout"
import { tmsApi } from "@/lib/platform/api-service"
import type { Application, Server } from "@/lib/platform/types"

export default function ServersOverviewPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [servers, setServers] = React.useState<Server[]>([])
  const [applications, setApplications] = React.useState<Application[]>([])
  const [serverFilter, setServerFilter] = React.useState("all")
  const [query, setQuery] = React.useState("")

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
        setApplications(appList ?? [])
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
  }, [])

  const filteredServers = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    return servers.filter((s) => {
      if (serverFilter !== "all" && String(s.id) !== serverFilter) return false
      if (!search) return true
      return `${s.domain} ${s.ipAddress} ${s.environment} ${s.provider}`
        .toLowerCase()
        .includes(search)
    })
  }, [query, serverFilter, servers])

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

    return buildServerTopology(visibleServers, apps, { serverIds })
  }, [applications, filteredServers, query, serverFilter, servers])

  const totalAppsOnView = nodes.filter((n) => n.data.kind === "application").length

  if (error) {
    return (
      <div>
        <PageHeader
          title="Servers overview"
          description="Visual map of servers and connected applications"
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
      </div>

      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Network className="size-4" />
        <span>
          {filteredServers.length} server{filteredServers.length === 1 ? "" : "s"} · {totalAppsOnView}{" "}
          application{totalAppsOnView === 1 ? "" : "s"} on canvas
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-[min(70vh,640px)] w-full rounded-xl" />
      ) : (
        <ServerTopologyFlow nodes={nodes} edges={edges} />
      )}

      <p className="text-muted-foreground mt-3 text-xs">
        Each application node connects to its host server. Drag nodes to rearrange; use controls to
        zoom and pan.
      </p>
    </div>
  )
}
