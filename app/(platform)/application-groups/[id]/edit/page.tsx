import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { GroupForm } from "@/components/platform/group-form"
import { Button } from "@/components/ui/button"
import { updateGroup } from "@/lib/platform/actions"
import { getGroupById } from "@/lib/platform/queries"

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const group = await getGroupById(Number(id))
  if (!group) notFound()

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href={`/application-groups/${group.id}`}>
            <ArrowLeft />
            Back to {group.name}
          </Link>
        }
      />
      <PageHeader title={`Edit ${group.name}`} description="Update application group" />
      <GroupForm action={updateGroup} group={group} />
    </div>
  )
}
