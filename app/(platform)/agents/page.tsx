"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { AgentsTable } from "@/components/platform/agents-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { OverviewRefreshButton } from "@/components/platform/overview-refresh-button"
import { ExportCsvButton } from "@/components/platform/export-csv-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { mapAgentListItem } from "@/lib/platform/agents"
import { agentCsvColumns } from "@/lib/platform/csv-exports"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent } from "@/lib/platform/types"

export default function AgentsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [refreshCounter, setRefreshCounter] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await tmsApi.listAgents()
        if (cancelled) return
        setAgents([...(items ?? [])].map(mapAgentListItem).sort((a, b) => a.name.localeCompare(b.name)))
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
          title="Agents"
          description="Manage platform agents deployed on servers"
          actions={
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((c) => c + 1)}
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
        title="Agents"
        description="Manage platform agents deployed on servers"
        actions={
          <>
            <Button render={<Link href="/agents/new" />}>
              <Plus />
              Create Agent
            </Button>
            <ExportCsvButton
              filename="agents"
              columns={agentCsvColumns}
              rows={agents}
              disabled={loading}
            />
            <OverviewRefreshButton
              onRefresh={() => setRefreshCounter((c) => c + 1)}
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
            <AgentsTable
              agents={agents}
              onDelete={() => setRefreshCounter((c) => c + 1)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
