import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/platform/page-header"
import { AgentForm } from "@/components/platform/agent-form"
import { Button } from "@/components/ui/button"

export default function NewAgentPage() {
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2"
        render={
          <Link href="/agents">
            <ArrowLeft />
            Back to Agents
          </Link>
        }
      />
      <PageHeader
        title="Create Agent"
        description="Register a new agent and deploy it to a server"
      />
      <AgentForm />
    </div>
  )
}
