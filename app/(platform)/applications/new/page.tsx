import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ApplicationForm } from "@/components/platform/application-form"
import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { Button } from "@/components/ui/button"
import { createApplication } from "@/lib/platform/actions"
import { getGroups, getServers } from "@/lib/platform/queries"

export default async function NewApplicationPage() {
  try {
    const [servers, groups] = await Promise.all([getServers(), getGroups()])

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
        <PageHeader title="Create Application" description="Register a new application to monitor" />
        <ApplicationForm action={createApplication} servers={servers} groups={groups} />
      </div>
    )
  } catch (error) {
    return (
      <div>
        <PageHeader title="Create Application" description="Register a new application to monitor" />
        <ApiUnavailable error={error} />
      </div>
    )
  }
}
