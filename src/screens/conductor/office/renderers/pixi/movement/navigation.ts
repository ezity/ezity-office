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
    center: { x: 2.5, y: 4 },
    doorway: { x: 4.5, y: 5.5 },
    rugAsset: 'rug_executive',
    bounds: { minX: 1, maxX: 4, minY: 2, maxY: 6 },
    primaryAnchor: { x: 2.5, y: 4 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  meeting_room: {
    zoneId: 'meeting_room',
    name: 'Conference Room',
    label: 'CONFERENCE',
    center: { x: 10.5, y: 2.5 },
    doorway: { x: 8.5, y: 4.5 },
    rugAsset: 'rug_meeting',
    bounds: { minX: 8, maxX: 13, minY: 1, maxY: 5 },
    primaryAnchor: { x: 10.5, y: 2.5 },
    facing: 'down-left',
    contextualPose: 'meeting',
  },
  finance: {
    zoneId: 'finance',
    name: 'Finance Wing',
    label: 'FINANCE',
    center: { x: 2.5, y: 10.5 },
    doorway: { x: 4.5, y: 9.5 },
    rugAsset: 'rug_finance',
    bounds: { minX: 1, maxX: 4, minY: 8, maxY: 13 },
    primaryAnchor: { x: 2.5, y: 10.5 },
    facing: 'down-right',
    contextualPose: 'sit',
  },
  engineering: {
    zoneId: 'engineering',
    name: 'Engineering Bay',
    label: 'ENGINEERING',
    center: { x: 12.5, y: 6.5 },
    doorway: { x: 10.5, y: 7.0 },
    rugAsset: 'rug_engineering',
    bounds: { minX: 11, maxX: 15, minY: 5, maxY: 9 },
    primaryAnchor: { x: 12.5, y: 6.5 },
    facing: 'down-left',
    contextualPose: 'sit',
  },
  review_station: {
    zoneId: 'review_station',
    name: 'Review Station',
    label: 'REVIEW',
    center: { x: 6.5, y: 9.0 },
    doorway: { x: 6.5, y: 8.0 },
    rugAsset: 'rug_executive', // uses executive rug accent
    bounds: { minX: 5.5, maxX: 8.0, minY: 8.0, maxY: 10.5 },
    primaryAnchor: { x: 6.5, y: 9.0 },
    facing: 'up-left',
    contextualPose: 'review',
  },
  inbox_board: {
    zoneId: 'inbox_board',
    name: 'Operations Board',
    label: 'OPERATIONS',
    center: { x: 9.0, y: 10.5 },
    doorway: { x: 8.0, y: 9.5 },
    rugAsset: 'rug_finance',
    bounds: { minX: 8.0, maxX: 10.5, minY: 9.5, maxY: 12.0 },
    primaryAnchor: { x: 9.0, y: 10.5 },
    facing: 'up-right',
    contextualPose: 'work',
  },
  lounge_break: {
    zoneId: 'lounge_break',
    name: 'Staff Lounge',
    label: '☕ LOUNGE',
    center: { x: 10.5, y: 14.5 },
    doorway: { x: 9.5, y: 12.5 },
    rugAsset: 'rug_lounge',
    bounds: { minX: 8.5, maxX: 13.0, minY: 12.5, maxY: 16.5 },
    primaryAnchor: { x: 10.5, y: 14.5 },
    facing: 'down-left',
    contextualPose: 'sit',
  },
}

// Key Central Hallway Waypoints
export const HALLWAY_WAYPOINTS = {
  centralHub: { x: 7.0, y: 7.0 },
  northWestJunction: { x: 5.0, y: 6.0 },
  northEastJunction: { x: 8.5, y: 5.0 },
  westJunction: { x: 5.0, y: 8.5 },
  eastJunction: { x: 9.5, y: 7.5 },
  southJunction: { x: 8.0, y: 9.0 },
  loungeCorridor: { x: 9.0, y: 12.0 },
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

  // If in the same zone, move directly
  if (fromZone === targetZone) {
    return [
      { x: startPos.x, y: startPos.y },
      { x: targetPoint.x, y: targetPoint.y },
    ]
  }

  // Multi-segment path through doorways and central hall
  const path: WorldPoint[] = [{ x: startPos.x, y: startPos.y }]

  // Step 1: Step out to doorway of origin room
  path.push({ x: fromDef.doorway.x, y: fromDef.doorway.y })

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
    case 'inbox_board':
      return HALLWAY_WAYPOINTS.southJunction
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
