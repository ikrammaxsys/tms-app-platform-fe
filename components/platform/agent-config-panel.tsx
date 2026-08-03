"use client"

import * as React from "react"
import { Check, Copy, Pencil, RefreshCw, Save, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  agentConfigDrifted,
  annotateJsonDriftLinesFromTemplate,
  buildTemplateAgentConfig,
  formatConfigJson,
  parseAgentConfig,
  serializeAgentConfig,
  type AgentConfig,
} from "@/lib/platform/agent-config-mock"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent, Application } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 rounded-lg border p-3",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
    </label>
  )
}

function ConfigJsonPreview({
  json,
  highlightDrift,
  template,
}: {
  json: string
  highlightDrift: boolean
  template: AgentConfig
}) {
  const annotatedLines = React.useMemo(() => {
    if (!highlightDrift) {
      return json.split("\n").map((text, index) => ({
        text,
        drifted: false,
        lineNumber: index + 1,
      }))
    }

    return annotateJsonDriftLinesFromTemplate(json, template)
  }, [highlightDrift, json, template])

  const hasDriftedLines = annotatedLines.some((line) => line.drifted)

  return (
    <div className="space-y-2">
      {hasDriftedLines ? (
        <p className="text-muted-foreground text-xs">
          Amber lines differ from the generated template (defaults, endpoints, applications, and server data).
        </p>
      ) : null}
      <pre
        className={cn(
          "bg-muted max-h-[720px] overflow-auto rounded-lg border p-0",
          "font-mono text-xs leading-relaxed",
        )}
      >
        <code>
          {annotatedLines.map((line) => (
            <div
              key={`${line.lineNumber}-${line.text}`}
              className={cn(
                "flex min-w-full",
                line.drifted
                  ? "bg-amber-500/15 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100"
                  : "",
              )}
            >
              <span
                className={cn(
                  "text-muted-foreground/70 w-10 shrink-0 select-none border-r px-2 py-0.5 text-right",
                  line.drifted
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-border/60 bg-muted/60",
                )}
              >
                {line.lineNumber}
              </span>
              <span className="min-w-0 flex-1 px-3 py-0.5 break-all whitespace-pre-wrap">
                {line.text || " "}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min = 1000,
  step = 1000,
  disabled,
}: {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
  disabled?: boolean
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
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || min)}
      />
    </div>
  )
}

export function AgentConfigPanel({ agent }: { agent: Agent }) {
  const [config, setConfig] = React.useState<AgentConfig | null>(null)
  const [savedConfigJson, setSavedConfigJson] = React.useState("")
  const [serverApplications, setServerApplications] = React.useState<Application[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [regenerating, setRegenerating] = React.useState(false)
  const [error, setError] = React.useState<unknown>(null)
  const [copied, setCopied] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [jsonEditMode, setJsonEditMode] = React.useState(false)
  const [jsonDraft, setJsonDraft] = React.useState("")
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = React.useState(false)

  const templateConfig = React.useMemo(
    () => buildTemplateAgentConfig(agent, serverApplications),
    [agent, serverApplications],
  )

  const configDrifted = React.useMemo(
    () => agentConfigDrifted(savedConfigJson, templateConfig),
    [savedConfigJson, templateConfig],
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setDirty(false)
      try {
        const [record, applications] = await Promise.all([
          tmsApi.getAgentConfig(agent.uid),
          tmsApi.listApplications(),
        ])
        if (cancelled) return
        const serverApps = (applications ?? []).filter(
          (app) => app.serverId === agent.serverId,
        )
        setServerApplications(serverApps)
        setSavedConfigJson(record.configJson ?? "")
        setConfig(parseAgentConfig(record.configJson, agent, serverApps))
        setJsonEditMode(false)
        setJsonError(null)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [agent.uid, agent.token, agent.serverDomain, agent.serverId])

  function patchConfig(updater: (current: AgentConfig) => AgentConfig) {
    setConfig((current) => {
      if (!current) return current
      const next = updater(current)
      setDirty(true)
      if (jsonEditMode) {
        setJsonDraft(serializeAgentConfig(next))
        setJsonError(null)
      }
      return next
    })
  }

  function startJsonEdit() {
    if (!config) return
    const source = dirty
      ? serializeAgentConfig(config)
      : formatConfigJson(savedConfigJson || serializeAgentConfig(config))
    setJsonDraft(source)
    setJsonError(null)
    setJsonEditMode(true)
  }

  function cancelJsonEdit() {
    if (!config) return
    const source = dirty
      ? serializeAgentConfig(config)
      : formatConfigJson(savedConfigJson || serializeAgentConfig(config))
    setJsonDraft(source)
    setJsonError(null)
    setJsonEditMode(false)
  }

  function applyJsonDraft() {
    try {
      JSON.parse(jsonDraft)
      const next = parseAgentConfig(jsonDraft, agent, serverApplications)
      setConfig(next)
      setDirty(true)
      setJsonError(null)
      setJsonEditMode(false)
      toast.success("JSON applied to configuration")
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON")
      toast.error("Could not apply JSON — fix syntax errors first")
    }
  }

  async function handleRegenerateApplications() {
    setRegenerating(true)
    try {
      const applications = await tmsApi.listApplications()
      const serverApps = (applications ?? []).filter(
        (app) => app.serverId === agent.serverId,
      )
      setServerApplications(serverApps)
      setConfig((current) => {
        if (!current) return current
        const next = buildTemplateAgentConfig(agent, serverApps)
        setDirty(true)
        if (jsonEditMode) {
          setJsonDraft(serializeAgentConfig(next))
          setJsonError(null)
        }
        return next
      })
      toast.success("Config regenerated from template")
    } catch {
      toast.error("Failed to regenerate applications")
    } finally {
      setRegenerating(false)
    }
  }

  async function confirmRegenerateApplications() {
    setRegenerateDialogOpen(false)
    await handleRegenerateApplications()
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    try {
      const record = await tmsApi.updateAgentConfig(agent.uid, {
        configJson: serializeAgentConfig(config),
      })
      const applications = await tmsApi.listApplications()
      const serverApps = (applications ?? []).filter(
        (app) => app.serverId === agent.serverId,
      )
      setServerApplications(serverApps)
      setSavedConfigJson(record.configJson ?? "")
      setConfig(parseAgentConfig(record.configJson, agent, serverApps))
      setJsonEditMode(false)
      setJsonError(null)
      setDirty(false)
      toast.success("Agent config saved")
    } catch {
      toast.error("Failed to save agent config")
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyConfig() {
    if (!config) return
    const text = jsonEditMode
      ? jsonDraft
      : dirty
        ? serializeAgentConfig(config)
        : formatConfigJson(savedConfigJson || serializeAgentConfig(config))
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Config copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy config")
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (error) {
    return <ApiUnavailable error={error} />
  }

  if (!config) return null

  const jsonPreview = dirty
    ? serializeAgentConfig(config)
    : formatConfigJson(savedConfigJson || serializeAgentConfig(config))

  function SyncStatusBadge() {
    if (configDrifted) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 bg-amber-500/15 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-100"
              >
                <TriangleAlert data-icon="inline-start" />
                Drifted
              </Badge>
            }
          />
          <TooltipContent className="max-w-xs">
            Saved config JSON differs from the generated template. This usually means
            values were edited manually or platform data changed after the last save.
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-100"
            >
              <Check data-icon="inline-start" />
              In sync
            </Badge>
          }
        />
        <TooltipContent className="max-w-xs">
          Saved config JSON matches the generated template from platform defaults and data.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delay={200}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopyConfig}>
          {copied ? <Check /> : <Copy />}
          Copy config
        </Button>
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
          <Save />
          {saving ? "Saving…" : "Save config"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monitoring settings</CardTitle>
              <CardDescription>
                Changes are saved to the platform via the agent config API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                label="Server uptime monitoring"
                description="Collect host CPU, memory, and disk metrics."
                checked={config.host.metrics.enabled}
                onCheckedChange={(enabled) =>
                  patchConfig((current) => ({
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
                onChange={(intervalMs) =>
                  patchConfig((current) => ({ ...current, intervalMs }))
                }
              />

              <ToggleRow
                label="Log scanning"
                description="Scan application log files and ingest new lines."
                checked={config.logScanning.enabled}
                onCheckedChange={(enabled) =>
                  patchConfig((current) => ({
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
                  patchConfig((current) => ({
                    ...current,
                    logScanning: { ...current.logScanning, intervalMs },
                  }))
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">Applications</CardTitle>
                    <SyncStatusBadge />
                  </div>
                  <CardDescription>
                    Loaded from application records on {agent.serverDomain}. Edit
                    monitoring in each application&apos;s Configuration tab.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={regenerating}
                  onClick={() => setRegenerateDialogOpen(true)}
                >
                  <RefreshCw className={regenerating ? "animate-spin" : undefined} />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.applications.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No applications found on this agent&apos;s server.
                </p>
              ) : (
                config.applications.map((app, index) => (
                  <div key={app.appId || index} className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{app.name || "Unnamed application"}</p>
                        <p className="text-muted-foreground font-mono text-xs">{app.appId}</p>
                      </div>
                      <Badge variant={app.enabled ? "default" : "secondary"}>
                        {app.enabled ? "Monitoring on" : "Monitoring off"}
                      </Badge>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`app-url-${app.appId}`}>Healthcheck URL</Label>
                      <Input
                        id={`app-url-${app.appId}`}
                        value={app.url}
                        readOnly
                        disabled
                        className="bg-muted/40"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`logs-path-${app.appId}`}>Log path</Label>
                      <Input
                        id={`logs-path-${app.appId}`}
                        value={app.logs_path}
                        readOnly
                        disabled
                        className="bg-muted/40"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Config JSON</CardTitle>
                  <SyncStatusBadge />
                </div>
                <CardDescription>
                  {jsonEditMode
                    ? "Edit the JSON directly, then apply to update agent settings."
                    : dirty
                      ? "Preview of unsaved changes that will be written to config_json on save."
                      : "Current config_json stored for this agent."}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {configDrifted ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={regenerating}
                    onClick={() => setRegenerateDialogOpen(true)}
                  >
                    <RefreshCw className={regenerating ? "animate-spin" : undefined} />
                    Regenerate
                  </Button>
                ) : null}
                {!jsonEditMode ? (
                  <Button type="button" variant="outline" size="sm" onClick={startJsonEdit}>
                    <Pencil />
                    Edit JSON
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={cancelJsonEdit}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={applyJsonDraft}>
                      Apply
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {jsonEditMode ? (
              <Textarea
                value={jsonDraft}
                onChange={(e) => {
                  setJsonDraft(e.target.value)
                  setJsonError(null)
                }}
                spellCheck={false}
                className="min-h-[720px] font-mono text-xs leading-relaxed"
                aria-invalid={Boolean(jsonError)}
              />
            ) : (
              <ConfigJsonPreview
                json={jsonPreview}
                highlightDrift={configDrifted && !dirty}
                template={templateConfig}
              />
            )}
            {jsonError ? (
              <p className="text-destructive text-xs">{jsonError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate config from template?</DialogTitle>
            <DialogDescription>
              This replaces the working config with the latest generated template
              (endpoints, monitoring defaults, applications, and server data).
              Save config afterward to update config_json.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={regenerating}
              onClick={() => void confirmRegenerateApplications()}
            >
              {regenerating ? "Regenerating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  )
}
