import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { GroupForm } from "@/components/platform/group-form"
import { Button } from "@/components/ui/button"
import { createGroup } from "@/lib/platform/actions"

export default function NewGroupPage() {
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
      <PageHeader title="Create Application Group" description="Add a new application group" />
      <GroupForm action={createGroup} />
    </div>
  )
}
