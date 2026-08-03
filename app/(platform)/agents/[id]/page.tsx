"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { AgentDetailTabs } from "@/components/platform/agent-detail-tabs"
import { AgentStatusBadge } from "@/components/platform/agent-status-badge"
import { CopyField } from "@/components/platform/agent-connection-panel"
import { AgentRowActions } from "@/components/platform/agent-row-actions"
import { mapAgentFromApi } from "@/lib/platform/agents"
import { ApiError } from "@/lib/platform/api"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent } from "@/lib/platform/types"

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  )
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  const agentId = Number(params.id)
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [error, setError] = React.useState<unknown>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const item = await tmsApi.getAgent(agentId)
        if (cancelled) return
        setAgent(mapAgentFromApi(item))
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
  }, [agentId])

  if (loading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (error instanceof ApiError && error.status === 404) notFound()

  if (error) {
    return <ApiUnavailable error={error} />
  }

  if (!agent) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/agents">
            <ArrowLeft />
            Back to Agents
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <p className="text-muted-foreground mt-1 font-mono text-sm">{agent.uid}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/agents/${agent.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
              <AgentRowActions
                agent={agent}
                onDelete={() => {
                  window.location.href = "/agents"
                }}
              />
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Meta label="Status">
              <AgentStatusBadge status={agent.status} />
            </Meta>
            <Meta label="Server">{agent.serverDomain}</Meta>
            <Meta label="Created">
              {new Date(agent.createdAt).toLocaleString()}
            </Meta>
            <Meta label="Last seen">
              {agent.lastSeenAt
                ? new Date(agent.lastSeenAt).toLocaleString()
                : "—"}
            </Meta>
          </dl>

          <Separator className="my-4" />

          <CopyField label="Authentication token" value={agent.token} />
        </CardContent>
      </Card>

      <AgentDetailTabs agent={agent} onAgentUpdate={(updated) => setAgent(updated)} />
    </div>
  )
}
