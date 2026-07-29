import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Pencil, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AppAvatar, StatusLabel } from "@/components/platform/status"
import { DeleteButton } from "@/components/platform/delete-button"
import { ApplicationDetailTabs } from "@/components/platform/application-detail-tabs"
import { deleteApplication } from "@/lib/platform/actions"
import { getApplicationDetail } from "@/lib/platform/queries"
import { formatDateTime } from "@/lib/platform/format"

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

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getApplicationDetail(Number(id))
  if (!detail) notFound()

  const { app } = detail

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/applications">
            <ArrowLeft />
            Back to Applications
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AppAvatar
                initial={app.initial}
                color={app.avatarColor}
                className="size-12 rounded-xl text-lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                  <StatusLabel status={app.status} />
                  {detail.hasVersionDrift ? (
                    <Badge variant="secondary" className="gap-1">
                      <TriangleAlert className="size-3" />
                      Version drift
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {app.applicationGroupName || "Application"} · {app.serverEnvironment}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/applications/${app.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
              <DeleteButton id={app.id} label={app.name} action={deleteApplication} />
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <Meta label="Version">
              <div className="flex flex-col gap-1">
                <span className="text-primary font-mono">{app.version}</span>
              </div>
            </Meta>
            <Meta label="UID"><span className="text-muted-foreground">{app.uid || "-"}</span></Meta>
            <Meta label="Environment">{app.serverEnvironment}</Meta>
            <Meta label="Owner">{detail.owner}</Meta>
            <Meta label="Internal/External">{detail.runtime}</Meta>
            <Meta label="Last Deployment">{formatDateTime(app.lastDeployment)}</Meta>
            <Meta label="Repository">
              {detail.repositoryUrl !== "#" ? (
                <a
                  href={detail.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Repo <ExternalLink className="size-3" />
                </a>
              ) : (
                detail.repository
              )}
            </Meta>
          </dl>
        </CardContent>
      </Card>

      <ApplicationDetailTabs detail={detail} />
    </div>
  )
}
