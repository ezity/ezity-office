/**
 * Pixi Virtual Office Overlay Layer
 *
 * Renders in-canvas visual highlights (such as selected zone borders, attention pulses)
 * below the HTML DOM overlay layer.
 */

import { Container, Graphics, type Application } from 'pixi.js'
import type { OfficeZoneId } from '@/types/office-scene'
import {
  worldToScreen,
  ZONE_DEFINITIONS,
  TILE_WIDTH,
  TILE_HEIGHT,
  type CameraState,
} from '../movement/navigation'

export class OverlayLayer extends Container {
  private zoneHighlights = new Map<OfficeZoneId, Graphics>()

  constructor(private app: Application) {
    super()
  }

  public updateZoneHighlights(
    camera: CameraState,
    selectedZoneId?: OfficeZoneId,
    activeMissions = false,
  ): void {
    this.removeChildren()
    this.zoneHighlights.clear()

    if (!selectedZoneId && !activeMissions) return

    // Highlight selected zone
    if (selectedZoneId) {
      const def = ZONE_DEFINITIONS[selectedZoneId]
      if (def) {
        const g = this.createZoneHighlightGraphic(def, camera, 0x38bdf8)
        this.addChild(g)
        this.zoneHighlights.set(selectedZoneId, g)
      }
    }

    // Pulse meeting room when mission is active
    if (activeMissions && selectedZoneId !== 'meeting_room') {
      const meetingDef = ZONE_DEFINITIONS.meeting_room
      const g = this.createZoneHighlightGraphic(meetingDef, camera, 0x38bdf8, 0.25)
      this.addChild(g)
    }
  }

  private createZoneHighlightGraphic(
    def: (typeof ZONE_DEFINITIONS)[OfficeZoneId],
    camera: CameraState,
    color: number,
    alpha = 0.5,
  ): Graphics {
    const g = new Graphics()

    const pTop = worldToScreen(def.bounds.minX, def.bounds.minY, 0, camera)
    const pRight = worldToScreen(def.bounds.maxX, def.bounds.minY, 0, camera)
    const pBottom = worldToScreen(def.bounds.maxX, def.bounds.maxY, 0, camera)
    const pLeft = worldToScreen(def.bounds.minX, def.bounds.maxY, 0, camera)

    g.poly([pTop.x, pTop.y, pRight.x, pRight.y, pBottom.x, pBottom.y, pLeft.x, pLeft.y])
    g.stroke({ color, width: 2, alpha })
    g.fill({ color, alpha: alpha * 0.15 })

    return g
  }
}
