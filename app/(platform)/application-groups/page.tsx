"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { GroupsTable } from "@/components/platform/groups-table"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { tmsApi } from "@/lib/platform/api-service"
import type { ApplicationGroup } from "@/lib/platform/types"

export default function ApplicationGroupsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<unknown>(null)
  const [groups, setGroups] = React.useState<ApplicationGroup[]>([])
  const [appCounts, setAppCounts] = React.useState<Record<number, number>>({})

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [groupItems, apps] = await Promise.all([
          tmsApi.listApplicationGroups(),
          tmsApi.listApplications(),
        ])
        if (cancelled) return
        const counts: Record<number, number> = {}
        for (const app of apps ?? []) {
          counts[app.applicationGroupId] = (counts[app.applicationGroupId] ?? 0) + 1
        }
        setGroups([...(groupItems ?? [])].sort((a, b) => a.name.localeCompare(b.name)))
        setAppCounts(counts)
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

  if (error) {
    return (
      <div>
        <PageHeader
          title="Application Groups"
          description="Organize applications into logical groups"
        />
        <ApiUnavailable error={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Application Groups"
        description="Organize applications into logical groups"
        actions={
          <Button render={<Link href="/application-groups/new" />}>
            <Plus />
            Create Group
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <GroupsTable groups={groups} appCounts={appCounts} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
