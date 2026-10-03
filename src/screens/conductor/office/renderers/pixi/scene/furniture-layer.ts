/**
 * Pixi Virtual Office Furniture Layer
 *
 * Renders 2.5D isometric office furniture items, workstations, boards, and interactive fixtures.
 */

import { Container, Sprite, type Application } from 'pixi.js'
import { getOfficeTexture } from '../assets/asset-manifest'
import {
  worldToScreen,
  type CameraState,
  type WorldPoint,
} from '../movement/navigation'

export interface FurnitureClickHandlers {
  onWorkItemClick?: (workItemId: string) => void
  onApprovalClick?: (approvalId?: string) => void
  onMissionClick?: () => void
}

interface FurnitureItemDef {
  id: string
  assetId: string
  worldPos: WorldPoint
  anchor?: { x: number; y: number }
  interactive?: boolean
  onClickType?: 'inbox' | 'approval' | 'mission'
}

export class FurnitureLayer extends Container {
  private items = new Map<string, Sprite>()

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

    const furnitureDefs: FurnitureItemDef[] = [
      // 1. Executive Suite
      {
        id: 'exec_chair',
        assetId: 'chair_office',
        worldPos: { x: 2.2, y: 3.7 },
      },
      {
        id: 'exec_desk',
        assetId: 'desk_executive',
        worldPos: { x: 2.5, y: 4.2 },
      },
      {
        id: 'exec_plant',
        assetId: 'plant_potted',
        worldPos: { x: 1.5, y: 3.0 },
      },

      // 2. Conference Room
      {
        id: 'conf_table',
        assetId: 'table_meeting',
        worldPos: { x: 10.5, y: 2.8 },
        interactive: true,
        onClickType: 'mission',
      },
      {
        id: 'conf_chair_1',
        assetId: 'chair_office',
        worldPos: { x: 9.8, y: 2.0 },
      },
      {
        id: 'conf_chair_2',
        assetId: 'chair_office',
        worldPos: { x: 11.2, y: 2.0 },
      },
      {
        id: 'conf_chair_3',
        assetId: 'chair_office',
        worldPos: { x: 9.8, y: 3.6 },
      },
      {
        id: 'conf_chair_4',
        assetId: 'chair_office',
        worldPos: { x: 11.2, y: 3.6 },
      },

      // 3. Finance Wing
      {
        id: 'fin_chair',
        assetId: 'chair_office',
        worldPos: { x: 2.2, y: 10.2 },
      },
      {
        id: 'fin_desk',
        assetId: 'desk_finance',
        worldPos: { x: 2.5, y: 10.7 },
      },
      {
        id: 'fin_cabinet',
        assetId: 'cabinet_filing',
        worldPos: { x: 1.5, y: 9.5 },
      },

      // 4. Engineering Bay
      {
        id: 'eng_chair',
        assetId: 'chair_office',
        worldPos: { x: 12.2, y: 6.2 },
      },
      {
        id: 'eng_desk',
        assetId: 'desk_engineering',
        worldPos: { x: 12.5, y: 6.7 },
      },
      {
        id: 'eng_server',
        assetId: 'rack_server',
        worldPos: { x: 14.2, y: 5.5 },
      },

      // 5. Review Station
      {
        id: 'rev_chair',
        assetId: 'chair_office',
        worldPos: { x: 6.5, y: 9.5 },
      },
      {
        id: 'rev_desk',
        assetId: 'desk_review',
        worldPos: { x: 6.5, y: 8.8 },
        interactive: true,
        onClickType: 'approval',
      },

      // 6. Operations Cork Board
      {
        id: 'ops_board',
        assetId: 'board_operations',
        worldPos: { x: 9.2, y: 10.5 },
        interactive: true,
        onClickType: 'inbox',
      },

      // 7. Staff Lounge
      {
        id: 'lounge_sofa',
        assetId: 'sofa_lounge',
        worldPos: { x: 10.5, y: 14.8 },
      },
      {
        id: 'lounge_coffee',
        assetId: 'coffee_machine',
        worldPos: { x: 12.5, y: 13.5 },
      },
      {
        id: 'lounge_plant',
        assetId: 'plant_potted',
        worldPos: { x: 8.8, y: 13.5 },
      },
    ]

    for (const def of furnitureDefs) {
      const texture = getOfficeTexture(def.assetId, this.app)
      const sprite = new Sprite(texture)

      const screenPos = worldToScreen(def.worldPos.x, def.worldPos.y, 0, camera)
      sprite.anchor.set(def.anchor?.x ?? 0.5, def.anchor?.y ?? 0.75)
      sprite.position.set(screenPos.x, screenPos.y)

      // Depth sorting zIndex based on screen Y
      sprite.zIndex = screenPos.y

      if (def.interactive) {
        sprite.eventMode = 'static'
        sprite.cursor = 'pointer'

        sprite.on('pointerover', () => {
          sprite.tint = 0xfff0c2 // Warm hover highlight
        })
        sprite.on('pointerout', () => {
          sprite.tint = 0xffffff
        })
        sprite.on('pointerdown', () => {
          if (def.onClickType === 'inbox') {
            this.handlers.onWorkItemClick?.('inbox')
          } else if (def.onClickType === 'approval') {
            this.handlers.onApprovalClick?.()
          } else if (def.onClickType === 'mission') {
            this.handlers.onMissionClick?.()
          }
        })
      }

      this.items.set(def.id, sprite)
      this.addChild(sprite)
    }
  }

  public updateHandlers(handlers: FurnitureClickHandlers): void {
    this.handlers = handlers
  }
}
