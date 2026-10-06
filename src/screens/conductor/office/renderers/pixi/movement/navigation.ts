/**
 * Pixi Virtual Office Navigation & Isometric Coordinate Engine
 *
 * Implements:
 * - 2.5D Isometric projection: worldToScreen and screenToWorld
 * - Organic connected floor plan for Ezity HQ
 * - Deterministic waypoint routing graph between operational zones
 */

import type { OfficeZoneId } from '@/types/office-scene'

// Tile Dimensions for 2:1 Isometric Projection
export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

export interface CameraState {
  x: number // Screen offset X
  y: number // Screen offset Y
  zoom: number
}

export const DEFAULT_CAMERA: CameraState = {
  x: 600,
  y: 110,
  zoom: 1.0,
}

export interface WorldPoint {
  x: number
  y: number
  z?: number
}

export interface ScreenPoint {
  x: number
  y: number
  zoom?: number
}

/**
 * Projects a 3D world coordinate (wx, wy, wz) into 2D screen coordinate (sx, sy).
 */
export function worldToScreen(
  wx: number,
  wy: number,
  wz = 0,
  camera: CameraState = DEFAULT_CAMERA,
): ScreenPoint {
  const isoX = (wx - wy) * (TILE_WIDTH / 2)
  const isoY = (wx + wy) * (TILE_HEIGHT / 2) - wz

  return {
    x: camera.x + isoX * camera.zoom,
    y: camera.y + isoY * camera.zoom,
  }
}

/**
 * Unprojects a 2D screen coordinate (sx, sy) into ground-plane world coordinate (wx, wy).
 */
export function screenToWorld(
  sx: number,
  sy: number,
  camera: CameraState = DEFAULT_CAMERA,
): WorldPoint {
  const normX = (sx - camera.x) / camera.zoom
  const normY = (sy - camera.y) / camera.zoom

  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2

  const wx = (normX / halfW + normY / halfH) / 2
  const wy = (normY / halfH - normX / halfW) / 2

  return { x: wx, y: wy, z: 0 }
}

export interface ZoneLayoutDefinition {
  zoneId: OfficeZoneId
  name: string
  label: string
  center: WorldPoint
  doorway: WorldPoint
  rugAsset: string
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  // Primary station / desk anchor for agents
  primaryAnchor: WorldPoint
  // Orientation / facing when stationed
  facing: 'down-left' | 'down-right' | 'up-left' | 'up-right'
  contextualPose: 'sit' | 'work' | 'meeting' | 'review' | 'idle'
}

/**
 * Coherent organic game-level floor plan:
 *
 *               Executive (2, 4)           Conference (10, 2)
 *                       \                     /
 *                  North-West Hall (5, 6)   North-East Hall (9, 5)
 *                             \             /
 *                              Central Hall (7, 7)
 *                             /       |       \
 *      Finance (2, 10)       /     Review      \     Engineering (12, 6)
 *            \              /       (7, 9)      \            /
 *         West Corridor (4, 9)                   East Corridor (10, 7)
 *                             \
 *                           Operations Board (9, 11)
 *                                  \
 *                              Staff Lounge (10, 15)
 */
export const ZONE_DEFINITIONS: Record<OfficeZoneId, ZoneLayoutDefinition> = {
  executive: {
    zoneId: 'executive',
    name: 'Executive Office',
    label: 'EXECUTIVE',
    center: { x: -9.8, y: 2.17 },
    doorway: { x: -4.0, y: 0.0 },
    rugAsset: 'rug_executive',
    bounds: { minX: -13, maxX: -7, minY: -1, maxY: 5 },
    primaryAnchor: { x: -10.39, y: 2.35 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  meeting_room: {
    zoneId: 'meeting_room',
    name: 'Conference Room',
    label: 'CONFERENCE',
    center: { x: -3.84, y: -6.09 },
    doorway: { x: -1.0, y: -3.0 },
    rugAsset: 'rug_meeting',
    bounds: { minX: -6.5, maxX: -1.5, minY: -9.5, maxY: -4.5 },
    primaryAnchor: { x: -4.56, y: -6.19 },
    facing: 'down-right',
    contextualPose: 'meeting',
  },
  finance: {
    zoneId: 'finance',
    name: 'Finance Wing',
    label: 'FINANCE',
    center: { x: -1.19, y: 9.69 },
    doorway: { x: 0.0, y: 4.0 },
    rugAsset: 'rug_finance',
    bounds: { minX: -3.5, maxX: 2.0, minY: 7.0, maxY: 11.5 },
    primaryAnchor: { x: -1.78, y: 9.53 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  engineering: {
    zoneId: 'engineering',
    name: 'Engineering Bay',
    label: 'ENGINEERING',
    center: { x: 12.7, y: -1.8 },
    doorway: { x: 6.0, y: 0.0 },
    rugAsset: 'rug_engineering',
    bounds: { minX: 10.0, maxX: 15.0, minY: -3.5, maxY: 1.5 },
    primaryAnchor: { x: 12.14, y: -1.45 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  review_station: {
    zoneId: 'review_station',
    name: 'Review Station',
    label: 'REVIEW',
    center: { x: 4.98, y: 8.83 },
    doorway: { x: 3.0, y: 3.0 },
    rugAsset: 'rug_review',
    bounds: { minX: 3.0, maxX: 7.5, minY: 4.5, maxY: 10.0 },
    primaryAnchor: { x: 4.09, y: 8.66 },
    facing: 'down-right',
    contextualPose: 'review',
  },
  inbox_board: {
    zoneId: 'inbox_board',
    name: 'Operations Board',
    label: 'OPERATIONS',
    center: { x: 3.2, y: -7.8 },
    doorway: { x: 1.0, y: -5.0 },
    rugAsset: 'board_operations',
    bounds: { minX: 1.5, maxX: 4.8, minY: -9.5, maxY: -6.5 },
    primaryAnchor: { x: 3.8, y: -8.8 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  lounge_break: {
    zoneId: 'lounge_break',
    name: 'Staff Lounge',
    label: '☕ LOUNGE',
    center: { x: 4.28, y: -2.03 },
    doorway: { x: 2.5, y: -1.0 },
    rugAsset: 'sofa_lounge',
    bounds: { minX: 2.0, maxX: 6.5, minY: -4.0, maxY: 0.0 },
    primaryAnchor: { x: 4.28, y: -2.03 },
    facing: 'down-left',
    contextualPose: 'sit',
  },
  desk_executive: {
    zoneId: 'desk_executive',
    name: 'Executive Office Desk',
    label: 'EXECUTIVE',
    center: { x: -9.8, y: 2.17 },
    doorway: { x: -4.0, y: 0.0 },
    rugAsset: 'rug_executive',
    bounds: { minX: -13, maxX: -7, minY: -1, maxY: 5 },
    primaryAnchor: { x: -10.39, y: 2.35 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  desk_finance: {
    zoneId: 'desk_finance',
    name: 'Finance Desk',
    label: 'FINANCE',
    center: { x: -1.19, y: 9.69 },
    doorway: { x: 0.0, y: 4.0 },
    rugAsset: 'rug_finance',
    bounds: { minX: -3.5, maxX: 2.0, minY: 7.0, maxY: 11.5 },
    primaryAnchor: { x: -1.78, y: 9.53 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  desk_engineering: {
    zoneId: 'desk_engineering',
    name: 'Engineering Tech Desk',
    label: 'ENGINEERING',
    center: { x: 12.7, y: -1.8 },
    doorway: { x: 6.0, y: 0.0 },
    rugAsset: 'rug_engineering',
    bounds: { minX: 10.0, maxX: 15.0, minY: -3.5, maxY: 1.5 },
    primaryAnchor: { x: 12.14, y: -1.45 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
}

// Key Central Hallway Waypoints
export const HALLWAY_WAYPOINTS = {
  centralHub: { x: 1.0, y: -0.62 },
  northWestJunction: { x: -4.0, y: 0.0 },
  northEastJunction: { x: 0.0, y: -4.0 },
  westJunction: { x: -1.0, y: 3.0 },
  eastJunction: { x: 5.0, y: 0.0 },
  southJunction: { x: 3.0, y: 3.0 },
  loungeCorridor: { x: 2.5, y: -1.5 },
}

/**
 * Calculates a collision-free waypoint path between two world positions and zones.
 */
export function calculateOfficeRoute(
  startPos: WorldPoint,
  fromZone: OfficeZoneId,
  targetZone: OfficeZoneId,
  destinationPos?: WorldPoint,
): WorldPoint[] {
  const targetDef = ZONE_DEFINITIONS[targetZone]
  const fromDef = ZONE_DEFINITIONS[fromZone]
  const targetPoint = destinationPos || targetDef.primaryAnchor

  // If already at destination anchor, no path needed
  if (Math.hypot(targetPoint.x - startPos.x, targetPoint.y - startPos.y) < 0.1) {
    return []
  }

  // If in the same zone, move directly
  if (fromZone === targetZone) {
    return deduplicateWaypoints([
      { x: startPos.x, y: startPos.y },
      { x: targetPoint.x, y: targetPoint.y },
    ])
  }

  // Multi-segment path through doorways and central hall
  const path: WorldPoint[] = [{ x: startPos.x, y: startPos.y }]

  // Step 1: Step out to doorway of origin room only if currently inside that room's bounds
  const isInsideOrigin =
    fromDef &&
    startPos.x >= fromDef.bounds.minX &&
    startPos.x <= fromDef.bounds.maxX &&
    startPos.y >= fromDef.bounds.minY &&
    startPos.y <= fromDef.bounds.maxY

  if (isInsideOrigin && fromDef.doorway) {
    path.push({ x: fromDef.doorway.x, y: fromDef.doorway.y })
  }

  // Step 2: Step into connecting corridor/junction
  const startJunction = getNearestJunction(fromZone)
  if (startJunction) {
    path.push(startJunction)
  }

  // Step 3: Pass through Central Hub if crossing sides
  const targetJunction = getNearestJunction(targetZone)
  if (startJunction !== targetJunction) {
    path.push(HALLWAY_WAYPOINTS.centralHub)
    if (targetJunction) {
      path.push(targetJunction)
    }
  }

  // Step 4: Step to doorway of destination room
  path.push({ x: targetDef.doorway.x, y: targetDef.doorway.y })

  // Step 5: Step to final destination anchor
  path.push({ x: targetPoint.x, y: targetPoint.y })

  // Remove redundant consecutive duplicate points
  return deduplicateWaypoints(path)
}

function getNearestJunction(zone: OfficeZoneId): WorldPoint {
  switch (zone) {
    case 'executive':
      return HALLWAY_WAYPOINTS.northWestJunction
    case 'meeting_room':
      return HALLWAY_WAYPOINTS.northEastJunction
    case 'finance':
      return HALLWAY_WAYPOINTS.westJunction
    case 'engineering':
      return HALLWAY_WAYPOINTS.eastJunction
    case 'review_station':
      return HALLWAY_WAYPOINTS.southJunction
    case 'inbox_board':
      return HALLWAY_WAYPOINTS.northEastJunction
    case 'lounge_break':
      return HALLWAY_WAYPOINTS.loungeCorridor
    default:
      return HALLWAY_WAYPOINTS.centralHub
  }
}

function deduplicateWaypoints(points: WorldPoint[]): WorldPoint[] {
  const result: WorldPoint[] = []
  for (let i = 0; i < points.length; i++) {
    const cur = points[i]
    const prev = result[result.length - 1]
    if (!prev || Math.hypot(cur.x - prev.x, cur.y - prev.y) > 0.15) {
      result.push(cur)
    }
  }
  return result
}
