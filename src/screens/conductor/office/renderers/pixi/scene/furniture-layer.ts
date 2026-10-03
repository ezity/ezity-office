/**
 * Pixi Virtual Office Furniture & Interactive Zones Layer
 *
 * Provides illustrated desk sprites, interactive hitboxes, hover highlights,
 * and click handlers for operational stations. Seamlessly integrated into
 * 2.5D depth sorting with seated and walking agents.
 */

import { Container, Graphics, Sprite, type Application } from 'pixi.js'
import {
  worldToScreen,
  ZONE_DEFINITIONS,
  type CameraState,
  type WorldPoint,
} from '../movement/navigation'
import { getOfficeTexture } from '../assets/asset-manifest'

export interface FurnitureClickHandlers {
  onWorkItemClick?: (workItemId: string) => void
  onApprovalClick?: (approvalId?: string) => void
  onMissionClick?: () => void
}

interface InteractiveZoneDef {
  id: string
  name: string
  worldPos: WorldPoint
  radiusX: number
  radiusY: number
  color: number
  deskAsset?: string
  onClickType?: 'inbox' | 'approval' | 'mission'
}

export class FurnitureLayer extends Container {
  private items = new Map<string, Container>()

  constructor(
    private app: Application,
    private handlers: FurnitureClickHandlers,
    private parentEntitiesContainer?: Container,
  ) {
    super()
    this.sortableChildren = true
  }

  public buildFurniture(camera: CameraState): void {
    // Clear previously registered items
    const host = this.parentEntitiesContainer || this
    for (const item of this.items.values()) {
      host.removeChild(item)
      item.destroy({ children: true })
    }
    this.items.clear()
    this.removeChildren()

    const interactiveZones: InteractiveZoneDef[] = [
      // 1. Operations Board (Top-Right Room)
      {
        id: 'ops_board',
        name: 'Operations Inbox Board',
        worldPos: ZONE_DEFINITIONS.inbox_board.primaryAnchor,
        radiusX: 42,
        radiusY: 22,
        color: 0x38bdf8,
        onClickType: 'inbox',
      },
      // 2. Review Station Counter (Bottom-Center Station)
      {
        id: 'rev_desk',
        name: 'Approval & Verification Desk',
        worldPos: { x: 5.38, y: 6.88 },
        deskAsset: 'desk_review',
        radiusX: 42,
        radiusY: 22,
        color: 0xf59e0b,
        onClickType: 'approval',
      },
      // 3. Strategic Conference Table (Top-Center Glass Room)
      {
        id: 'conf_table',
        name: 'Strategic Conference Table',
        worldPos: { x: -4.0, y: -6.88 },
        deskAsset: 'table_meeting',
        radiusX: 56,
        radiusY: 28,
        color: 0x60a5fa,
        onClickType: 'mission',
      },
      // 4. Executive Desk (Top-Left Suite)
      {
        id: 'exec_desk',
        name: 'Executive Orchestrator Desk',
        worldPos: { x: -9.94, y: 2.19 },
        deskAsset: 'desk_executive',
        radiusX: 52,
        radiusY: 26,
        color: 0x818cf8,
      },
      // 5. Finance Desk (Bottom-Left Wing)
      {
        id: 'fin_desk',
        name: 'Financial Ledger Station',
        worldPos: { x: -0.72, y: 9.22 },
        deskAsset: 'desk_finance',
        radiusX: 54,
        radiusY: 28,
        color: 0x10b981,
      },
      // 6. Engineering Workstation (Bottom-Right Bay)
      {
        id: 'eng_desk',
        name: 'Engineering Bay Workstation',
        worldPos: { x: 12.56, y: -0.94 },
        deskAsset: 'desk_engineering',
        radiusX: 50,
        radiusY: 26,
        color: 0x0ea5e9,
      },
      // 7. Staff Lounge (Center-Right Area)
      {
        id: 'lounge_sofa',
        name: 'Staff Coffee Lounge',
        worldPos: ZONE_DEFINITIONS.lounge_break.primaryAnchor,
        radiusX: 42,
        radiusY: 22,
        color: 0xf97316,
      },
    ]

    for (const def of interactiveZones) {
      const zoneContainer = new Container()
      const screenPos = worldToScreen(def.worldPos.x, def.worldPos.y, 0, camera)
      zoneContainer.position.set(screenPos.x, screenPos.y)
      zoneContainer.scale.set(camera.zoom)
      // Depth sorting: desk renders at screenPos.y
      zoneContainer.zIndex = screenPos.y

      // Subtle ambient interaction plate
      const plate = new Graphics()
      plate.ellipse(0, 0, def.radiusX, def.radiusY)
      plate.stroke({ color: def.color, width: 1.5, alpha: 0.2 })
      plate.fill({ color: def.color, alpha: 0.04 })
      zoneContainer.addChild(plate)

      // Desk Sprite (if available)
      let deskSprite: Sprite | undefined
      if (def.deskAsset) {
        const texture = getOfficeTexture(def.deskAsset, this.app)
        deskSprite = new Sprite(texture)
        deskSprite.anchor.set(0.5, 0.5)
        deskSprite.position.set(0, 0)
        zoneContainer.addChild(deskSprite)
      }

      // Hover glow highlight
      const hoverGlow = new Graphics()
      hoverGlow.ellipse(0, 0, def.radiusX + 6, def.radiusY + 3)
      hoverGlow.stroke({ color: def.color, width: 2, alpha: 0.85 })
      hoverGlow.fill({ color: def.color, alpha: 0.12 })
      hoverGlow.visible = false
      zoneContainer.addChild(hoverGlow)

      // Interactivity
      zoneContainer.eventMode = 'static'
      zoneContainer.cursor = 'pointer'

      zoneContainer.on('pointerover', () => {
        hoverGlow.visible = true
        if (deskSprite) deskSprite.tint = 0xfff3d6
      })
      zoneContainer.on('pointerout', () => {
        hoverGlow.visible = false
        if (deskSprite) deskSprite.tint = 0xffffff
      })
      zoneContainer.on('pointerdown', () => {
        if (def.onClickType === 'inbox') {
          this.handlers.onWorkItemClick?.('inbox')
        } else if (def.onClickType === 'approval') {
          this.handlers.onApprovalClick?.()
        } else if (def.onClickType === 'mission') {
          this.handlers.onMissionClick?.()
        }
      })

      this.items.set(def.id, zoneContainer)
      host.addChild(zoneContainer)
    }
  }

  public updateHandlers(handlers: FurnitureClickHandlers): void {
    this.handlers = handlers
  }
}
