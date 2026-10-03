/**
 * SVG Office Navigation Graph & Pathing
 *
 * Implements deterministic waypoint graph navigation for the Ezity HQ SVG floorplan.
 * Prevents agents from cutting across walls, desks, and conference tables by routing
 * all inter-room journeys through designated door anchors and the Central Hallway (y=365).
 */

import type { OfficeZoneId } from '@/types/office-scene'

export interface SvgPoint {
  x: number
  y: number
}

/**
 * Key physical anchor nodes in the Ezity HQ SVG coordinate space (1200x720).
 */
export const SVG_NAV_NODES: Record<string, SvgPoint> = {
  // Desks & Home Stations
  desk_executive: { x: 185, y: 205 },
  desk_finance: { x: 185, y: 555 },
  desk_engineering: { x: 995, y: 555 },

  // Room Doorways / Thresholds (Clear entry points into hallway)
  door_executive: { x: 205, y: 325 },
  door_conference: { x: 600, y: 325 },
  door_inbox: { x: 995, y: 325 },
  door_finance: { x: 205, y: 405 },
  door_review: { x: 600, y: 405 },
  door_engineering: { x: 995, y: 405 },

  // Central Hallway Thoroughfare (y=365 centerline)
  hallway_west: { x: 205, y: 365 },
  hallway_center: { x: 600, y: 365 },
  hallway_east: { x: 995, y: 365 },

  // Target Operational Stations
  station_review: { x: 600, y: 555 },
  station_conference: { x: 600, y: 195 },
  station_inbox: { x: 995, y: 190 },
  station_lounge: { x: 1040, y: 275 },
}

/**
 * Maps logical OfficeZoneId or specific station ID to its primary nav node key.
 */
export function getNavNodeKeyForZone(
  zoneId: OfficeZoneId,
  agentDepartment?: string,
): string {
  switch (zoneId) {
    case 'meeting_room':
      return 'station_conference'
    case 'review_station':
      return 'station_review'
    case 'inbox_board':
      return 'station_inbox'
    case 'lounge_break':
      return 'station_lounge'
    case 'executive':
    case 'desk_executive':
      return 'desk_executive'
    case 'finance':
    case 'desk_finance':
      return 'desk_finance'
    case 'engineering':
    case 'desk_engineering':
      return 'desk_engineering'
    default:
      if (agentDepartment === 'executive') return 'desk_executive'
      if (agentDepartment === 'finance') return 'desk_finance'
      if (agentDepartment === 'engineering') return 'desk_engineering'
      return 'desk_engineering'
  }
}

/**
 * Computes a clean piecewise-linear path of waypoints between two nodes.
 * Routes through room doorways and the central hallway.
 */
export function calculateNavPath(fromKey: string, toKey: string): Array<SvgPoint> {
  const startPoint = SVG_NAV_NODES[fromKey] ?? SVG_NAV_NODES.desk_executive
  const endPoint = SVG_NAV_NODES[toKey] ?? SVG_NAV_NODES.desk_executive

  if (fromKey === toKey) {
    return [startPoint]
  }

  // Pre-configured structured waypoint paths
  const waypoints: Array<SvgPoint> = [startPoint]

  // Step 1: Exit origin room to its doorway & hallway waypoint
  const exitSteps = getRoomExitWaypoints(fromKey)
  for (const step of exitSteps) {
    waypoints.push(step)
  }

  // Step 2: Traverse hallway from exit hallway point to target entry hallway point
  const enterSteps = getRoomEntryWaypoints(toKey)
  const lastExitPoint = waypoints[waypoints.length - 1]
  const firstEntryPoint = enterSteps[0]

  if (lastExitPoint && firstEntryPoint && lastExitPoint.x !== firstEntryPoint.x) {
    // Traverse along central hallway line (y=365)
    // If crossing through center, add hallway_center for smooth straight passage
    const minX = Math.min(lastExitPoint.x, firstEntryPoint.x)
    const maxX = Math.max(lastExitPoint.x, firstEntryPoint.x)
    if (minX < 600 && maxX > 600) {
      waypoints.push(SVG_NAV_NODES.hallway_center)
    }
    waypoints.push(firstEntryPoint)
  }

  // Step 3: Enter destination room from hallway to destination node
  for (let i = 1; i < enterSteps.length; i++) {
    waypoints.push(enterSteps[i])
  }

  // Deduplicate consecutive points
  const cleanPath: Array<SvgPoint> = []
  for (const pt of waypoints) {
    const prev = cleanPath[cleanPath.length - 1]
    if (!prev || Math.abs(prev.x - pt.x) > 1 || Math.abs(prev.y - pt.y) > 1) {
      cleanPath.push(pt)
    }
  }

  return cleanPath
}

function getRoomExitWaypoints(nodeKey: string): Array<SvgPoint> {
  switch (nodeKey) {
    case 'desk_executive':
      return [SVG_NAV_NODES.door_executive, SVG_NAV_NODES.hallway_west]
    case 'desk_finance':
      return [SVG_NAV_NODES.door_finance, SVG_NAV_NODES.hallway_west]
    case 'desk_engineering':
      return [SVG_NAV_NODES.door_engineering, SVG_NAV_NODES.hallway_east]
    case 'station_review':
      return [SVG_NAV_NODES.door_review, SVG_NAV_NODES.hallway_center]
    case 'station_conference':
      return [SVG_NAV_NODES.door_conference, SVG_NAV_NODES.hallway_center]
    case 'station_inbox':
      return [SVG_NAV_NODES.door_inbox, SVG_NAV_NODES.hallway_east]
    case 'station_lounge':
      return [SVG_NAV_NODES.door_inbox, SVG_NAV_NODES.hallway_east]
    default:
      return [SVG_NAV_NODES.hallway_center]
  }
}

function getRoomEntryWaypoints(nodeKey: string): Array<SvgPoint> {
  switch (nodeKey) {
    case 'desk_executive':
      return [
        SVG_NAV_NODES.hallway_west,
        SVG_NAV_NODES.door_executive,
        SVG_NAV_NODES.desk_executive,
      ]
    case 'desk_finance':
      return [
        SVG_NAV_NODES.hallway_west,
        SVG_NAV_NODES.door_finance,
        SVG_NAV_NODES.desk_finance,
      ]
    case 'desk_engineering':
      return [
        SVG_NAV_NODES.hallway_east,
        SVG_NAV_NODES.door_engineering,
        SVG_NAV_NODES.desk_engineering,
      ]
    case 'station_review':
      return [
        SVG_NAV_NODES.hallway_center,
        SVG_NAV_NODES.door_review,
        SVG_NAV_NODES.station_review,
      ]
    case 'station_conference':
      return [
        SVG_NAV_NODES.hallway_center,
        SVG_NAV_NODES.door_conference,
        SVG_NAV_NODES.station_conference,
      ]
    case 'station_inbox':
      return [
        SVG_NAV_NODES.hallway_east,
        SVG_NAV_NODES.door_inbox,
        SVG_NAV_NODES.station_inbox,
      ]
    case 'station_lounge':
      return [
        SVG_NAV_NODES.hallway_east,
        SVG_NAV_NODES.door_inbox,
        SVG_NAV_NODES.station_lounge,
      ]
    default:
      return [SVG_NAV_NODES.hallway_center, SVG_NAV_NODES.desk_executive]
  }
}

/**
 * Calculates Euclidean distance between two points.
 */
export function getDistance(p1: SvgPoint, p2: SvgPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * Calculates total path length in SVG coordinate units.
 */
export function getTotalPathLength(path: Array<SvgPoint>): number {
  let length = 0
  for (let i = 0; i < path.length - 1; i++) {
    length += getDistance(path[i], path[i + 1])
  }
  return length
}

/**
 * Interpolates a point along a piecewise linear path given progress [0..1].
 */
export function interpolatePath(
  path: Array<SvgPoint>,
  progress: number,
): SvgPoint {
  if (path.length === 0) return { x: 0, y: 0 }
  if (path.length === 1 || progress <= 0) return path[0]
  if (progress >= 1) return path[path.length - 1]

  const totalLength = getTotalPathLength(path)
  if (totalLength <= 0) return path[0]

  const targetDist = progress * totalLength
  let accumulatedDist = 0

  for (let i = 0; i < path.length - 1; i++) {
    const segmentLen = getDistance(path[i], path[i + 1])
    if (accumulatedDist + segmentLen >= targetDist) {
      const segProgress = (targetDist - accumulatedDist) / segmentLen
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * segProgress,
        y: path[i].y + (path[i + 1].y - path[i].y) * segProgress,
      }
    }
    accumulatedDist += segmentLen
  }

  return path[path.length - 1]
}
