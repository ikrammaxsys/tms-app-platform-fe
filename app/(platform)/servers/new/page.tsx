import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { ServerForm } from "@/components/platform/server-form"
import { Button } from "@/components/ui/button"
import { createServer } from "@/lib/platform/actions"

export default function NewServerPage() {
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/servers">
            <ArrowLeft />
            Back to Servers
          </Link>
        }
      />
      <PageHeader title="Create Server" description="Register a new server" />
      <ServerForm action={createServer} />
    </div>
  )
}
