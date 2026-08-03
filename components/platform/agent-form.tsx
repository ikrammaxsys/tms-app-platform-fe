"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CopyField } from "@/components/platform/agent-connection-panel"
import { AgentConnectionPanel } from "@/components/platform/agent-connection-panel"
import { AgentInstallSteps } from "@/components/platform/agent-install-steps"
import {
  generateAgentToken,
  generateAgentUid,
  mapAgentFromApi,
} from "@/lib/platform/agents"
import { tmsApi } from "@/lib/platform/api-service"
import type { Agent, Server } from "@/lib/platform/types"

const WIZARD_STEPS = [
  {
    title: "Agent details",
    description: "Name, server, and credentials",
  },
  {
    title: "Install on server",
    description: "Deploy the agent binary",
  },
  {
    title: "Test connection",
    description: "Verify the agent is ready",
  },
] as const

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function AgentWizardStepper({
  currentStep,
  maxReachableStep,
  onStepClick,
}: {
  currentStep: number
  maxReachableStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <nav aria-label="Agent setup progress" className="mb-6">
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isReachable = index <= maxReachableStep
          const isLast = index === WIZARD_STEPS.length - 1

          return (
            <li
              key={step.title}
              className={cn("flex flex-1 items-start gap-3", !isLast && "sm:pr-4")}
            >
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(index)}
                className={cn(
                  "flex min-w-0 flex-1 items-start gap-3 text-left transition-opacity",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && !isComplete && "border-primary text-primary",
                    !isCurrent && !isComplete && "border-border text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      isCurrent ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="text-muted-foreground hidden text-xs sm:block">
                    {step.description}
                  </span>
                </span>
              </button>
              {!isLast ? (
                <div
                  className={cn(
                    "bg-border mt-4 hidden h-px flex-1 sm:block",
                    isComplete && "bg-primary",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function AgentForm({ agent }: { agent?: Agent }) {
  const router = useRouter()
  const isEdit = Boolean(agent)
  const [pending, setPending] = React.useState(false)
  const [loadingServers, setLoadingServers] = React.useState(true)
  const [servers, setServers] = React.useState<Server[]>([])
  const [currentStep, setCurrentStep] = React.useState(0)
  const [name, setName] = React.useState(agent?.name ?? "")
  const [previewUid] = React.useState(() => agent?.uid ?? generateAgentUid())
  const [previewToken] = React.useState(() => agent?.token ?? generateAgentToken())
  const [serverId, setServerId] = React.useState(String(agent?.serverId ?? ""))
  const [liveAgent, setLiveAgent] = React.useState<Agent | undefined>(agent)

  React.useEffect(() => {
    if (agent) setLiveAgent(agent)
  }, [agent])

  React.useEffect(() => {
    let cancelled = false
    async function loadServers() {
      setLoadingServers(true)
      try {
        const items = await tmsApi.listServers()
        if (cancelled) return
        const sorted = [...(items ?? [])].sort((a, b) => a.domain.localeCompare(b.domain))
        setServers(sorted)
        setServerId((current) => current || String(sorted[0]?.id ?? ""))
      } catch {
        if (!cancelled) toast.error("Could not load servers")
      } finally {
        if (!cancelled) setLoadingServers(false)
      }
    }
    void loadServers()
    return () => {
      cancelled = true
    }
  }, [])

  const serverItems = Object.fromEntries(
    servers.map((s) => [String(s.id), s.domain]),
  )

  const selectedServer = servers.find((s) => String(s.id) === serverId)

  const displayAgent: Pick<Agent, "uid" | "token" | "serverDomain"> & Partial<Agent> =
    liveAgent ?? {
      uid: previewUid,
      token: previewToken,
      serverDomain: selectedServer?.domain ?? "",
    }

  const maxReachableStep = liveAgent ? WIZARD_STEPS.length - 1 : 0

  async function saveAgentDetails(): Promise<Agent | null> {
    const trimmedName = name.trim()
    const sid = Number(serverId)

    if (!trimmedName || !sid) {
      toast.error("Please fill in all required fields")
      return null
    }

    setPending(true)
    try {
      if (isEdit && agent) {
        await tmsApi.updateAgent(agent.id, {
          name: trimmedName,
          serverId: sid,
          uid: agent.uid,
          authToken: agent.token,
        })
        const refreshed = mapAgentFromApi(await tmsApi.getAgent(agent.id))
        toast.success("Agent updated")
        setLiveAgent(refreshed)
        return refreshed
      }

      const created = mapAgentFromApi(
        await tmsApi.createAgent({
          name: trimmedName,
          serverId: sid,
          uid: previewUid,
          authToken: previewToken,
        }),
      )
      toast.success("Agent created")
      setLiveAgent(created)
      return created
    } catch {
      toast.error("Failed to save agent")
      return null
    } finally {
      setPending(false)
    }
  }

  async function handleNext() {
    if (currentStep === 0) {
      const saved = await saveAgentDetails()
      if (!saved) return
      setCurrentStep(1)
      return
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((step) => step - 1)
  }

  function handleStepClick(step: number) {
    if (step === 0 || liveAgent) setCurrentStep(step)
  }

  function handleFinish() {
    if (liveAgent) router.push(`/agents/${liveAgent.id}`)
  }

  const isLastStep = currentStep === WIZARD_STEPS.length - 1

  return (
    <div className="max-w-3xl">
      <AgentWizardStepper
        currentStep={currentStep}
        maxReachableStep={maxReachableStep}
        onStepClick={handleStepClick}
      />

      {currentStep === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{WIZARD_STEPS[0].title}</CardTitle>
            <CardDescription>{WIZARD_STEPS[0].description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Agent name" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Monitor"
              />
            </Field>

            <CopyField label="Agent UID (auto-generated)" value={displayAgent.uid} />

            <Field label="Deploy to server">
              {loadingServers ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <Select
                  name="serverId"
                  items={serverItems}
                  value={serverId}
                  onValueChange={(v) => setServerId(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.domain} ({s.ipAddress}) — {s.environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <CopyField
              label="Authentication token (auto-generated)"
              value={displayAgent.token}
            />
            <p className="text-muted-foreground text-xs">
              The agent uses this token to authenticate before running on the server.
              Keep it secret — treat it like a password.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 1 && liveAgent ? (
        <AgentInstallSteps agent={liveAgent} />
      ) : null}

      {currentStep === 2 && liveAgent ? (
        <AgentConnectionPanel agent={liveAgent} onUpdate={setLiveAgent} />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" render={<Link href="/agents">Cancel</Link>} />

        <div className="flex gap-2">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft />
              Back
            </Button>
          ) : null}

          {isLastStep ? (
            <Button type="button" onClick={handleFinish} disabled={!liveAgent}>
              Finish
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={pending || (currentStep === 0 && loadingServers)}
            >
              {pending ? (
                "Saving…"
              ) : currentStep === 0 ? (
                <>
                  {isEdit ? "Save & continue" : "Create & continue"}
                  <ArrowRight />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
