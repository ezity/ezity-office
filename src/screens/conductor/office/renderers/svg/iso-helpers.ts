/**
 * Isometric Projection Helpers (Renderer-Only)
 *
 * Provides consistent pseudo-isometric coordinate transforms for the
 * SVG game-style office renderer. Uses a gentle 2:1 isometric ratio
 * (26.57° angle) which reads well as a "management sim" top-down view
 * while keeping text and interactive targets legible.
 *
 * These helpers are STRICTLY renderer concerns.
 * They must NEVER leak into OfficeSceneState or business logic.
 */

/** Isometric projection angle (2:1 pixel ratio) */
const ISO_ANGLE = Math.atan(0.5) // ~26.57°
const COS_A = Math.cos(ISO_ANGLE)
const SIN_A = Math.sin(ISO_ANGLE)

/**
 * Converts a logical grid (col, row) coordinate into SVG (x, y)
 * screen-space using pseudo-isometric projection.
 */
export function isoPoint(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * COS_A,
    y: (col + row) * SIN_A,
  }
}

/**
 * Generates an SVG polygon `points` string for a flat isometric
 * diamond/rhombus at the given position and size.
 *
 * @param cx - Center X in screen space
 * @param cy - Center Y in screen space
 * @param w  - Half-width along horizontal isometric axis
 * @param h  - Half-height along vertical isometric axis
 */
export function isoRect(cx: number, cy: number, w: number, h: number): string {
  return [
    `${cx},${cy - h}`,
    `${cx + w},${cy}`,
    `${cx},${cy + h}`,
    `${cx - w},${cy}`,
  ].join(' ')
}

/**
 * Generates SVG polygon `points` strings for an isometric box (3 visible faces).
 *
 * @param cx     - Center X of the top face
 * @param cy     - Center Y of the top face
 * @param w      - Half-width of top face
 * @param h      - Half-height of top face
 * @param depth  - Pixel depth of the box (how tall vertically)
 */
export function isoBox(
  cx: number,
  cy: number,
  w: number,
  h: number,
  depth: number,
): { top: string; front: string; side: string } {
  const top = isoRect(cx, cy, w, h)

  // Front face (bottom-left to bottom-right, extruded downward)
  const front = [
    `${cx - w},${cy}`,
    `${cx},${cy + h}`,
    `${cx},${cy + h + depth}`,
    `${cx - w},${cy + depth}`,
  ].join(' ')

  // Right side face (bottom-right to top-right, extruded downward)
  const side = [
    `${cx},${cy + h}`,
    `${cx + w},${cy}`,
    `${cx + w},${cy + depth}`,
    `${cx},${cy + h + depth}`,
  ].join(' ')

  return { top, front, side }
}

/**
 * Generates an isometric floor rug / carpet polygon at specified position.
 *
 * @param cx - Center X
 * @param cy - Center Y
 * @param w  - Half-width
 * @param h  - Half-height
 */
export function isoRug(cx: number, cy: number, w: number, h: number): string {
  return isoRect(cx, cy, w, h)
}

/**
 * Generates an isometric wall segment (a tall thin vertical plane).
 *
 * @param x1, y1 - Start point (screen space)
 * @param x2, y2 - End point (screen space)
 * @param wallHeight - Visual height of the wall
 */
export function isoWall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wallHeight: number,
): { face: string; top: string } {
  const face = [
    `${x1},${y1}`,
    `${x2},${y2}`,
    `${x2},${y2 - wallHeight}`,
    `${x1},${y1 - wallHeight}`,
  ].join(' ')

  const top = [
    `${x1},${y1 - wallHeight}`,
    `${x2},${y2 - wallHeight}`,
  ].join(' ')

  return { face, top }
}
