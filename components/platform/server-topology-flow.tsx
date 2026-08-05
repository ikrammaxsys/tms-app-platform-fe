"use client"

import * as React from "react"
import Link from "next/link"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Server as ServerIcon } from "lucide-react"

import { EnvironmentBadge, StatusDot } from "@/components/platform/status"
import {
  APPLICATION_NODE_HEIGHT,
  APPLICATION_NODE_WIDTH,
  SERVER_NODE_HEIGHT,
  SERVER_NODE_WIDTH,
  type ApplicationTopologyNodeData,
  type ServerTopologyNodeData,
  type TopologyNodeData,
} from "@/lib/platform/server-topology-layout"
import type { Environment } from "@/lib/platform/types"
import { cn } from "@/lib/utils"

function ServerTopologyNode({ data }: NodeProps<Node<ServerTopologyNodeData>>) {
  return (
    <div
      className="bg-card rounded-xl border-2 border-primary/40 px-4 py-3 shadow-md"
      style={{ width: SERVER_NODE_WIDTH, height: SERVER_NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !size-2" />
      <Handle type="target" position={Position.Right} className="!bg-primary !size-2" />
      <Handle type="target" position={Position.Bottom} className="!bg-primary !size-2" />
      <Handle type="target" position={Position.Left} className="!bg-primary !size-2" />
      <div className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <ServerIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{data.domain}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">{data.ipAddress}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <EnvironmentBadge environment={data.environment as Environment} />
            <span className="text-muted-foreground text-xs">{data.provider}</span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {data.applicationCount} application{data.applicationCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <Link
        href={`/servers/${data.serverId}`}
        className="text-primary mt-2 block text-xs font-semibold hover:underline"
      >
        View server details
      </Link>
    </div>
  )
}

function ApplicationTopologyNode({ data }: NodeProps<Node<ApplicationTopologyNodeData>>) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md",
        data.status === "Operational" && "border-emerald-500/50",
        data.status === "Down" && "border-destructive/50",
        data.status === "Degraded" && "border-amber-500/50",
      )}
      style={{ width: APPLICATION_NODE_WIDTH, height: APPLICATION_NODE_HEIGHT }}
    >
      <Handle type="source" position={Position.Top} className="!bg-muted-foreground !size-2" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !size-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !size-2" />
      <Handle type="source" position={Position.Left} className="!bg-muted-foreground !size-2" />
      <Link href={data.href} className="flex items-center gap-2">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
          style={{ backgroundColor: data.avatarColor }}
        >
          {data.initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{data.name}</p>
          <p className="text-muted-foreground truncate text-xs">{data.version}</p>
        </div>
      </Link>
      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <StatusDot status={data.status} />
        <span>{data.status}</span>
      </div>
    </div>
  )
}

const nodeTypes = {
  server: ServerTopologyNode,
  application: ApplicationTopologyNode,
}

function clusterNodeIds(focusServerId: number, edges: Edge[]): { id: string }[] {
  const serverNodeId = `server-${focusServerId}`
  const ids = new Set<string>([serverNodeId])
  for (const edge of edges) {
    if (edge.target === serverNodeId) ids.add(edge.source)
  }
  return Array.from(ids, (id) => ({ id }))
}

function TopologyFitView({
  focusServerId,
  nodes,
  edges,
}: {
  focusServerId?: number | null
  nodes: Node<TopologyNodeData>[]
  edges: Edge[]
}) {
  const { fitView } = useReactFlow()

  React.useEffect(() => {
    if (nodes.length === 0) return

    const focused = focusServerId != null
    const fitNodes = focused ? clusterNodeIds(focusServerId, edges) : undefined

    const frameId = window.requestAnimationFrame(() => {
      void fitView({
        nodes: fitNodes,
        padding: focused ? 0.35 : 0.2,
        duration: 320,
        maxZoom: focused ? 1.25 : 1.5,
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [focusServerId, nodes, edges, fitView])

  return null
}

function ServerTopologyFlowCanvas({
  nodes,
  edges,
  focusServerId,
  className,
}: {
  nodes: Node<TopologyNodeData>[]
  edges: Edge[]
  focusServerId?: number | null
  className?: string
}) {
  const [flowNodes, setFlowNodes] = React.useState(nodes)
  const [flowEdges, setFlowEdges] = React.useState(edges)

  React.useEffect(() => {
    setFlowNodes(nodes)
    setFlowEdges(edges)
  }, [nodes, edges])

  if (nodes.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-[min(70vh,640px)] items-center justify-center rounded-xl border border-dashed text-sm",
          className,
        )}
      >
        No servers to display.
      </div>
    )
  }

  return (
    <div className={cn("h-[min(70vh,640px)] w-full overflow-hidden rounded-xl border bg-muted/20", className)}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={(changes: NodeChange<Node<TopologyNodeData>>[]) => {
          setFlowNodes((current) => applyNodeChanges(changes, current))
        }}
        onEdgesChange={(changes: EdgeChange[]) => {
          setFlowEdges((current) => applyEdgeChanges(changes, current))
        }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <TopologyFitView focusServerId={focusServerId} nodes={flowNodes} edges={flowEdges} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          pannable
          zoomable
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  )
}

export function ServerTopologyFlow({
  nodes,
  edges,
  focusServerId,
  className,
}: {
  nodes: Node<TopologyNodeData>[]
  edges: Edge[]
  focusServerId?: number | null
  className?: string
}) {
  return (
    <ReactFlowProvider>
      <ServerTopologyFlowCanvas
        nodes={nodes}
        edges={edges}
        focusServerId={focusServerId}
        className={className}
      />
    </ReactFlowProvider>
  )
}
