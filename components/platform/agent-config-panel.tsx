"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  buildDefaultAgentConfig,
  type AgentConfig,
  type AgentConfigApplication,
} from "@/lib/platform/agent-config-mock"
import type { Agent } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
    </label>
  )
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min = 1000,
  step = 1000,
}: {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
      <Input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
      />
    </div>
  )
}

export function AgentConfigPanel({ agent }: { agent: Pick<Agent, "uid" | "token" | "serverDomain"> }) {
  const [config, setConfig] = React.useState<AgentConfig>(() => buildDefaultAgentConfig(agent))
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setConfig(buildDefaultAgentConfig(agent))
  }, [agent.uid, agent.token, agent.serverDomain])

  function updateApplication(index: number, patch: Partial<AgentConfigApplication>) {
    setConfig((current) => ({
      ...current,
      applications: current.applications.map((app, i) =>
        i === index ? { ...app, ...patch } : app,
      ),
    }))
  }

  const jsonPreview = JSON.stringify(config, null, 2)

  async function handleCopyConfig() {
    try {
      await navigator.clipboard.writeText(jsonPreview)
      setCopied(true)
      toast.success("Config copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy config")
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monitoring settings</CardTitle>
            <CardDescription>
              Dummy preview — changes update the JSON below but are not saved yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label="Server uptime monitoring"
              description="Collect host CPU, memory, and disk metrics."
              checked={config.host.metrics.enabled}
              onCheckedChange={(enabled) =>
                setConfig((current) => ({
                  ...current,
                  host: {
                    ...current.host,
                    metrics: { ...current.host.metrics, enabled },
                  },
                }))
              }
            />

            <NumberField
              label="Uptime scan interval (ms)"
              description="How often the agent reports server and application uptime."
              value={config.intervalMs}
              onChange={(intervalMs) => setConfig((current) => ({ ...current, intervalMs }))}
            />

            <ToggleRow
              label="Log scanning"
              description="Scan application log files and ingest new lines."
              checked={config.logScanning.enabled}
              onCheckedChange={(enabled) =>
                setConfig((current) => ({
                  ...current,
                  logScanning: { ...current.logScanning, enabled },
                }))
              }
            />

            <NumberField
              label="Log scan interval (ms)"
              description="How often the agent scans log files."
              value={config.logScanning.intervalMs}
              onChange={(intervalMs) =>
                setConfig((current) => ({
                  ...current,
                  logScanning: { ...current.logScanning, intervalMs },
                }))
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications</CardTitle>
            <CardDescription>
              Toggle which applications this agent monitors. Host fields are read-only in this preview.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.applications.map((app, index) => (
              <div key={app.appId} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{app.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">{app.appId}</p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">{app.url}</p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={app.enabled}
                      onChange={(e) =>
                        updateApplication(index, { enabled: e.target.checked })
                      }
                      className="size-4 accent-primary"
                    />
                    Monitor
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Config preview</CardTitle>
              <CardDescription>
                Current agent configuration JSON as deployed on the server.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyConfig}>
              {copied ? <Check /> : <Copy />}
              Copy config
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre
            className={cn(
              "bg-muted max-h-[720px] overflow-auto rounded-lg border p-4",
              "font-mono text-xs leading-relaxed break-all whitespace-pre-wrap",
            )}
          >
            {jsonPreview}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
