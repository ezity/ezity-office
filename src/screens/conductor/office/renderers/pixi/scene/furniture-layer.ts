/**
 * Pixi Virtual Office Furniture & Interactive Zones Layer
 *
 * Provides interactive hitboxes, hover highlights, and click handlers
 * for operational fixtures (Operations Board, Review Counter, Conference Table, Workstations)
 * seamlessly aligned with the master office environment.
 */

import { Container, Graphics, type Application } from 'pixi.js'
import {
  worldToScreen,
  ZONE_DEFINITIONS,
  type CameraState,
  type WorldPoint,
} from '../movement/navigation'

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
  onClickType?: 'inbox' | 'approval' | 'mission'
}

export class FurnitureLayer extends Container {
  private items = new Map<string, Container>()

  constructor(
    private app: Application,
    private handlers: FurnitureClickHandlers,
  ) {
    super()
    this.sortableChildren = true
  }

  public buildFurniture(camera: CameraState): void {
    this.removeChildren()
    this.items.clear()

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
        worldPos: ZONE_DEFINITIONS.review_station.primaryAnchor,
        radiusX: 40,
        radiusY: 20,
        color: 0xf59e0b,
        onClickType: 'approval',
      },
      // 3. Strategic Conference Table (Top-Center Glass Room)
      {
        id: 'conf_table',
        name: 'Strategic Conference Table',
        worldPos: ZONE_DEFINITIONS.meeting_room.primaryAnchor,
        radiusX: 52,
        radiusY: 26,
        color: 0x60a5fa,
        onClickType: 'mission',
      },
      // 4. Executive Desk (Top-Left Suite)
      {
        id: 'exec_desk',
        name: 'Executive Orchestrator Desk',
        worldPos: ZONE_DEFINITIONS.executive.primaryAnchor,
        radiusX: 48,
        radiusY: 24,
        color: 0x818cf8,
      },
      // 5. Finance Desk (Bottom-Left Wing)
      {
        id: 'fin_desk',
        name: 'Financial Ledger Station',
        worldPos: ZONE_DEFINITIONS.finance.primaryAnchor,
        radiusX: 45,
        radiusY: 22,
        color: 0x10b981,
      },
      // 6. Engineering Workstation (Bottom-Right Bay)
      {
        id: 'eng_desk',
        name: 'Engineering Bay Workstation',
        worldPos: ZONE_DEFINITIONS.engineering.primaryAnchor,
        radiusX: 46,
        radiusY: 23,
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
      zoneContainer.zIndex = screenPos.y

      // Subtle ambient interaction plate
      const plate = new Graphics()
      plate.ellipse(0, 0, def.radiusX, def.radiusY)
      plate.stroke({ color: def.color, width: 1.5, alpha: 0.25 })
      plate.fill({ color: def.color, alpha: 0.04 })
      zoneContainer.addChild(plate)

      // Hover glow highlight
      const hoverGlow = new Graphics()
      hoverGlow.ellipse(0, 0, def.radiusX + 4, def.radiusY + 2)
      hoverGlow.stroke({ color: def.color, width: 2, alpha: 0.85 })
      hoverGlow.fill({ color: def.color, alpha: 0.18 })
      hoverGlow.visible = false
      zoneContainer.addChild(hoverGlow)

      // Interactivity
      zoneContainer.eventMode = 'static'
      zoneContainer.cursor = 'pointer'

      zoneContainer.on('pointerover', () => {
        hoverGlow.visible = true
      })
      zoneContainer.on('pointerout', () => {
        hoverGlow.visible = false
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
      this.addChild(zoneContainer)
    }
  }

  public updateHandlers(handlers: FurnitureClickHandlers): void {
    this.handlers = handlers
  }
}
