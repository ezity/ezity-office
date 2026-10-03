/**
 * Pixi Virtual Office Room Layer
 *
 * Renders the master 2.5D pseudo-isometric office building environment,
 * matching the cohesive master art direction and world architecture.
 */

import { Container, Sprite, type Application } from 'pixi.js'
import { getOfficeTexture } from '../assets/asset-manifest'
import type { CameraState } from '../movement/navigation'

export class RoomLayer extends Container {
  private bgSprite?: Sprite

  constructor(private app: Application) {
    super()
  }

  /**
   * Builds the master room architecture and floor plan.
   */
  public buildEnvironment(camera: CameraState): void {
    this.removeChildren()

    const bgTexture = getOfficeTexture('office_world_bg', this.app)
    this.bgSprite = new Sprite(bgTexture)
    this.bgSprite.anchor.set(0.5, 0.5)
    this.bgSprite.position.set(camera.x, camera.y)
    this.bgSprite.scale.set(camera.zoom)
    this.addChild(this.bgSprite)
  }
}
