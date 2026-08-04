import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ServerForm } from "@/components/platform/server-form"
import { Button } from "@/components/ui/button"
import { updateServer } from "@/lib/platform/actions"
import { getOrganizations, getServerById } from "@/lib/platform/queries"

export default async function EditServerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [server, organizations] = await Promise.all([
    getServerById(Number(id)),
    getOrganizations(),
  ])
  if (!server) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href={`/servers/${server.id}`}>
            <ArrowLeft />
            Back to {server.domain}
          </Link>
        }
      />
      <PageHeader title={`Edit ${server.domain}`} description="Update server details" />
      <ServerForm action={updateServer} server={server} organizations={organizations} />
    </div>
  )
}
