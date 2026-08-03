"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil, Save } from "lucide-react"
import { toast } from "sonner"

import { ApiUnavailable } from "@/components/platform/api-unavailable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  applicationToMonitoringSettings,
  applicationToUpsert,
  monitoringSettingsToApplicationFields,
} from "@/lib/platform/application-monitoring"
import {
  defaultEntityAgentConfigSettings,
  type EntityAgentConfigSettings,
} from "@/lib/platform/agent-config-mock"
import { tmsApi } from "@/lib/platform/api-service"
import type { Application } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function MonitoringBox({
  label,
  description,
  enabled,
  onEnabledChange,
  disabled,
  children,
}: {
  label: string
  description?: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border">
      <label
        className={cn(
          "flex items-start justify-between gap-4 p-3",
          disabled ? "cursor-default opacity-80" : "cursor-pointer",
          children ? "border-b" : "",
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
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
      </label>
      {children ? <div className="space-y-1.5 p-3">{children}</div> : null}
    </div>
  )
}

export function EntityAgentConfigSection({
  entityLabel,
  entityName,
  application,
}: {
  entityLabel: string
  entityName: string
  application?: Application
}) {
  const router = useRouter()
  const showApplicationFields = Boolean(application)
  const [settings, setSettings] = React.useState<EntityAgentConfigSettings>(
    defaultEntityAgentConfigSettings,
  )
  const [draft, setDraft] = React.useState<EntityAgentConfigSettings>(settings)
  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(Boolean(application))
  const [error, setError] = React.useState<unknown>(null)

  React.useEffect(() => {
    if (!application) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const item = await tmsApi.getApplication(application.id)
        if (cancelled) return
        const next = applicationToMonitoringSettings(item)
        setSettings(next)
        setDraft(next)
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
  }, [application])

  function patchDraft(patch: Partial<EntityAgentConfigSettings>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function handleEdit() {
    setDraft(settings)
    setEditing(true)
  }

  async function handleSave() {
    if (!application) {
      setSettings(draft)
      setEditing(false)
      toast.success("Agent configuration saved")
      return
    }

    setSaving(true)
    try {
      const latest = await tmsApi.getApplication(application.id)
      await tmsApi.updateApplication(
        application.id,
        applicationToUpsert(latest, monitoringSettingsToApplicationFields(draft)),
      )
      const refreshed = await tmsApi.getApplication(application.id)
      const next = applicationToMonitoringSettings(refreshed)
      setSettings(next)
      setDraft(next)
      setEditing(false)
      router.refresh()
      toast.success("Agent configuration saved")
    } catch {
      toast.error("Failed to save agent configuration")
    } finally {
      setSaving(false)
    }
  }

  const display = editing ? draft : settings

  if (loading) {
    return <Skeleton className="h-72 w-full" />
  }

  if (error) {
    return <ApiUnavailable error={error} />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Agent configuration</CardTitle>
            <CardDescription>
              Settings for how the platform agent monitors this {entityLabel}.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            {!editing ? (
              <Button type="button" variant="outline" size="sm" onClick={handleEdit}>
                <Pencil />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(settings)
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                  <Save />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Target: <span className="text-foreground font-medium">{entityName}</span>
        </p>

        <MonitoringBox
          label="Uptime monitoring"
          description="Agent checks availability and reports uptime for this target."
          enabled={display.uptimeMonitoringEnabled}
          disabled={!editing}
          onEnabledChange={(uptimeMonitoringEnabled) =>
            patchDraft({ uptimeMonitoringEnabled })
          }
        >
          {showApplicationFields ? (
            <>
              <Label htmlFor="healthcheck-url">Healthcheck URL</Label>
              <p className="text-muted-foreground text-xs">
                Endpoint the agent calls to verify this application is up.
              </p>
              <Input
                id="healthcheck-url"
                value={display.healthcheckUrl}
                disabled={!editing}
                onChange={(e) => patchDraft({ healthcheckUrl: e.target.value })}
                placeholder="e.g. http://localhost:5043/api/index"
              />
            </>
          ) : null}
        </MonitoringBox>

        <MonitoringBox
          label="Log monitoring"
          description="Agent scans log files and ingests new entries to the platform."
          enabled={display.logMonitoringEnabled}
          disabled={!editing}
          onEnabledChange={(logMonitoringEnabled) =>
            patchDraft({ logMonitoringEnabled })
          }
        >
          {showApplicationFields ? (
            <>
              <Label htmlFor="log-path">Log path</Label>
              <p className="text-muted-foreground text-xs">
                Directory on the server where the agent reads log files for this application.
              </p>
              <Input
                id="log-path"
                value={display.logPath}
                disabled={!editing}
                onChange={(e) => patchDraft({ logPath: e.target.value })}
                placeholder="e.g. C:/apps/my-app/Logs"
              />
            </>
          ) : null}
        </MonitoringBox>
      </CardContent>
    </Card>
  )
}
