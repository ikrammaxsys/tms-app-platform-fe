import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { EnvironmentBadge } from "@/components/platform/status"
import { DeleteButton } from "@/components/platform/delete-button"
import { PageRefreshButton } from "@/components/platform/page-refresh-button"
import { ServerDetailTabs } from "@/components/platform/server-detail-tabs"
import { deleteServer } from "@/lib/platform/actions"
import { getOrganizations, getServerDetail, parseServerTimelineDays } from "@/lib/platform/queries"
import { organizationCodeById } from "@/lib/platform/view"
import type { Environment } from "@/lib/platform/types"

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

export default async function ServerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ days?: string }>
}) {
  const { id } = await params
  const { days: daysParam } = await searchParams
  const serverId = Number(id)
  const days = parseServerTimelineDays(daysParam)
  const [detail, organizations] = await Promise.all([
    getServerDetail(serverId, days),
    getOrganizations(),
  ])
  if (!detail) notFound()

  const { server } = detail
  const companyCode = organizationCodeById(organizations, server.organizationId)

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/servers">
            <ArrowLeft />
            Back to Servers
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{server.domain}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {server.ipAddress} · {server.provider}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PageRefreshButton />
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/servers/${server.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
              <DeleteButton id={server.id} label={server.domain} action={deleteServer} />
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <Meta label="Company Code">
              <span className="font-mono">{companyCode}</span>
            </Meta>
            <Meta label="Domain">{server.domain}</Meta>
            <Meta label="IP Address">
              <span className="font-mono">{server.ipAddress}</span>
            </Meta>
            <Meta label="Environment">
              <EnvironmentBadge environment={server.environment as Environment} />
            </Meta>
            <Meta label="Internal / External">{server.internalExternal}</Meta>
            <Meta label="Country">{server.country || "-"}</Meta>
            <Meta label="Provider">{server.provider}</Meta>
          </dl>
        </CardContent>
      </Card>

      <ServerDetailTabs detail={detail} serverId={serverId} selectedDays={days} />
    </div>
  )
}
