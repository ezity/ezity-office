/**
 * Pixi Virtual Office Room Layer
 *
 * Renders the physical floor tiles, decorative zone rugs, architectural perimeter walls,
 * and room signage.
 */

import { Container, Sprite, Text, type Application } from 'pixi.js'
import { getOfficeTexture } from '../assets/asset-manifest'
import {
  worldToScreen,
  ZONE_DEFINITIONS,
  HALLWAY_WAYPOINTS,
  type CameraState,
} from '../movement/navigation'

export class RoomLayer extends Container {
  private floorContainer = new Container()
  private rugsContainer = new Container()
  private wallsContainer = new Container()
  private signsContainer = new Container()

  constructor(private app: Application) {
    super()
    this.addChild(this.floorContainer)
    this.addChild(this.rugsContainer)
    this.addChild(this.wallsContainer)
    this.addChild(this.signsContainer)
  }

  /**
   * Builds the static room architecture and floor plan.
   */
  public buildEnvironment(camera: CameraState): void {
    this.floorContainer.removeChildren()
    this.rugsContainer.removeChildren()
    this.wallsContainer.removeChildren()
    this.signsContainer.removeChildren()

    const floorTexture = getOfficeTexture('floor_tile', this.app)
    const wallTexture = getOfficeTexture('wall_straight', this.app)

    // Set of active floor tile coordinates (gx, gy) to pave
    const activeTiles = new Set<string>()

    const markTile = (x: number, y: number) => {
      activeTiles.add(`${Math.floor(x)},${Math.floor(y)}`)
    }

    // 1. Mark tiles for all room bounds
    for (const def of Object.values(ZONE_DEFINITIONS)) {
      for (let x = def.bounds.minX; x <= def.bounds.maxX; x++) {
        for (let y = def.bounds.minY; y <= def.bounds.maxY; y++) {
          markTile(x, y)
        }
      }
    }

    // 2. Mark connecting corridors and central hall
    const hallways = [
      HALLWAY_WAYPOINTS.centralHub,
      HALLWAY_WAYPOINTS.northWestJunction,
      HALLWAY_WAYPOINTS.northEastJunction,
      HALLWAY_WAYPOINTS.westJunction,
      HALLWAY_WAYPOINTS.eastJunction,
      HALLWAY_WAYPOINTS.southJunction,
      HALLWAY_WAYPOINTS.loungeCorridor,
    ]

    for (const hw of hallways) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          markTile(hw.x + dx, hw.y + dy)
        }
      }
    }

    // 3. Render floor tiles
    for (const coord of activeTiles) {
      const [gxStr, gyStr] = coord.split(',')
      const gx = Number.parseInt(gxStr, 10)
      const gy = Number.parseInt(gyStr, 10)

      const screenPos = worldToScreen(gx, gy, 0, camera)
      const tileSprite = new Sprite(floorTexture)
      tileSprite.anchor.set(0.5, 0.5)
      tileSprite.position.set(screenPos.x, screenPos.y)
      tileSprite.tint = (gx + gy) % 2 === 0 ? 0xffffff : 0xf4f0e4 // Subtle checkerboard variation
      this.floorContainer.addChild(tileSprite)
    }

    // 4. Render decorative rugs under each operational zone
    for (const def of Object.values(ZONE_DEFINITIONS)) {
      const rugTexture = getOfficeTexture(def.rugAsset, this.app)
      const rugSprite = new Sprite(rugTexture)
      rugSprite.anchor.set(0.5, 0.5)
      const screenPos = worldToScreen(def.center.x, def.center.y, 0, camera)
      rugSprite.position.set(screenPos.x, screenPos.y)
      this.rugsContainer.addChild(rugSprite)
    }

    // 5. Render perimeter walls (rear north walls for rooms)
    const wallSegments: Array<{ x: number; y: number }> = [
      // Executive Room North Wall
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      // Conference Room North Wall
      { x: 8, y: 1 },
      { x: 9, y: 1 },
      { x: 10, y: 1 },
      { x: 11, y: 1 },
      { x: 12, y: 1 },
      { x: 13, y: 1 },
      // Finance Wing Wall
      { x: 1, y: 8 },
      { x: 2, y: 8 },
      { x: 3, y: 8 },
      { x: 4, y: 8 },
      // Engineering Bay Wall
      { x: 11, y: 5 },
      { x: 12, y: 5 },
      { x: 13, y: 5 },
      { x: 14, y: 5 },
      { x: 15, y: 5 },
    ]

    for (const seg of wallSegments) {
      const screenPos = worldToScreen(seg.x, seg.y, 0, camera)
      const wallSprite = new Sprite(wallTexture)
      wallSprite.anchor.set(0.5, 0.75)
      wallSprite.position.set(screenPos.x, screenPos.y)
      this.wallsContainer.addChild(wallSprite)
    }

    // 6. Room Name Wall Plaques / Signs
    for (const def of Object.values(ZONE_DEFINITIONS)) {
      const screenPos = worldToScreen(def.bounds.minX + 0.5, def.bounds.minY + 0.2, 28, camera)
      const signText = new Text({
        text: def.label,
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fontWeight: 'bold',
          fill: 0x78532f,
          letterSpacing: 1,
        },
      })
      signText.anchor.set(0.5, 0.5)
      signText.position.set(screenPos.x, screenPos.y)
      this.signsContainer.addChild(signText)
    }
  }
}
