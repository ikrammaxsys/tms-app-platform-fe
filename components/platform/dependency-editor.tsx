"use client"

import * as React from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ConnectionMode,
  NodeResizer,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type Viewport,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { AlertTriangle, FolderPlus, GripVertical, Maximize2, Minimize2, RotateCcw, Save, Search } from "lucide-react"

import { StatusDot } from "@/components/platform/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  APPLICATION_NODE_HEIGHT,
  APPLICATION_NODE_WIDTH,
} from "@/lib/platform/server-topology-layout"
import {
  clearDependencyEditorGraph,
  loadDependencyEditorGraph,
  saveDependencyEditorGraph,
  type SavedDependencyEditorGraph,
  type SavedDependencyEditorViewport,
} from "@/lib/platform/dependency-editor-storage"
import {
  filterApplicationsByServer,
  getServerFilterOptions,
} from "@/lib/platform/dependency-server-filter"
import type { Application, AppStatus } from "@/lib/platform/types"
import { avatarColor, initialOf, normalizeAppStatus } from "@/lib/platform/view"
import { cn } from "@/lib/utils"

type DependencyImpactState = "none" | "down" | "impacted"

function getTransitiveDependents(
  rootIds: Iterable<number>,
  edges: Array<{ fromId: number; toId: number }>,
): Set<number> {
  const adjacency = new Map<number, number[]>()
  for (const edge of edges) {
    const list = adjacency.get(edge.toId) ?? []
    list.push(edge.fromId)
    adjacency.set(edge.toId, list)
  }

  const impacted = new Set<number>()
  const queue = [...rootIds]

  while (queue.length > 0) {
    const current = queue.shift()!
    const dependents = adjacency.get(current) ?? []
    for (const dep of dependents) {
      if (impacted.has(dep)) continue
      impacted.add(dep)
      queue.push(dep)
    }
  }

  return impacted
}

const DRAG_MIME = "application/tms-dependency-app-id"
const GROUP_PREFIX = "editor-group-"
const APP_PREFIX = "editor-app-"
const DEFAULT_GROUP_WIDTH = 360
const DEFAULT_GROUP_HEIGHT = 280

export type EditorGroupNodeData = {
  label: string
  memberCount: number
  impactState: DependencyImpactState
}

export type EditorNodeData = {
  applicationId: number
  name: string
  version: string
  status: AppStatus
  initial: string
  avatarColor: string
  environment: string
  impactState: DependencyImpactState
}

type EditorFlowNode = Node<EditorNodeData | EditorGroupNodeData>

function editorNodeId(applicationId: number): string {
  return `${APP_PREFIX}${applicationId}`
}

function isAppNode(node: EditorFlowNode): node is Node<EditorNodeData> {
  return node.type === "editorApplication"
}

function isGroupNode(node: EditorFlowNode): node is Node<EditorGroupNodeData> {
  return node.type === "editorGroup"
}

function parseApplicationId(nodeOrEdgeId: string): number {
  return Number(String(nodeOrEdgeId).replace(APP_PREFIX, ""))
}

function resolveEndpointIds(nodeId: string, nodes: EditorFlowNode[]): number[] {
  if (nodeId.startsWith(APP_PREFIX)) {
    const id = parseApplicationId(nodeId)
    return Number.isFinite(id) ? [id] : []
  }
  if (nodeId.startsWith(GROUP_PREFIX)) {
    return nodes
      .filter((node) => isAppNode(node) && node.parentId === nodeId)
      .map((node) => node.data.applicationId)
  }
  return []
}

function expandEdgesForImpact(
  nodes: EditorFlowNode[],
  edges: Edge[],
): Array<{ fromId: number; toId: number }> {
  const expanded: Array<{ fromId: number; toId: number }> = []
  for (const edge of edges) {
    const sources = resolveEndpointIds(String(edge.source), nodes)
    const targets = resolveEndpointIds(String(edge.target), nodes)
    for (const fromId of sources) {
      for (const toId of targets) {
        if (fromId !== toId) expanded.push({ fromId, toId })
      }
    }
  }
  return expanded
}

function computeImpactStates(
  nodes: EditorFlowNode[],
  edges: Edge[],
  appsById: Map<number, Application>,
): Map<number, DependencyImpactState> {
  const appNodes = nodes.filter(isAppNode)
  const downIds = appNodes
    .map((node) => node.data.applicationId)
    .filter((id) => normalizeAppStatus(appsById.get(id)?.status) === "Down")

  const impacted = getTransitiveDependents(downIds, expandEdgesForImpact(nodes, edges))
  const states = new Map<number, DependencyImpactState>()

  for (const id of downIds) states.set(id, "down")
  for (const id of impacted) {
    if (!states.has(id)) states.set(id, "impacted")
  }

  return states
}

function computeGroupImpactState(
  groupId: string,
  nodes: EditorFlowNode[],
  impactStates: Map<number, DependencyImpactState>,
): DependencyImpactState {
  const members = nodes.filter((node) => isAppNode(node) && node.parentId === groupId)
  if (members.some((node) => impactStates.get(node.data.applicationId) === "down")) return "down"
  if (members.some((node) => impactStates.get(node.data.applicationId) === "impacted")) {
    return "impacted"
  }
  return "none"
}

function sortNodesForFlow(nodes: EditorFlowNode[]): EditorFlowNode[] {
  const groups = nodes.filter(isGroupNode)
  const apps = nodes.filter(isAppNode)
  return [...groups, ...apps]
}

function relativePositionInGroup(
  absolute: { x: number; y: number },
  group: Node<EditorGroupNodeData>,
): { x: number; y: number } {
  return {
    x: absolute.x - group.position.x,
    y: absolute.y - group.position.y,
  }
}

function absolutePositionFromGroup(
  relative: { x: number; y: number },
  group: Node<EditorGroupNodeData>,
): { x: number; y: number } {
  return {
    x: relative.x + group.position.x,
    y: relative.y + group.position.y,
  }
}

function getGroupDimensions(group: Node<EditorGroupNodeData>): { width: number; height: number } {
  const width = Number(
    group.width ?? group.measured?.width ?? group.style?.width ?? DEFAULT_GROUP_WIDTH,
  )
  const height = Number(
    group.height ?? group.measured?.height ?? group.style?.height ?? DEFAULT_GROUP_HEIGHT,
  )
  return { width, height }
}

function findGroupAtPosition(
  position: { x: number; y: number },
  groups: Node<EditorGroupNodeData>[],
): Node<EditorGroupNodeData> | undefined {
  return groups
    .filter((group) => {
      const { width, height } = getGroupDimensions(group)
      return (
        position.x >= group.position.x &&
        position.x <= group.position.x + width &&
        position.y >= group.position.y &&
        position.y <= group.position.y + height
      )
    })
    .sort((a, b) => {
      const aDim = getGroupDimensions(a)
      const bDim = getGroupDimensions(b)
      return aDim.width * aDim.height - bDim.width * bDim.height
    })[0]
}

function findInnermostGroupForNode(
  node: Pick<Node, "id" | "position" | "width" | "height" | "measured">,
  groups: Node<EditorGroupNodeData>[],
  getIntersectingNodes: (
    node: Node | { id: string; position: { x: number; y: number }; width?: number; height?: number },
  ) => Node[],
): Node<EditorGroupNodeData> | undefined {
  const probe = {
    id: node.id,
    position: node.position,
    width: node.width ?? node.measured?.width ?? APPLICATION_NODE_WIDTH,
    height: node.height ?? node.measured?.height ?? APPLICATION_NODE_HEIGHT,
  }

  const intersecting = getIntersectingNodes(probe as Node)
    .filter((item) => item.id.startsWith(GROUP_PREFIX))
    .map((item) => groups.find((group) => group.id === item.id))
    .filter((group): group is Node<EditorGroupNodeData> => group != null)

  if (intersecting.length === 0) return undefined

  return intersecting.sort((a, b) => {
    const aDim = getGroupDimensions(a)
    const bDim = getGroupDimensions(b)
    return aDim.width * aDim.height - bDim.width * bDim.height
  })[0]
}

function edgeImpactStyle(
  sourceImpact: DependencyImpactState,
  targetImpact: DependencyImpactState,
): { stroke: string; strokeWidth: number; animated: boolean; strokeDasharray?: string } {
  if (sourceImpact === "down" || targetImpact === "down") {
    return { stroke: "var(--destructive)", strokeWidth: 2.5, animated: true }
  }
  if (sourceImpact === "impacted" || targetImpact === "impacted") {
    return { stroke: "#f59e0b", strokeWidth: 2, animated: true, strokeDasharray: "6 4" }
  }
  return { stroke: "var(--primary)", strokeWidth: 2, animated: true }
}

function getNodeImpact(
  nodeId: string,
  nodes: EditorFlowNode[],
  impactStates: Map<number, DependencyImpactState>,
): DependencyImpactState {
  if (nodeId.startsWith(GROUP_PREFIX)) {
    return computeGroupImpactState(nodeId, nodes, impactStates)
  }
  return impactStates.get(parseApplicationId(nodeId)) ?? "none"
}

function EditorApplicationNode({ data }: NodeProps<Node<EditorNodeData>>) {
  const handleClass =
    "!bg-primary !border-2 !border-background !size-3 !z-10 hover:!scale-125 transition-transform"

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 px-3 py-2.5 shadow-sm transition-colors",
        data.impactState === "down" && "border-destructive bg-destructive/5",
        data.impactState === "impacted" && "border-amber-500 bg-amber-500/5",
        data.impactState === "none" && "border-border",
      )}
      style={{ width: APPLICATION_NODE_WIDTH, height: APPLICATION_NODE_HEIGHT }}
    >
      {(
        [
          ["left", Position.Left],
          ["top", Position.Top],
          ["right", Position.Right],
          ["bottom", Position.Bottom],
        ] as const
      ).flatMap(([id, position]) => [
        <Handle
          key={`${id}-target`}
          id={`${id}-target`}
          type="target"
          position={position}
          className={handleClass}
        />,
        <Handle
          key={`${id}-source`}
          id={`${id}-source`}
          type="source"
          position={position}
          className={handleClass}
        />,
      ])}
      <div className="flex items-center gap-2">
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
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <StatusDot status={data.status} />
          <span>{data.status}</span>
        </div>
        {data.impactState === "impacted" ? (
          <span className="flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3" />
            Impacted
          </span>
        ) : (
          <span className="text-muted-foreground truncate">{data.environment}</span>
        )}
      </div>
    </div>
  )
}

function EditorGroupNode({
  data,
  selected,
}: NodeProps<Node<EditorGroupNodeData>>) {
  const handleClass =
    "!bg-primary !border-2 !border-background !size-3.5 !z-10 hover:!scale-125 transition-transform"

  return (
    <>
      <NodeResizer
        minWidth={240}
        minHeight={180}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!size-2.5 !bg-primary !border-background"
      />
      <div
        className={cn(
          "flex h-full w-full flex-col rounded-xl border-2 border-dashed p-3",
          data.impactState === "down" && "border-destructive bg-destructive/5",
          data.impactState === "impacted" && "border-amber-500 bg-amber-500/5",
          data.impactState === "none" && "border-primary/50 bg-primary/5",
        )}
      >
        {(
          [
            ["left", Position.Left],
            ["top", Position.Top],
            ["right", Position.Right],
            ["bottom", Position.Bottom],
          ] as const
        ).flatMap(([id, position]) => [
          <Handle
            key={`${id}-target`}
            id={`${id}-target`}
            type="target"
            position={position}
            className={handleClass}
          />,
          <Handle
            key={`${id}-source`}
            id={`${id}-source`}
            type="source"
            position={position}
            className={handleClass}
          />,
        ])}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{data.label}</p>
            <p className="text-muted-foreground text-xs">
              {data.memberCount} app{data.memberCount === 1 ? "" : "s"} · connect groups with one arrow
            </p>
          </div>
          {data.impactState === "impacted" ? (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              Impacted
            </span>
          ) : null}
        </div>
      </div>
    </>
  )
}

const nodeTypes = {
  editorApplication: EditorApplicationNode,
  editorGroup: EditorGroupNode,
}

function appToNodeData(
  app: Application,
  impactState: DependencyImpactState = "none",
): EditorNodeData {
  return {
    applicationId: app.id,
    name: app.name,
    version: app.version,
    status: normalizeAppStatus(app.status),
    initial: initialOf(app.name),
    avatarColor: avatarColor(app.name),
    environment: String(app.serverEnvironment || "Live"),
    impactState,
  }
}

function buildFlowFromSaved(
  saved: SavedDependencyEditorGraph,
  appsById: Map<number, Application>,
): { nodes: EditorFlowNode[]; edges: Edge[]; viewport?: SavedDependencyEditorViewport } {
  const nodes: EditorFlowNode[] = []
  const edges: Edge[] = []

  for (const group of saved.groups) {
    nodes.push({
      id: group.id,
      type: "editorGroup",
      position: { x: group.x, y: group.y },
      width: group.width,
      height: group.height,
      style: { width: group.width, height: group.height },
      data: { label: group.label, memberCount: 0, impactState: "none" },
      zIndex: -1,
      draggable: true,
      selectable: true,
    })
  }

  for (const item of saved.nodes) {
    const app = appsById.get(item.applicationId)
    if (!app) continue
    nodes.push({
      id: editorNodeId(item.applicationId),
      type: "editorApplication",
      position: { x: item.x, y: item.y },
      width: APPLICATION_NODE_WIDTH,
      height: APPLICATION_NODE_HEIGHT,
      parentId: item.parentGroupId ?? undefined,
      extent: item.parentGroupId ? "parent" : undefined,
      data: appToNodeData(app),
    })
  }

  for (const item of saved.edges) {
    edges.push({
      id: item.id,
      source: item.source,
      target: item.target,
      sourceHandle: item.sourceHandle ?? undefined,
      targetHandle: item.targetHandle ?? undefined,
      type: item.type ?? "smoothstep",
      pathOptions: item.pathOptions,
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed", color: "var(--primary)", width: 18, height: 18 },
    })
  }

  return { nodes: sortNodesForFlow(nodes), edges, viewport: saved.viewport }
}

function serializeGraph(
  nodes: EditorFlowNode[],
  edges: Edge[],
  viewport?: Viewport,
): SavedDependencyEditorGraph {
  const groups: SavedDependencyEditorGraph["groups"] = []
  const appNodes: SavedDependencyEditorGraph["nodes"] = []

  for (const node of nodes) {
    if (isGroupNode(node)) {
      const { width, height } = getGroupDimensions(node)
      groups.push({
        id: node.id,
        label: node.data.label,
        x: node.position.x,
        y: node.position.y,
        width,
        height,
      })
      continue
    }
    if (isAppNode(node)) {
      appNodes.push({
        applicationId: node.data.applicationId,
        x: node.position.x,
        y: node.position.y,
        parentGroupId: node.parentId ?? null,
      })
    }
  }

  return {
    version: 3,
    groups,
    nodes: appNodes,
    edges: edges.map((edge) => ({
      id: edge.id,
      source: String(edge.source),
      target: String(edge.target),
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      type: edge.type ?? "smoothstep",
      pathOptions:
        edge.pathOptions &&
        typeof edge.pathOptions === "object" &&
        !Array.isArray(edge.pathOptions)
          ? {
              borderRadius:
                "borderRadius" in edge.pathOptions
                  ? Number(edge.pathOptions.borderRadius)
                  : undefined,
              offset:
                "offset" in edge.pathOptions ? Number(edge.pathOptions.offset) : undefined,
            }
          : undefined,
    })),
    viewport: viewport
      ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
      : undefined,
  }
}

function RestoreViewport({
  viewport,
  nodeCount,
}: {
  viewport?: SavedDependencyEditorViewport
  nodeCount: number
}) {
  const { setViewport, fitView } = useReactFlow()
  const restoredRef = React.useRef(false)

  React.useEffect(() => {
    if (restoredRef.current || nodeCount === 0) return
    restoredRef.current = true

    const frameId = window.requestAnimationFrame(() => {
      if (viewport) {
        void setViewport(viewport, { duration: 0 })
      } else {
        void fitView({ padding: 0.2, duration: 0 })
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [viewport, nodeCount, setViewport, fitView])

  return null
}

function DependencyEditorCanvas({
  applications,
  query,
  serverFilter,
  isFullscreen,
  onToggleFullscreen,
}: {
  applications: Application[]
  query: string
  serverFilter: string
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const appsById = React.useMemo(
    () => new Map(applications.map((app) => [app.id, app])),
    [applications],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<EditorFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [groupCounter, setGroupCounter] = React.useState(1)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)
  const [savedViewport, setSavedViewport] = React.useState<SavedDependencyEditorViewport | undefined>()
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, getViewport, getIntersectingNodes } = useReactFlow()

  const persistGraph = React.useCallback(
    (nextNodes: EditorFlowNode[], nextEdges: Edge[]) => {
      saveDependencyEditorGraph(serializeGraph(nextNodes, nextEdges, getViewport()))
      setSavedAt(new Date().toLocaleTimeString())
    },
    [getViewport],
  )

  const handleNodesChange = React.useCallback(
    (changes: NodeChange<EditorFlowNode>[]) => {
      const removedGroupIds = changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id)
        .filter((id) => id.startsWith(GROUP_PREFIX))

      if (removedGroupIds.length === 0) {
        onNodesChange(changes)
        return
      }

      setNodes((current) => {
        let next = applyNodeChanges(changes, current)
        for (const groupId of removedGroupIds) {
          const group = current.find((node) => node.id === groupId)
          if (!group || !isGroupNode(group)) continue
          next = next.map((node) => {
            if (!isAppNode(node) || node.parentId !== groupId) return node
            return {
              ...node,
              parentId: undefined,
              extent: undefined,
              position: absolutePositionFromGroup(node.position, group),
            }
          })
        }
        return sortNodesForFlow(next)
      })
    },
    [onNodesChange, setNodes],
  )

  React.useEffect(() => {
    if (hydrated || appsById.size === 0) return
    const saved = loadDependencyEditorGraph()
    if (saved) {
      const flow = buildFlowFromSaved(saved, appsById)
      setNodes(flow.nodes)
      setEdges(flow.edges)
      setSavedViewport(flow.viewport)
    }
    setHydrated(true)
  }, [appsById, hydrated, setNodes, setEdges])

  React.useEffect(() => {
    if (!hydrated) return
    persistGraph(nodes, edges)
  }, [nodes, edges, hydrated, persistGraph])

  const onMoveEnd = React.useCallback(() => {
    if (!hydrated) return
    persistGraph(nodes, edges)
  }, [hydrated, nodes, edges, persistGraph])

  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
            markerEnd: {
              type: "arrowclosed",
              color: "var(--primary)",
              width: 18,
              height: 18,
            },
          },
          current,
        ),
      )
    },
    [setEdges],
  )

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData(DRAG_MIME)
      const appId = Number(raw)
      if (!Number.isFinite(appId)) return

      const app = appsById.get(appId)
      if (!app) return

      const nodeId = editorNodeId(appId)
      if (nodes.some((node) => node.id === nodeId)) return

      const absolutePosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const groups = nodes.filter(isGroupNode)
      let targetGroup =
        findGroupAtPosition(absolutePosition, groups) ??
        findInnermostGroupForNode(
          {
            id: nodeId,
            position: absolutePosition,
            width: APPLICATION_NODE_WIDTH,
            height: APPLICATION_NODE_HEIGHT,
          },
          groups,
          getIntersectingNodes,
        )

      const newNode: EditorFlowNode = {
        id: nodeId,
        type: "editorApplication",
        position: targetGroup
          ? relativePositionInGroup(absolutePosition, targetGroup)
          : absolutePosition,
        width: APPLICATION_NODE_WIDTH,
        height: APPLICATION_NODE_HEIGHT,
        parentId: targetGroup?.id,
        extent: targetGroup ? "parent" : undefined,
        data: appToNodeData(app),
      }

      setNodes((current) => sortNodesForFlow([...current, newNode]))
    },
    [appsById, nodes, screenToFlowPosition, getIntersectingNodes, setNodes],
  )

  const onNodeDragStop = React.useCallback(
    (_event: React.MouseEvent, draggedNode: EditorFlowNode) => {
      if (!isAppNode(draggedNode)) return

      setNodes((current) => {
        const groups = current.filter(isGroupNode)
        const latestNode = current.find((node) => node.id === draggedNode.id) ?? draggedNode
        const absolutePosition = latestNode.parentId
          ? (() => {
              const parent = groups.find((group) => group.id === latestNode.parentId)
              return parent && isGroupNode(parent)
                ? absolutePositionFromGroup(latestNode.position, parent)
                : latestNode.position
            })()
          : latestNode.position

        const absoluteProbe: EditorFlowNode = {
          ...latestNode,
          parentId: undefined,
          extent: undefined,
          position: absolutePosition,
        }

        const targetGroup = findInnermostGroupForNode(
          absoluteProbe,
          groups,
          getIntersectingNodes,
        )

        return sortNodesForFlow(
          current.map((node) => {
            if (node.id !== draggedNode.id || !isAppNode(node)) return node

            if (targetGroup) {
              return {
                ...node,
                parentId: targetGroup.id,
                extent: "parent" as const,
                position: relativePositionInGroup(absolutePosition, targetGroup),
                width: APPLICATION_NODE_WIDTH,
                height: APPLICATION_NODE_HEIGHT,
              }
            }

            return {
              ...node,
              parentId: undefined,
              extent: undefined,
              position: absolutePosition,
              width: APPLICATION_NODE_WIDTH,
              height: APPLICATION_NODE_HEIGHT,
            }
          }),
        )
      })
    },
    [getIntersectingNodes, setNodes],
  )

  const addGroup = React.useCallback(() => {
    const id = `${GROUP_PREFIX}${crypto.randomUUID()}`
    setGroupCounter((count) => count + 1)
    setNodes((current) =>
      sortNodesForFlow([
        ...current,
        {
          id,
          type: "editorGroup",
          position: { x: 100 + groupCounter * 32, y: 100 + groupCounter * 32 },
          style: { width: DEFAULT_GROUP_WIDTH, height: DEFAULT_GROUP_HEIGHT },
          data: {
            label: `Group ${groupCounter}`,
            memberCount: 0,
            impactState: "none" as const,
          },
          zIndex: -1,
          draggable: true,
          selectable: true,
        },
      ]),
    )
  }, [groupCounter, setNodes])

  const onNodeDoubleClick = React.useCallback(
    (_event: React.MouseEvent, node: EditorFlowNode) => {
      if (!isGroupNode(node)) return
      const label = window.prompt("Group name", node.data.label)
      if (!label?.trim()) return
      setNodes((current) =>
        current.map((item) =>
          item.id === node.id && isGroupNode(item)
            ? { ...item, data: { ...item.data, label: label.trim() } }
            : item,
        ),
      )
    },
    [setNodes],
  )

  const clearCanvas = React.useCallback(() => {
    setNodes([])
    setEdges([])
    clearDependencyEditorGraph()
    setSavedAt(null)
  }, [setNodes, setEdges])

  const canvasAppIds = React.useMemo(
    () => new Set(nodes.filter(isAppNode).map((n) => n.data.applicationId)),
    [nodes],
  )

  const scopedApplications = React.useMemo(
    () => filterApplicationsByServer(applications, serverFilter),
    [applications, serverFilter],
  )

  const visibleAppIds = React.useMemo(
    () => new Set(scopedApplications.map((app) => app.id)),
    [scopedApplications],
  )

  const paletteApps = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return scopedApplications
      .filter((app) => {
        if (!q) return true
        return (
          app.name.toLowerCase().includes(q) ||
          app.serverDomain.toLowerCase().includes(q) ||
          String(app.serverEnvironment).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [scopedApplications, query])

  const visibleNodes = React.useMemo(() => {
    const appNodes = nodes
      .filter(isAppNode)
      .filter((node) => visibleAppIds.has(node.data.applicationId))

    const groupNodes = nodes.filter(isGroupNode).filter((group) => {
      if (serverFilter === "all") return true
      return appNodes.some((app) => app.parentId === group.id)
    })

    return sortNodesForFlow([...groupNodes, ...appNodes])
  }, [nodes, visibleAppIds, serverFilter])

  const visibleNodeIds = React.useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  )

  const visibleEdges = React.useMemo(
    () =>
      edges.filter(
        (edge) =>
          visibleNodeIds.has(String(edge.source)) && visibleNodeIds.has(String(edge.target)),
      ),
    [edges, visibleNodeIds],
  )

  const impactStates = React.useMemo(
    () => computeImpactStates(nodes, edges, appsById),
    [nodes, edges, appsById],
  )

  const displayNodes = React.useMemo(
    () =>
      visibleNodes.map((node) => {
        if (isGroupNode(node)) {
          const memberCount = nodes.filter(
            (item) => isAppNode(item) && item.parentId === node.id,
          ).length
          return {
            ...node,
            data: {
              ...node.data,
              memberCount,
              impactState: computeGroupImpactState(node.id, nodes, impactStates),
            },
          }
        }

        const app = appsById.get(node.data.applicationId)
        return {
          ...node,
          data: {
            ...node.data,
            status: app ? normalizeAppStatus(app.status) : node.data.status,
            impactState: impactStates.get(node.data.applicationId) ?? "none",
          },
        }
      }),
    [visibleNodes, nodes, appsById, impactStates],
  )

  const displayEdges = React.useMemo(
    () =>
      visibleEdges.map((edge) => {
        const sourceImpact = getNodeImpact(String(edge.source), nodes, impactStates)
        const targetImpact = getNodeImpact(String(edge.target), nodes, impactStates)
        const style = edgeImpactStyle(sourceImpact, targetImpact)

        return {
          ...edge,
          type: edge.type ?? "smoothstep",
          pathOptions: edge.pathOptions,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          animated: style.animated,
          style: {
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDasharray: style.strokeDasharray,
          },
          markerEnd: {
            type: "arrowclosed" as const,
            color: style.stroke,
            width: 18,
            height: 18,
          },
        }
      }),
    [visibleEdges, impactStates],
  )

  return (
    <div
      className={cn(
        "grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]",
        isFullscreen ? "h-full min-h-0" : "min-h-[calc(100vh-12rem)]",
      )}
    >
      <aside className="bg-card flex min-h-0 flex-col rounded-xl border">
        <div className="space-y-1 border-b p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold">Applications</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Drag apps into groups, then connect one arrow between groups. Double-click a group to
            rename. Drag apps into/out of groups to reorganize.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <ul className="space-y-2">
            {paletteApps.map((app) => {
              const onCanvas = canvasAppIds.has(app.id)
              return (
                <li key={app.id}>
                  <div
                    draggable={!onCanvas}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_MIME, String(app.id))
                      event.dataTransfer.effectAllowed = "move"
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                      onCanvas
                        ? "bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
                        : "bg-background hover:bg-muted/40 cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <GripVertical className="text-muted-foreground size-4 shrink-0" />
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[0.65rem] font-bold text-white"
                      style={{ backgroundColor: avatarColor(app.name) }}
                    >
                      {initialOf(app.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{app.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {app.serverDomain} · {app.serverEnvironment}
                      </p>
                    </div>
                    {onCanvas ? (
                      <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                        On canvas
                      </Badge>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <div
        ref={reactFlowWrapper}
        className={cn(
          "bg-muted/20 relative min-h-0 overflow-hidden rounded-xl border",
          isFullscreen ? "h-full" : "min-h-[560px]",
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onMoveEnd={onMoveEnd}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={["Backspace", "Delete"]}
          minZoom={0.25}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
        >
          <RestoreViewport viewport={savedViewport} nodeCount={displayNodes.length} />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-card !border-border" />
          <Panel position="top-left" className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addGroup}>
              <FolderPlus className="size-3.5" />
              Add group
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
              <RotateCcw className="size-3.5" />
              Clear
            </Button>
            {savedAt ? (
              <Badge variant="secondary" className="gap-1">
                <Save className="size-3" />
                Saved {savedAt}
              </Badge>
            ) : null}
          </Panel>
          {displayNodes.length === 0 ? (
            <Panel
              position="top-center"
              className="text-muted-foreground pointer-events-none mt-24 rounded-lg border border-dashed bg-card/80 px-6 py-4 text-sm"
            >
              Drop applications here to start building your dependency map
            </Panel>
          ) : null}
        </ReactFlow>
      </div>
    </div>
  )
}

export function DependencyEditor({ applications }: { applications: Application[] }) {
  const [query, setQuery] = React.useState("")
  const [serverFilter, setServerFilter] = React.useState("all")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const shellRef = React.useRef<HTMLDivElement>(null)

  const serverOptions = React.useMemo(
    () => getServerFilterOptions(applications),
    [applications],
  )

  const scopedApplications = React.useMemo(
    () => filterApplicationsByServer(applications, serverFilter),
    [applications, serverFilter],
  )

  const toggleFullscreen = React.useCallback(() => {
    setIsFullscreen((current) => !current)
  }, [])

  React.useEffect(() => {
    if (!isFullscreen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false)
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isFullscreen])

  const filteredCount = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scopedApplications.length
    return scopedApplications.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.serverDomain.toLowerCase().includes(q) ||
        String(app.serverEnvironment).toLowerCase().includes(q),
    ).length
  }, [scopedApplications, query])

  const serverFilterControl = (
    <Select value={serverFilter} onValueChange={setServerFilter}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="All servers" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All servers</SelectItem>
        {serverOptions.map((server) => (
          <SelectItem key={server.id} value={String(server.id)}>
            {server.domain}
            {server.environment ? ` · ${server.environment}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-col gap-4">
      {!isFullscreen ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search applications…"
              className="pl-8"
            />
          </div>
          <Badge variant="secondary">{filteredCount} apps</Badge>
          {serverFilterControl}
          <Button type="button" variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="size-3.5" />
            Fullscreen
          </Button>
          <p className="text-muted-foreground text-xs">
            Select a node or edge and press Delete to remove · Auto-saved to browser
          </p>
        </div>
      ) : null}

      <div
        ref={shellRef}
        className={cn(
          "bg-background flex flex-col",
          isFullscreen && "fixed inset-0 z-50 h-dvh w-dvw p-4",
        )}
      >
        {isFullscreen ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applications…"
                className="pl-8"
              />
            </div>
            <Badge variant="secondary">{filteredCount} apps</Badge>
            {serverFilterControl}
            <p className="text-muted-foreground text-xs">Press Esc to exit fullscreen</p>
          </div>
        ) : null}

        <ReactFlowProvider>
          <DependencyEditorCanvas
            applications={applications}
            query={query}
            serverFilter={serverFilter}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
