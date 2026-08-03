"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  defaultEntityAgentConfigSettings,
  type EntityAgentConfigSettings,
} from "@/lib/platform/agent-config-mock"

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

export function EntityAgentConfigSection({
  entityLabel,
  entityName,
}: {
  entityLabel: string
  entityName: string
}) {
  const [settings, setSettings] = React.useState<EntityAgentConfigSettings>(
    defaultEntityAgentConfigSettings,
  )

  function patchSettings(patch: Partial<EntityAgentConfigSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agent configuration</CardTitle>
        <CardDescription>
          Dummy settings for how the platform agent monitors this {entityLabel}. Not persisted
          yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Target: <span className="text-foreground font-medium">{entityName}</span>
        </p>

        <ToggleRow
          label="Uptime monitoring"
          description="Agent checks availability and reports uptime for this target."
          checked={settings.uptimeMonitoringEnabled}
          onCheckedChange={(uptimeMonitoringEnabled) =>
            patchSettings({ uptimeMonitoringEnabled })
          }
        />

        <ToggleRow
          label="Log monitoring"
          description="Agent scans log files and ingests new entries to the platform."
          checked={settings.logMonitoringEnabled}
          onCheckedChange={(logMonitoringEnabled) =>
            patchSettings({ logMonitoringEnabled })
          }
        />
      </CardContent>
    </Card>
  )
}
