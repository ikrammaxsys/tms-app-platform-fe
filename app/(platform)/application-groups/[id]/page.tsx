import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DeleteButton } from "@/components/platform/delete-button"
import { ApplicationsTable } from "@/components/platform/applications-table"
import { deleteGroup } from "@/lib/platform/actions"
import { getGroupApplications, getGroupById } from "@/lib/platform/queries"

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

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const groupId = Number(id)
  const group = await getGroupById(groupId)
  if (!group) notFound()

  const applications = await getGroupApplications(groupId)

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/application-groups">
            <ArrowLeft />
            Back to Application Groups
          </Link>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {applications.length} application{applications.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/application-groups/${group.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                }
              />
              <DeleteButton id={group.id} label={group.name} action={deleteGroup} />
            </div>
          </div>

          <Separator className="my-4" />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Meta label="ID">{group.id}</Meta>
            <Meta label="Group Name">{group.name}</Meta>
            <Meta label="Applications">{applications.length}</Meta>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applications in this group</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationsTable applications={applications} withActions />
        </CardContent>
      </Card>
    </div>
  )
}
