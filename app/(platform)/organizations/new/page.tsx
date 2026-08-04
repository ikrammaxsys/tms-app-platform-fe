import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { OrganizationForm } from "@/components/platform/organization-form"
import { Button } from "@/components/ui/button"
import { createOrganization } from "@/lib/platform/actions"

export default function NewOrganizationPage() {
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
      <PageHeader title="Create Organization" description="Add a new organization" />
      <OrganizationForm action={createOrganization} />
    </div>
  )
}
