export interface SavedDependencyEditorGroup {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface SavedDependencyEditorAppNode {
  applicationId: number
  x: number
  y: number
  parentGroupId?: string | null
}

export interface SavedDependencyEditorEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  pathOptions?: {
    borderRadius?: number
    offset?: number
  }
}

export interface SavedDependencyEditorViewport {
  x: number
  y: number
  zoom: number
}

export interface SavedDependencyEditorGraph {
  version: 3
  groups: SavedDependencyEditorGroup[]
  nodes: SavedDependencyEditorAppNode[]
  edges: SavedDependencyEditorEdge[]
  viewport?: SavedDependencyEditorViewport
}

const STORAGE_KEY = "tms-dependency-editor-graph"

function normalizeGraph(raw: unknown): SavedDependencyEditorGraph | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>

  if (value.version === 3 && Array.isArray(value.groups) && Array.isArray(value.nodes)) {
    return {
      version: 3,
      groups: value.groups as SavedDependencyEditorGroup[],
      nodes: value.nodes as SavedDependencyEditorAppNode[],
      edges: (value.edges as SavedDependencyEditorEdge[]) ?? [],
      viewport: value.viewport as SavedDependencyEditorViewport | undefined,
    }
  }

  if (Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    const legacyNodes = value.nodes as Array<{ applicationId: number; x: number; y: number }>
    const legacyEdges = value.edges as Array<{
      id: string
      sourceApplicationId: number
      targetApplicationId: number
      sourceHandle?: string | null
      targetHandle?: string | null
      type?: string
      pathOptions?: SavedDependencyEditorEdge["pathOptions"]
    }>

    return {
      version: 3,
      groups: [],
      nodes: legacyNodes.map((node) => ({
        applicationId: node.applicationId,
        x: node.x,
        y: node.y,
        parentGroupId: null,
      })),
      edges: legacyEdges.map((edge) => ({
        id: edge.id,
        source: `editor-app-${edge.sourceApplicationId}`,
        target: `editor-app-${edge.targetApplicationId}`,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        type: edge.type ?? "smoothstep",
        pathOptions: edge.pathOptions,
      })),
      viewport: value.viewport as SavedDependencyEditorViewport | undefined,
    }
  }

  return null
}

export function loadDependencyEditorGraph(): SavedDependencyEditorGraph | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeGraph(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveDependencyEditorGraph(graph: SavedDependencyEditorGraph): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(graph satisfies SavedDependencyEditorGraph))
}

export function clearDependencyEditorGraph(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
