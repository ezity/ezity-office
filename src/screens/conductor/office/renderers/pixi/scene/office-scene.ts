/**
 * Pixi Virtual Office Scene Orchestrator
 *
 * Manages Pixi Application, camera, ticker, layer stack, and synchronization
 * with OfficeSceneState.
 */

import 'pixi.js/unsafe-eval'
import { Application, Container, type Ticker } from 'pixi.js'
import type { OfficeSceneState, OfficeZoneId } from '@/types/office-scene'
import {
  preloadOfficeAssets,
  clearOfficeTextureCache,
} from '../assets/asset-manifest'
import {
  ZONE_DEFINITIONS,
  calculateOfficeRoute,
  worldToScreen,
  type CameraState,
  DEFAULT_CAMERA,
  type ScreenPoint,
} from '../movement/navigation'
import { SpriteMovementController } from '../movement/sprite-movement'
import { RoomLayer } from './room-layer'
import { FurnitureLayer, type FurnitureClickHandlers } from './furniture-layer'
import { AgentLayer, type AgentLayerHandlers } from './agent-layer'
import { OverlayLayer } from './overlay-layer'

export interface OfficeSceneOptions {
  container?: HTMLElement
  canvas?: HTMLCanvasElement
  width: number
  height: number
  handlers: FurnitureClickHandlers & AgentLayerHandlers
  onOverlayPositionsUpdate?: (positions: Map<string, ScreenPoint>) => void
  enableReducedMotion?: boolean
}

export class OfficeScene {
  public app: Application
  private camera: CameraState
  private movementController = new SpriteMovementController()

  // Scene Layers
  private worldContainer = new Container()
  private roomLayer!: RoomLayer
  private furnitureLayer!: FurnitureLayer
  private agentLayer!: AgentLayer
  private overlayLayer!: OverlayLayer

  // Track agent destinations to avoid re-routing unless changed
  private lastAgentZones = new Map<string, OfficeZoneId>()
  private isDestroyed = false

  private onOverlayPositionsUpdate?: (positions: Map<string, ScreenPoint>) => void

  private constructor(app: Application, camera: CameraState) {
    this.app = app
    this.camera = camera
  }

  /**
   * Asynchronously initializes the Pixi application and scene layers.
   */
  public static async create(options: OfficeSceneOptions): Promise<OfficeScene> {
    const app = new Application()

    const initOptions: Record<string, unknown> = {
      width: options.width,
      height: options.height,
      backgroundAlpha: 0,
      preference: 'webgl',
      antialias: true,
      autoDensity: true,
      resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    }

    if (options.canvas) {
      initOptions.canvas = options.canvas
    }

    await app.init(initOptions)

    // Mount canvas into container if provided
    if (options.container && app.canvas) {
      app.canvas.style.display = 'block'
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      options.container.appendChild(app.canvas)
    }

    // Compute initial camera offset centered around grid (7.5, 7.5)
    const camera: CameraState = {
      x: options.width / 2,
      y: Math.max(70, options.height * 0.12),
      zoom: options.width < 900 ? 0.8 : 1.0,
    }

    const scene = new OfficeScene(app, camera)
    scene.onOverlayPositionsUpdate = options.onOverlayPositionsUpdate
    scene.movementController.setReducedMotion(Boolean(options.enableReducedMotion))

    await preloadOfficeAssets(app)
    scene.setupLayers(options.handlers)
    scene.startTicker()

    return scene
  }

  /**
   * Resizes renderer and recenters camera.
   */
  public resize(width: number, height: number): void {
    if (this.isDestroyed) return

    this.app.renderer.resize(width, height)
    this.camera.x = width / 2
    this.camera.y = Math.max(70, height * 0.12)
    this.camera.zoom = width < 900 ? 0.8 : 1.0

    // Rebuild static layers with new camera
    this.roomLayer.buildEnvironment(this.camera)
    this.furnitureLayer.buildFurniture(this.camera)
  }

  /**
   * Synchronizes authoritatively with OfficeSceneState.
   */
  public syncSceneState(
    sceneState: OfficeSceneState,
    selectedAgentId?: string,
    selectedZoneId?: OfficeZoneId,
    enableReducedMotion = false,
  ): void {
    if (this.isDestroyed) return

    this.movementController.setReducedMotion(enableReducedMotion)

    // 1. Sync Agents & Routes
    for (const agent of sceneState.agents) {
      const destinationZone: OfficeZoneId = agent.targetZoneId || agent.currentZoneId
      const lastZone = this.lastAgentZones.get(agent.id)

      const zoneDef = ZONE_DEFINITIONS[destinationZone] || ZONE_DEFINITIONS.executive

      // Register initial position if agent is new
      let moveState = this.movementController.getAgentState(agent.id)
      if (!moveState) {
        const initialDef = ZONE_DEFINITIONS[agent.currentZoneId] || zoneDef
        moveState = this.movementController.registerAgent(
          agent.id,
          initialDef.primaryAnchor,
          initialDef.facing,
          initialDef.contextualPose,
        )
        this.lastAgentZones.set(agent.id, agent.currentZoneId)
      }

      // Check if destination zone has changed
      if (lastZone !== destinationZone) {
        this.lastAgentZones.set(agent.id, destinationZone)

        const fromZone = lastZone || agent.currentZoneId
        const waypoints = calculateOfficeRoute(
          moveState.currentWorldPos,
          fromZone,
          destinationZone,
          zoneDef.primaryAnchor,
        )

        this.movementController.startNavigation(
          agent.id,
          waypoints,
          zoneDef.contextualPose,
          zoneDef.facing,
        )
      }
    }

    // 2. Sync Agent Display Objects
    this.agentLayer.syncAgents(sceneState.agents, this.camera, selectedAgentId)

    // 3. Sync Visual Overlays
    this.overlayLayer.updateZoneHighlights(
      this.camera,
      selectedZoneId,
      sceneState.missionRunning,
    )
  }

  public updateHandlers(
    handlers: FurnitureClickHandlers & AgentLayerHandlers,
  ): void {
    if (this.isDestroyed) return
    this.furnitureLayer.updateHandlers(handlers)
    this.agentLayer.updateHandlers(handlers)
  }

  public destroy(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    try {
      this.app.ticker?.stop()
    } catch {}

    try {
      if (this.app.canvas && this.app.canvas.parentNode) {
        this.app.canvas.parentNode.removeChild(this.app.canvas)
      }
    } catch {}

    try {
      this.app.destroy(true, { children: true, texture: false })
    } catch {}

    clearOfficeTextureCache()
  }

  private setupLayers(handlers: FurnitureClickHandlers & AgentLayerHandlers): void {
    this.worldContainer.sortableChildren = true
    this.app.stage.addChild(this.worldContainer)

    // Layer 1: Floor & Architecture
    this.roomLayer = new RoomLayer(this.app)
    this.roomLayer.buildEnvironment(this.camera)
    this.worldContainer.addChild(this.roomLayer)

    // Layer 2: Furniture
    this.furnitureLayer = new FurnitureLayer(this.app, handlers)
    this.furnitureLayer.buildFurniture(this.camera)
    this.worldContainer.addChild(this.furnitureLayer)

    // Layer 3: Agents
    this.agentLayer = new AgentLayer(this.app, this.movementController, handlers)
    this.worldContainer.addChild(this.agentLayer)

    // Layer 4: Overlays & Selection Highlights
    this.overlayLayer = new OverlayLayer(this.app)
    this.worldContainer.addChild(this.overlayLayer)
  }

  private startTicker(): void {
    this.app.ticker.add((ticker: Ticker) => {
      if (this.isDestroyed) return

      const deltaSeconds = ticker.deltaMS / 1000

      // 1. Step movement interpolation
      this.movementController.update(deltaSeconds)

      // 2. Step sprite animation and depth sorting
      this.agentLayer.update(this.camera, deltaSeconds)

      // 3. Emit updated screen positions for DOM overlay
      if (this.onOverlayPositionsUpdate) {
        const positions = this.agentLayer.getAgentScreenPositions()
        this.onOverlayPositionsUpdate(positions)
      }
    })
  }
}
