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
  shadow: Graphics
  selectionHalo: Graphics
  agentId: string
  sessionKey?: string
  lastAnimState: AgentAnimationState
  lastFacing: AgentFacing
  screenPosition: ScreenPoint
}

export class AgentLayer extends Container {
  private agentObjects = new Map<string, AgentDisplayObject>()
  private animTimer = 0

  constructor(
    private app: Application,
    private movementController: SpriteMovementController,
    private handlers: AgentLayerHandlers,
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
    const presentAgentIds = new Set<string>()

    for (const agent of agents) {
      presentAgentIds.add(agent.id)
      let obj = this.agentObjects.get(agent.id)

      if (!obj) {
        obj = this.createAgentObject(agent, camera)
        this.agentObjects.set(agent.id, obj)
        this.addChild(obj.container)
      }

      obj.sessionKey = agent.sessionKey

      // Highlight halo if selected
      obj.selectionHalo.visible = selectedAgentId === agent.id
    }

    // Remove any agents no longer present
    for (const [id, obj] of this.agentObjects.entries()) {
      if (!presentAgentIds.has(id)) {
        this.removeChild(obj.container)
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

      // Micro-animation bobbing
      let bobY = 0
      let legCycle = 1

      if (moveState.isMoving) {
        // Walking bounce cycle (stride frequency ~ 8 Hz)
        bobY = Math.sin(this.animTimer * 16) * 3
        legCycle = Math.sin(this.animTimer * 16) > 0 ? 1 : -1
      } else if (moveState.animationState === 'idle') {
        // Idle gentle breathing
        bobY = Math.sin(this.animTimer * 2.5) * 1.5
      }

      // Check if texture needs update based on state or role
      if (
        obj.lastAnimState !== moveState.animationState ||
        obj.lastFacing !== moveState.facing
      ) {
        this.updateAgentTexture(agentId, obj, moveState.animationState, moveState.facing)
        obj.lastAnimState = moveState.animationState
        obj.lastFacing = moveState.facing
      }

      // Flip sprite horizontally when facing left vs right
      const isFacingLeft = moveState.facing.endsWith('left')
      obj.sprite.scale.x = isFacingLeft ? -Math.abs(obj.sprite.scale.x) : Math.abs(obj.sprite.scale.x)

      // Position container
      obj.container.position.set(screenPos.x, screenPos.y + bobY)

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
    shadow.ellipse(0, 4, 14, 5)
    shadow.fill({ color: 0x422006, alpha: 0.25 })
    container.addChild(shadow)

    // Selection Halo
    const halo = new Graphics()
    halo.ellipse(0, 0, 22, 10)
    halo.stroke({ color: 0x38bdf8, width: 2.5, alpha: 0.9 })
    halo.fill({ color: 0x38bdf8, alpha: 0.15 })
    halo.visible = false
    container.addChild(halo)

    // Sprite
    const textureKey = this.getTextureKeyForRole(agent.id, 'sit')
    const texture = getOfficeTexture(textureKey, this.app)
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 0.88)
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
      this.handlers.onAgentClick?.(agent.id, agent.sessionKey)
    })

    return {
      container,
      sprite,
      shadow,
      selectionHalo: halo,
      agentId: agent.id,
      sessionKey: agent.sessionKey,
      lastAnimState: 'sit',
      lastFacing: 'down-left',
      screenPosition: { x: 0, y: 0 },
    }
  }

  private updateAgentTexture(
    agentId: string,
    obj: AgentDisplayObject,
    animState: AgentAnimationState,
    facing: AgentFacing,
  ): void {
    const poseKey = animState === 'walk' ? 'walk' : animState === 'sit' ? 'sit' : 'idle'
    const textureKey = this.getTextureKeyForRole(agentId, poseKey)
    const texture = getOfficeTexture(textureKey, this.app)
    obj.sprite.texture = texture
  }

  private getTextureKeyForRole(agentId: string, pose: string): string {
    const id = agentId.toLowerCase()
    let prefix = 'developer'

    if (id.includes('chief') || id.includes('staff')) {
      prefix = 'cos'
    } else if (id.includes('accountant') || id.includes('finance')) {
      prefix = 'accountant'
    }

    return `${prefix}_${pose}`
  }
}
