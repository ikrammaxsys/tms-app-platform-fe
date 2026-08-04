"use client"

import * as React from "react"
import { Check, Copy, Download } from "lucide-react"
import { toast } from "sonner"

import { ConfigJsonPreview } from "@/components/platform/agent-config-json-preview"
import { CopyField } from "@/components/platform/agent-connection-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  buildTemplateAgentConfig,
  serializeAgentConfig,
} from "@/lib/platform/agent-config-mock"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent, Application } from "@/lib/platform/types"

const INSTALL_STEPS = [
  "Download the App Platform Agent for your server.",
  "Create config.json in your agent folder and paste the generated configuration.",
  "Run the agent executable on the server.",
  "The agent will authenticate with the platform and call the ready endpoint.",
]

const AGENT_DOWNLOADS = [
  {
    label: "Windows (amd64)",
    href: "/downloads/tms-agent-windows-amd64.ps1",
    filename: "tms-agent.ps1",
  },
] as const

export function AgentInstallSteps({ agent }: { agent: Agent }) {
  const [loading, setLoading] = React.useState(true)
  const [serverApplications, setServerApplications] = React.useState<Application[]>([])
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function loadApplications() {
      setLoading(true)
      try {
        const applications = await tmsApi.listApplications()
        if (cancelled) return
        setServerApplications(
          (applications ?? []).filter((app) => app.serverId === agent.serverId),
        )
      } catch {
        if (!cancelled) toast.error("Could not load server applications for config preview")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadApplications()
    return () => {
      cancelled = true
    }
  }, [agent.serverId])

  const configJson = React.useMemo(
    () => serializeAgentConfig(buildTemplateAgentConfig(agent, serverApplications)),
    [agent, serverApplications],
  )

  async function handleCopyConfig() {
    try {
      await navigator.clipboard.writeText(configJson)
      setCopied(true)
      toast.success("config.json copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Install on server</CardTitle>
          <CardDescription>Deploy the agent binary and configuration file.</CardDescription>
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
                <Button
                  key={item.href}
                  variant="outline"
                  size="sm"
                  render={<a href={item.href} download={item.filename} />}
                >
                  <Download />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <CopyField label="Agent UID" value={agent.uid} />
          <CopyField label="Authentication token" value={agent.token} />
          <CopyField label="Run agent on server" value="./app-platform-agent.exe" />
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">config.json</CardTitle>
              <CardDescription>
                Copy this into <code className="text-xs">config.json</code> inside your agent folder.
                This preview is read-only.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void handleCopyConfig()}
            >
              {copied ? <Check /> : <Copy />}
              Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[480px] w-full" />
          ) : (
            <ConfigJsonPreview json={configJson} maxHeightClassName="max-h-[560px]" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
