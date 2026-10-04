/**
 * Pixi Virtual Office Agent Layer
 *
 * Renders character sprites, animation states (idle, walk, sit, work, meeting, review),
 * ground shadows, interactive selection highlights, and real-time screen position tracking.
 */

import { Container, Sprite, Graphics, type Application } from 'pixi.js'
import type { OfficeAgentSceneState } from '@/types/office-scene'
import { getOfficeTexture } from '../assets/asset-manifest'
import {
  worldToScreen,
  type CameraState,
  type ScreenPoint,
} from '../movement/navigation'
import type {
  SpriteMovementController,
  AgentAnimationState,
  AgentFacing,
} from '../movement/sprite-movement'

export interface AgentLayerHandlers {
  onAgentClick?: (agentId: string, sessionKey?: string) => void
}

interface AgentDisplayObject {
  container: Container
  sprite: Sprite
  chairSprite: Sprite
  shadow: Graphics
  selectionHalo: Graphics
  agentId: string
  sessionKey?: string
  lastAnimState: AgentAnimationState
  lastFacing: AgentFacing
  currentTextureKey: string
  screenPosition: ScreenPoint
}

export class AgentLayer extends Container {
  private agentObjects = new Map<string, AgentDisplayObject>()
  private animTimer = 0

  constructor(
    private app: Application,
    private movementController: SpriteMovementController,
    private handlers: AgentLayerHandlers,
    private parentEntitiesContainer?: Container,
  ) {
    super()
    this.sortableChildren = true
  }

  /**
   * Syncs agents from OfficeSceneState into the Pixi scene.
   */
  public syncAgents(
    agents: OfficeAgentSceneState[],
    camera: CameraState,
    selectedAgentId?: string,
  ): void {
    const host = this.parentEntitiesContainer || this
    const presentAgentIds = new Set<string>()

    for (const agent of agents) {
      presentAgentIds.add(agent.id)
      let obj = this.agentObjects.get(agent.id)

      if (!obj) {
        obj = this.createAgentObject(agent, camera)
        this.agentObjects.set(agent.id, obj)
        host.addChild(obj.container)
      }

      obj.sessionKey = agent.sessionKey

      // Highlight halo if selected
      obj.selectionHalo.visible = selectedAgentId === agent.id
    }

    // Remove any agents no longer present
    for (const [id, obj] of this.agentObjects.entries()) {
      if (!presentAgentIds.has(id)) {
        host.removeChild(obj.container)
        obj.container.destroy({ children: true })
        this.agentObjects.delete(id)
      }
    }
  }

  /**
   * Called every frame from Pixi Ticker to update positions, animations, and depth sorting.
   */
  public update(camera: CameraState, deltaSeconds: number): void {
    this.animTimer += deltaSeconds

    for (const [agentId, obj] of this.agentObjects.entries()) {
      const moveState = this.movementController.getAgentState(agentId)
      if (!moveState) continue

      // Compute screen position from world position
      const screenPos = worldToScreen(
        moveState.currentWorldPos.x,
        moveState.currentWorldPos.y,
        moveState.currentWorldPos.z || 0,
        camera,
      )

      obj.screenPosition = screenPos

      // Unique phase per agent for organic, unsynchronized life
      const agentPhase = (agentId.charCodeAt(0) * 1.618 + agentId.length * 2.718) % (Math.PI * 2)
      const t = this.animTimer + agentPhase

      const isFacingLeft = moveState.facing.endsWith('left')
      const isSeated =
        moveState.animationState === 'sit' ||
        moveState.animationState === 'work' ||
        moveState.animationState === 'meeting' ||
        moveState.animationState === 'review'

      obj.chairSprite.visible = isSeated

      let bobY = 0

      if (moveState.isMoving || moveState.animationState === 'walk') {
        // Walking bounce cycle and stride tilt
        const step = Math.sin(t * 14)
        bobY = -Math.abs(step) * 3.5
        obj.sprite.rotation = step * 0.05
        obj.sprite.position.set(0, 0)
        obj.sprite.scale.set(isFacingLeft ? -1 : 1, 1)

        // Shadow compresses slightly during stride apex
        obj.shadow.scale.set(1 - Math.abs(step) * 0.15, 1 - Math.abs(step) * 0.1)
        obj.shadow.alpha = 0.25

        this.updateAgentTexture(agentId, obj, 'walk')
      } else if (isSeated) {
        // Match chair orientation with agent's facing direction
        obj.chairSprite.scale.x = isFacingLeft
          ? -Math.abs(obj.chairSprite.scale.x)
          : Math.abs(obj.chairSprite.scale.x)
        obj.chairSprite.position.set(isFacingLeft ? 4 : -4, -6)

        // Seated gentle breathing (squash & stretch from the hips/waist)
        const breath = Math.sin(t * 2.2)
        const breathScaleY = 1 + breath * 0.024
        const breathScaleX = 1 - breath * 0.012

        if (moveState.animationState === 'meeting') {
          this.updateAgentTexture(agentId, obj, 'meeting')
          obj.sprite.position.y = 0
          obj.sprite.rotation = (isFacingLeft ? -1 : 1) * Math.sin(t * 1.0) * 0.012
        } else if (moveState.animationState === 'review') {
          this.updateAgentTexture(agentId, obj, 'review')
          obj.sprite.position.y = 0
          obj.sprite.rotation = (isFacingLeft ? -1 : 1) * Math.sin(t * 0.8) * 0.015
        } else {
          // Active working typing bursts vs reading/resting
          // Cycle: ~3.5s typing burst, ~2s thoughtful pause
          const burstEnvelope = Math.sin(t * 0.85)

          if (burstEnvelope > 0.15) {
            // Typing session: use working pose with keystroke micro-motion
            this.updateAgentTexture(agentId, obj, 'work')
            obj.sprite.position.y = Math.sin(t * 11) * 0.5
            obj.sprite.rotation = (isFacingLeft ? -1 : 1) * (0.015 + Math.sin(t * 1.5) * 0.01)
          } else {
            // Thoughtful pause: reading screen, hands resting on desk
            this.updateAgentTexture(agentId, obj, 'sit')
            obj.sprite.position.y = 0
            obj.sprite.rotation = (isFacingLeft ? -1 : 1) * Math.sin(t * 0.9) * 0.012
          }
        }

        obj.sprite.scale.set(
          (isFacingLeft ? -1 : 1) * breathScaleX,
          breathScaleY,
        )

        // Shadow stays anchored underneath chair
        obj.shadow.scale.set(1, 1)
        obj.shadow.alpha = 0.25
      } else {
        // Standing idle breathing and subtle weight shift
        const breath = Math.sin(t * 2.0)
        const breathScaleY = 1 + breath * 0.035
        const breathScaleX = 1 - breath * 0.018

        obj.sprite.scale.set(
          (isFacingLeft ? -1 : 1) * breathScaleX,
          breathScaleY,
        )
        // Gentle weight shift sway
        obj.sprite.rotation = Math.sin(t * 1.2) * 0.02
        obj.sprite.position.set(0, 0)

        // Ground shadow breathing
        obj.shadow.scale.set(1 + breath * 0.04, 1 + breath * 0.02)
        obj.shadow.alpha = 0.25 - breath * 0.03

        this.updateAgentTexture(agentId, obj, 'idle')
      }

      // Track last state
      obj.lastAnimState = moveState.animationState
      obj.lastFacing = moveState.facing

      // Position container and scale with camera zoom
      obj.container.position.set(screenPos.x, screenPos.y + bobY)
      obj.container.scale.set(camera.zoom)

      // Y-based depth sorting
      obj.container.zIndex = screenPos.y
    }
  }

  /**
   * Returns current screen coordinates of all active agents for HTML overlay projection.
   */
  public getAgentScreenPositions(): Map<string, ScreenPoint> {
    const result = new Map<string, ScreenPoint>()
    for (const [id, obj] of this.agentObjects.entries()) {
      result.set(id, { ...obj.screenPosition })
    }
    return result
  }

  public updateHandlers(handlers: AgentLayerHandlers): void {
    this.handlers = handlers
  }

  private createAgentObject(
    agent: OfficeAgentSceneState,
    camera: CameraState,
  ): AgentDisplayObject {
    const container = new Container()
    container.sortableChildren = true

    // Ground Shadow
    const shadow = new Graphics()
    shadow.ellipse(0, 2, 18, 6)
    shadow.fill({ color: 0x422006, alpha: 0.25 })
    container.addChild(shadow)

    // Selection Halo
    const halo = new Graphics()
    halo.ellipse(0, 0, 26, 12)
    halo.stroke({ color: 0x38bdf8, width: 2.5, alpha: 0.9 })
    halo.fill({ color: 0x38bdf8, alpha: 0.15 })
    halo.visible = false
    container.addChild(halo)

    // Ergonomic Chair (rendered underneath character sprite)
    const chairTexture = getOfficeTexture('chair_office', this.app)
    const chairSprite = new Sprite(chairTexture)
    chairSprite.anchor.set(0.5, 0.88)
    chairSprite.position.set(-4, -6)
    chairSprite.visible = true
    container.addChild(chairSprite)

    // Sprite
    const textureKey = this.getTextureKeyForRole(agent.id, 'sit')
    const texture = getOfficeTexture(textureKey, this.app)
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 0.95)
    container.addChild(sprite)

    // Interactivity
    container.eventMode = 'static'
    container.cursor = 'pointer'

    container.on('pointerover', () => {
      sprite.tint = 0xfff0c2 // Warm hover highlight
    })
    container.on('pointerout', () => {
      sprite.tint = 0xffffff
    })
    container.on('pointerdown', () => {
      this.handlers.onAgentClick?.(
        agent.agentDefinitionId || agent.id,
        agent.sessionKey,
      )
    })

    return {
      container,
      sprite,
      chairSprite,
      shadow,
      selectionHalo: halo,
      agentId: agent.id,
      sessionKey: agent.sessionKey,
      lastAnimState: 'sit',
      lastFacing: 'down-left',
      currentTextureKey: textureKey,
      screenPosition: { x: 0, y: 0 },
    }
  }

  private updateAgentTexture(
    agentId: string,
    obj: AgentDisplayObject,
    poseKey: string,
  ): void {
    const textureKey = this.getTextureKeyForRole(agentId, poseKey)
    if (obj.currentTextureKey === textureKey) return
    const texture = getOfficeTexture(textureKey, this.app)
    obj.sprite.texture = texture
    obj.currentTextureKey = textureKey
  }

  private getTextureKeyForRole(agentId: string, pose: string): string {
    const id = agentId.toLowerCase()
    let prefix = 'developer'

    if (id.includes('chief') || id.includes('staff') || id.includes('hafiz')) {
      prefix = 'cos'
    } else if (id.includes('accountant') || id.includes('finance') || id.includes('fariz')) {
      prefix = 'accountant'
    } else if (id.includes('developer') || id.includes('salmanz')) {
      prefix = 'developer'
    }

    return `${prefix}_${pose}`
  }
}
