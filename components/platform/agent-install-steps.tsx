"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyField } from "@/components/platform/agent-connection-panel"
import type { Agent } from "@/lib/platform/types"

const INSTALL_STEPS = [
  "Download the App Platform Agent for your server.",
  "Write the config file (see below) with your agent UID and token.",
  "The agent will authenticate with the platform and call the ready endpoint.",
]

const AGENT_DOWNLOADS = [
  // {
  //   label: "Linux (amd64)",
  //   href: "/downloads/tms-agent-linux-amd64",
  //   filename: "tms-agent",
  // },
  {
    label: "Windows (amd64)",
    href: "/downloads/tms-agent-windows-amd64.ps1",
    filename: "tms-agent.ps1",
  },
] as const

export function AgentInstallSteps({ agent }: { agent: Pick<Agent, "uid" | "token" | "serverDomain"> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Install on server</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {INSTALL_STEPS.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Download agent executable</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Placeholder binaries for now — replace with the real agent build when available.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGENT_DOWNLOADS.map((item) => (
              <Button key={item.href} variant="outline" size="sm" render={<a href={item.href} download={item.filename} />}>
                <Download />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <CopyField label="Agent UID" value={agent.uid} />
        <CopyField label="Authentication token" value={agent.token} />
        <CopyField
          label="Run agent on server"
          value="./app-platform-agent.exe"
        />
      </CardContent>
    </Card>
  )
}
