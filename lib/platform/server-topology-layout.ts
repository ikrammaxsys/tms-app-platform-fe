import type { Edge, Node } from "@xyflow/react"

import { avatarColor, initialOf, normalizeAppStatus } from "@/lib/platform/view"
import type { Application, AppStatus, Server } from "@/lib/platform/types"

export type ServerTopologyNodeData = {
  kind: "server"
  serverId: number
  domain: string
  ipAddress: string
  environment: string
  provider: string
  applicationCount: number
}

export type ApplicationTopologyNodeData = {
  kind: "application"
  applicationId: number
  name: string
  status: AppStatus
  version: string
  initial: string
  avatarColor: string
  href: string
}

export type TopologyNodeData = ServerTopologyNodeData | ApplicationTopologyNodeData

/** Must match `server-topology-flow.tsx` node dimensions. */
export const SERVER_NODE_WIDTH = 220
export const SERVER_NODE_HEIGHT = 156
export const APPLICATION_NODE_WIDTH = 176
export const APPLICATION_NODE_HEIGHT = 72
const NODE_GAP = 28
const CLUSTER_PADDING = 56

/** Minimum orbit radius so app nodes clear the server and each other on the ring. */
function orbitRadiusForApps(appCount: number): number {
  const clearServer = Math.max(
    SERVER_NODE_WIDTH / 2 + APPLICATION_NODE_WIDTH / 2 + NODE_GAP,
    SERVER_NODE_HEIGHT / 2 + APPLICATION_NODE_HEIGHT / 2 + NODE_GAP,
  )
  if (appCount <= 1) return clearServer
  const chord = APPLICATION_NODE_WIDTH + NODE_GAP
  const fromRingSpacing = chord / (2 * Math.sin(Math.PI / appCount))
  return Math.max(clearServer, fromRingSpacing)
}

function clusterSpan(radius: number): number {
  return (radius + APPLICATION_NODE_WIDTH / 2 + CLUSTER_PADDING) * 2
}

function serverClusterOrigin(
  index: number,
  total: number,
  clusterSpanPx: number,
): { x: number; y: number } {
  if (total <= 1) return { x: 400, y: 300 }
  const cols = Math.min(3, Math.ceil(Math.sqrt(total)))
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    x: col * clusterSpanPx + clusterSpanPx / 2,
    y: row * clusterSpanPx + clusterSpanPx / 2,
  }
}

function topologyEdgeForApp(app: Application): Pick<Edge, "animated" | "style"> {
  switch (app.status) {
    case "Down":
      return {
        animated: true,
        style: { stroke: "var(--destructive)", strokeWidth: 2 },
      }
    case "Degraded":
      return {
        animated: true,
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      }
    case "Operational":
      return {
        animated: true,
        style: { stroke: "#10b981", strokeWidth: 2 },
      }
    default:
      return {
        animated: false,
        style: { stroke: "var(--border)", strokeWidth: 2 },
      }
  }
}

function appsForServer(applications: Application[], serverId: number): Application[] {
  return applications
    .filter((a) => a.serverId === serverId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function topologyConnectionStyle(status: AppStatus): {
  stroke: string
  strokeWidth: number
  animated: boolean
} {
  const normalized = normalizeAppStatus(status)
  if (normalized === "Operational") {
    return { stroke: "#16a34a", strokeWidth: 2, animated: true }
  }
  if (normalized === "Degraded") {
    return { stroke: "#f59e0b", strokeWidth: 2, animated: true }
  }
  if (normalized === "Down") {
    return { stroke: "var(--destructive)", strokeWidth: 2, animated: true }
  }
  return { stroke: "var(--border)", strokeWidth: 2, animated: false }
}

/** Hub-and-spoke nodes and edges for one or more servers. */
export function buildServerTopology(
  servers: Server[],
  applications: Application[],
  options?: { serverIds?: number[] },
): { nodes: Node<TopologyNodeData>[]; edges: Edge[] } {
  const selected =
    options?.serverIds && options.serverIds.length > 0
      ? servers.filter((s) => options.serverIds!.includes(s.id))
      : servers

  const nodes: Node<TopologyNodeData>[] = []
  const edges: Edge[] = []

  const maxOrbitRadius = selected.reduce((max, server) => {
    const count = appsForServer(applications, server.id).length
    return Math.max(max, orbitRadiusForApps(count))
  }, orbitRadiusForApps(0))

  const clusterSpanPx = Math.max(520, clusterSpan(maxOrbitRadius))

  selected.forEach((server, serverIndex) => {
    const origin = serverClusterOrigin(serverIndex, selected.length, clusterSpanPx)
    const apps = appsForServer(applications, server.id)
    const orbitRadius = orbitRadiusForApps(apps.length)
    const serverNodeId = `server-${server.id}`

    nodes.push({
      id: serverNodeId,
      type: "server",
      position: {
        x: origin.x - SERVER_NODE_WIDTH / 2,
        y: origin.y - SERVER_NODE_HEIGHT / 2,
      },
      data: {
        kind: "server",
        serverId: server.id,
        domain: server.domain,
        ipAddress: server.ipAddress,
        environment: server.environment,
        provider: server.provider,
        applicationCount: apps.length,
      },
      draggable: true,
    })

    if (apps.length === 0) return

    apps.forEach((app, appIndex) => {
      const angle = (2 * Math.PI * appIndex) / apps.length - Math.PI / 2
      const cx = origin.x + orbitRadius * Math.cos(angle)
      const cy = origin.y + orbitRadius * Math.sin(angle)
      const appNodeId = `app-${app.id}`

      nodes.push({
        id: appNodeId,
        type: "application",
        position: {
          x: cx - APPLICATION_NODE_WIDTH / 2,
          y: cy - APPLICATION_NODE_HEIGHT / 2,
        },
        data: {
          kind: "application",
          applicationId: app.id,
          name: app.name,
          status: app.status,
          version: app.version,
          initial: initialOf(app.name),
          avatarColor: avatarColor(app.name),
          href: `/applications/${app.id}`,
        },
        draggable: true,
      })

      const connectionStyle = topologyConnectionStyle(app.status)

      edges.push({
        id: `edge-${app.id}-${server.id}`,
        source: appNodeId,
        target: serverNodeId,
        type: "smoothstep",
        animated: connectionStyle.animated,
        style: {
          stroke: connectionStyle.stroke,
          strokeWidth: connectionStyle.strokeWidth,
        },
        ...topologyEdgeForApp(app),
      })
    })
  })

  return { nodes, edges }
}
