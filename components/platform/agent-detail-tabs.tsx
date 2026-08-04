"use client"

import { AgentConfigPanel } from "@/components/platform/agent-config-panel"
import { AgentConnectionPanel } from "@/components/platform/agent-connection-panel"
import { AgentInstallSteps } from "@/components/platform/agent-install-steps"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Agent } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "installation", label: "Installation" },
  { value: "configuration", label: "Configuration" },
] as const

export function AgentDetailTabs({
  agent,
  onAgentUpdate,
}: {
  agent: Agent
  onAgentUpdate: (agent: Agent) => void
}) {
  return (
    <Tabs defaultValue="installation" className="gap-4">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0"
      >
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "text-muted-foreground h-10 flex-none rounded-none border-0 px-4 py-2 text-sm font-medium shadow-none",
              "data-active:text-primary data-active:bg-transparent dark:data-active:bg-transparent",
              "after:bg-primary group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="installation" className="mt-1">
        <div className="w-full space-y-4">
          <AgentInstallSteps agent={agent} />
          <AgentConnectionPanel agent={agent} onUpdate={onAgentUpdate} />
        </div>
      </TabsContent>

      <TabsContent value="configuration" className="mt-1">
        <AgentConfigPanel agent={agent} />
      </TabsContent>
    </Tabs>
  )
}
