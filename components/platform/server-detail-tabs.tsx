"use client"

import * as React from "react"
import { LayoutGrid, Network, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApplicationsTable } from "@/components/platform/applications-table"
import { ServerMetricsPanel } from "@/components/platform/server-metrics-panel"
import { ServerTopologyFlow } from "@/components/platform/server-topology-flow"
import { buildServerTopology } from "@/lib/platform/server-topology-layout"
import type { ServerDetail, ServerTimelineDays } from "@/lib/platform/queries"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "overview", label: "Overview", available: true },
  { value: "applications", label: "Applications", available: true },
] as const

type ApplicationsView = "graph" | "table"

function ApplicationsPanel({
  server,
  applications,
}: {
  server: ServerDetail["server"]
  applications: ServerDetail["applications"]
}) {
  const [view, setView] = React.useState<ApplicationsView>("graph")
  const [query, setQuery] = React.useState("")

  const filteredApplications = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return applications
    return applications.filter((app) =>
      `${app.name} ${app.version} ${app.applicationGroupName}`.toLowerCase().includes(search),
    )
  }, [applications, query])

  const { nodes, edges } = React.useMemo(
    () => buildServerTopology([server], filteredApplications, { serverIds: [server.id] }),
    [server, filteredApplications],
  )

  const appsOnCanvas = nodes.filter((n) => n.data.kind === "application").length

  return (
    <div>
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
      </div>

      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-sm">
        {view === "graph" ? <Network className="size-4" /> : <LayoutGrid className="size-4" />}
        <span>
          {appsOnCanvas} application{appsOnCanvas === 1 ? "" : "s"}
          {view === "graph" ? " on canvas" : " in table"}
        </span>
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as ApplicationsView)}
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
            value="table"
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
            )}
          >
            <LayoutGrid className="size-4" />
            Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-1">
          <ServerTopologyFlow nodes={nodes} edges={edges} />
          <p className="text-muted-foreground mt-3 text-xs">
            Applications connected to {server.domain}. Drag nodes to rearrange; use controls to
            zoom and pan.
          </p>
        </TabsContent>

        <TabsContent value="table" className="mt-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applications on this server</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredApplications.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {applications.length === 0
                    ? "No applications deployed on this server yet."
                    : "No applications match your search."}
                </p>
              ) : (
                <ApplicationsTable applications={filteredApplications} withActions />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ServerDetailTabs({
  detail,
  serverId,
  selectedDays,
}: {
  detail: ServerDetail
  serverId: number
  selectedDays: ServerTimelineDays
}) {
  return (
    <Tabs defaultValue="overview" className="gap-4">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
              !tab.available && "text-muted-foreground/70",
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-1">
        <ServerMetricsPanel detail={detail} serverId={serverId} selectedDays={selectedDays} />
      </TabsContent>

      <TabsContent value="applications" className="mt-1">
        <ApplicationsPanel server={detail.server} applications={detail.applications} />
      </TabsContent>
    </Tabs>
  )
}
