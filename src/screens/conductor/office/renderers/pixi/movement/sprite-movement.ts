/**
 * Sprite Movement Controller
 *
 * Ticker-driven position interpolation and animation state machine for Pixi agent sprites.
 * Zero React re-renders during movement.
 */

import type { WorldPoint } from './navigation'

export type AgentFacing = 'down-left' | 'down-right' | 'up-left' | 'up-right'
export type AgentAnimationState =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'work'
  | 'meeting'
  | 'review'
  | 'error'

export interface AgentMovementState {
  agentId: string
  currentWorldPos: WorldPoint
  waypoints: WorldPoint[]
  waypointIndex: number
  speed: number // World tiles per second
  isMoving: boolean
  facing: AgentFacing
  animationState: AgentAnimationState
  postArrivalPose: AgentAnimationState
  postArrivalFacing: AgentFacing
  onArrive?: () => void
}

export class SpriteMovementController {
  private agentStates = new Map<string, AgentMovementState>()
  private reducedMotion = false

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled
  }

  /**
   * Initializes or updates an agent's registered position.
   */
  public registerAgent(
    agentId: string,
    initialPos: WorldPoint,
    facing: AgentFacing = 'down-left',
    pose: AgentAnimationState = 'sit',
  ): AgentMovementState {
    const existing = this.agentStates.get(agentId)
    if (existing) {
      return existing
    }

    const state: AgentMovementState = {
      agentId,
      currentWorldPos: { x: initialPos.x, y: initialPos.y, z: 0 },
      waypoints: [],
      waypointIndex: 0,
      speed: 3.2, // ~3.2 tiles per second for natural walking speed
      isMoving: false,
      facing,
      animationState: pose,
      postArrivalPose: pose,
      postArrivalFacing: facing,
    }

    this.agentStates.set(agentId, state)
    return state
  }

  /**
   * Commands an agent to travel along a sequence of waypoints.
   */
  public startNavigation(
    agentId: string,
    waypoints: WorldPoint[],
    postArrivalPose: AgentAnimationState = 'sit',
    postArrivalFacing: AgentFacing = 'down-left',
    onArrive?: () => void,
  ): void {
    const state = this.agentStates.get(agentId)
    if (!state) return

    if (!waypoints.length) return

    state.postArrivalPose = postArrivalPose
    state.postArrivalFacing = postArrivalFacing
    state.onArrive = onArrive

    // Reduced motion: snap immediately to final waypoint
    if (this.reducedMotion) {
      const finalPoint = waypoints[waypoints.length - 1]
      state.currentWorldPos = { x: finalPoint.x, y: finalPoint.y, z: 0 }
      state.isMoving = false
      state.waypoints = []
      state.waypointIndex = 0
      state.facing = postArrivalFacing
      state.animationState = postArrivalPose
      onArrive?.()
      return
    }

    state.waypoints = waypoints
    state.waypointIndex = 0
    state.isMoving = true
    state.animationState = 'walk'

    // Update facing towards first waypoint
    this.updateFacing(state, waypoints[0])
  }

  /**
   * Updates interpolation for all agents on each Pixi ticker frame.
   * @param deltaSeconds Seconds elapsed since last frame
   */
  public update(deltaSeconds: number): void {
    for (const state of this.agentStates.values()) {
      if (!state.isMoving || state.waypoints.length === 0) continue

      let remainingStep = state.speed * deltaSeconds

      while (
        remainingStep > 0 &&
        state.isMoving &&
        state.waypointIndex < state.waypoints.length
      ) {
        const target = state.waypoints[state.waypointIndex]
        if (!target) {
          this.finishMovement(state)
          break
        }

        const dx = target.x - state.currentWorldPos.x
        const dy = target.y - state.currentWorldPos.y
        const dist = Math.hypot(dx, dy)

        if (dist <= remainingStep || dist < 0.01) {
          // Reached current waypoint
          state.currentWorldPos.x = target.x
          state.currentWorldPos.y = target.y
          remainingStep -= dist

          state.waypointIndex++
          if (state.waypointIndex >= state.waypoints.length) {
            // Reached final destination
            this.finishMovement(state)
            break
          } else {
            // Move towards next waypoint
            const nextTarget = state.waypoints[state.waypointIndex]
            this.updateFacing(state, nextTarget)
          }
        } else {
          // Step towards waypoint
          const nx = dx / dist
          const ny = dy / dist
          state.currentWorldPos.x += nx * remainingStep
          state.currentWorldPos.y += ny * remainingStep
          remainingStep = 0
        }
      }
    }
  }

  public getAgentState(agentId: string): AgentMovementState | undefined {
    return this.agentStates.get(agentId)
  }

  public getAllAgentStates(): Map<string, AgentMovementState> {
    return this.agentStates
  }

  private finishMovement(state: AgentMovementState): void {
    state.isMoving = false
    state.waypoints = []
    state.waypointIndex = 0
    state.animationState = state.postArrivalPose
    state.facing = state.postArrivalFacing

    state.onArrive?.()
  }

  private updateFacing(state: AgentMovementState, target: WorldPoint): void {
    const dx = target.x - state.currentWorldPos.x
    const dy = target.y - state.currentWorldPos.y

    // In isometric projection:
    // +x is down-right, -x is up-left
    // +y is down-left, -y is up-right
    if (Math.abs(dx) > Math.abs(dy)) {
      state.facing = dx > 0 ? 'down-right' : 'up-left'
    } else {
      state.facing = dy > 0 ? 'down-left' : 'up-right'
    }
  }
}
