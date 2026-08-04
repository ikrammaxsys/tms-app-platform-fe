import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DeleteButton } from "@/components/platform/delete-button"
import { PageRefreshButton } from "@/components/platform/page-refresh-button"
import { deleteOrganization } from "@/lib/platform/actions"
import { getOrganizationById } from "@/lib/platform/queries"

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

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const organizationId = Number(id)
  const organization = await getOrganizationById(organizationId)
  if (!organization) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/organizations">
            <ArrowLeft />
            Back to Organizations
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
              <p className="text-muted-foreground mt-1 font-mono text-sm">{organization.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PageRefreshButton />
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/organizations/${organization.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
              <DeleteButton
                id={organization.id}
                label={organization.name}
                action={deleteOrganization}
              />
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Meta label="ID">{organization.id}</Meta>
            <Meta label="Code">{organization.code}</Meta>
            <Meta label="Organization Name">{organization.name}</Meta>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
