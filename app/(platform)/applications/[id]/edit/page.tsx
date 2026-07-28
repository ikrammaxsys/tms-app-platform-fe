import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApplicationForm } from "@/components/platform/application-form"
import { Button } from "@/components/ui/button"
import { updateApplication } from "@/lib/platform/actions"
import { getApplicationById, getGroups, getServers } from "@/lib/platform/queries"

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [application, servers, groups] = await Promise.all([
    getApplicationById(Number(id)),
    getServers(),
    getGroups(),
  ])
  if (!application) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href={`/applications/${application.id}`}>
            <ArrowLeft />
            Back to {application.name}
          </Link>
        }
      />
      <PageHeader title={`Edit ${application.name}`} description="Update application details" />
      <ApplicationForm
        action={updateApplication}
        application={application}
        servers={servers}
        groups={groups}
      />
    </div>
  )
}
