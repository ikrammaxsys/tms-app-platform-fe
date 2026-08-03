"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { AgentForm } from "@/components/platform/agent-form"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { mapAgentFromApi } from "@/lib/platform/agents"
import { ApiError } from "@/lib/platform/api"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent } from "@/lib/platform/types"

export default function EditAgentPage() {
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
          <Link href={`/agents/${agent.id}`}>
            <ArrowLeft />
            Back to Agent
          </Link>
        }
      />
      <PageHeader title="Edit Agent" description={`Update ${agent.name}`} />
      <AgentForm agent={agent} />
    </div>
  )
}
