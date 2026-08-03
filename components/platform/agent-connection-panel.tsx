"use client"

import * as React from "react"
import { Copy, Check, Wifi } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentStatusBadge } from "@/components/platform/agent-status-badge"
import { mapReadyStatusToAgentPatch, readyStatusMessage } from "@/lib/platform/agents"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent } from "@/lib/platform/types"

const POLL_INTERVAL_MS = 10_000

export function AgentConnectionPanel({
  agent,
  onUpdate,
}: {
  agent: Agent
  onUpdate: (agent: Agent) => void
}) {
  const [lastResult, setLastResult] = React.useState<string | null>(
    agent.connectionMessage,
  )
  const [displayStatus, setDisplayStatus] = React.useState(agent.status)
  const [lastReadyAt, setLastReadyAt] = React.useState<string | null>(agent.lastSeenAt)

  React.useEffect(() => {
    setDisplayStatus(agent.status)
    setLastReadyAt(agent.lastSeenAt)
  }, [agent.status, agent.lastSeenAt])

  const agentRef = React.useRef(agent)
  const onUpdateRef = React.useRef(onUpdate)

  React.useEffect(() => {
    agentRef.current = agent
  }, [agent])

  React.useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const checkReady = React.useCallback(async () => {
    try {
      const ready = await tmsApi.getAgentReady(agent.uid)
      const patched = mapReadyStatusToAgentPatch(agentRef.current, ready)
      const message = readyStatusMessage(ready)
      setDisplayStatus(patched.status)
      setLastResult(message)
      setLastReadyAt(patched.lastSeenAt)
      onUpdateRef.current(patched)
    } catch {
      // keep last known status on poll failure
    }
  }, [agent.uid])

  React.useEffect(() => {
    let cancelled = false

    async function poll() {
      if (cancelled) return
      await checkReady()
    }

    void poll()
    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [agent.uid, checkReady])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="size-4" />
          Connection status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Current status
            </p>
            <div className="mt-1">
              <AgentStatusBadge status={displayStatus} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Last ready detected at{" "}
              {lastReadyAt
                ? new Date(lastReadyAt).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>

        {lastResult ? (
          <p className="text-muted-foreground rounded-md border bg-muted/40 p-3 text-sm">
            {lastResult}
          </p>
        ) : null}

        <div className="text-muted-foreground space-y-1 text-sm">
          <p>
            After you install the agent on the server, it will call{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
              POST /api/agents/{agent.uid}/ready
            </code>{" "}
            with its token. This section polls{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
              GET /api/agents/{agent.uid}/ready
            </code>{" "}
            every 10 seconds and updates when the agent reports ready.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CopyField({
  label,
  value,
  mono = true,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <div className="flex gap-2">
        <code
          className={`bg-muted flex-1 rounded-md border px-3 py-2 text-sm break-all ${mono ? "font-mono" : ""}`}
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  )
}
