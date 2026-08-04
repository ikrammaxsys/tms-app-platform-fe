"use client"

import * as React from "react"

import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { DependencyEditor } from "@/components/platform/dependency-editor"
import { PageHeader } from "@/components/platform/page-header"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { Application } from "@/lib/platform/types"

export default function DependencyEditorPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [applications, setApplications] = React.useState<Application[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await tmsApi.listApplications()
        if (cancelled) return
        setApplications([...(items ?? [])].sort((a, b) => a.name.localeCompare(b.name)))
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

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dependency Editor"
          description="Drag applications onto the canvas and draw dependency arrows manually."
        />
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Dependency Editor"
          description="Drag applications onto the canvas and draw dependency arrows manually."
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dependency Editor"
        description="Drag applications onto the canvas and draw dependency arrows manually."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Beta</Badge>
            <Badge variant="secondary">Mock · saved in browser</Badge>
          </div>
        }
      />
      <DependencyEditor applications={applications} />
    </div>
  )
}
