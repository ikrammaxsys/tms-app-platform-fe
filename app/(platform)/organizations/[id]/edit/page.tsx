import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { OrganizationForm } from "@/components/platform/organization-form"
import { Button } from "@/components/ui/button"
import { updateOrganization } from "@/lib/platform/actions"
import { getOrganizationById } from "@/lib/platform/queries"

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const organization = await getOrganizationById(Number(id))
  if (!organization) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href={`/organizations/${organization.id}`}>
            <ArrowLeft />
            Back to {organization.name}
          </Link>
        }
      />
      <PageHeader title={`Edit ${organization.name}`} description="Update organization" />
      <OrganizationForm action={updateOrganization} organization={organization} />
    </div>
  )
}
