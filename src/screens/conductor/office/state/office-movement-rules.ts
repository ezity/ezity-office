/**
 * Canonical Office Movement Rules & Zone Derivation
 *
 * Centralized, deterministic logic for deriving an agent's operational zone,
 * target zone, and movement reason based purely on real runtime state.
 *
 * Priority Rules (Highest to Lowest):
 * 1. Error / Critical Failure -> Returns home with error alert state.
 * 2. Explicit Pending Human Approval / Needs Input -> Moves to Review Station.
 * 3. Active Multi-Agent Mission Collaboration -> Moves to Conference Room (Chief + participating workers).
 * 4. Active Work Inbox Item Processing -> Moves to Work Inbox Board.
 * 5. Explicit Paused / Break State -> Moves to Staff Lounge.
 * 6. Ordinary Working -> Home Desk with active monitor.
 * 7. Idle / Available -> Home Desk.
 */

import type {
  AgentAttentionState,
  OfficeAgentOperationalStatus,
  OfficeMovementReason,
  OfficeZoneId,
} from '@/types/office-scene'

export interface DeriveAgentLocationParams {
  agentDefinitionId: string
  department: 'executive' | 'finance' | 'engineering' | 'operations'
  homeZoneId: OfficeZoneId
  status: OfficeAgentOperationalStatus
  attentionState: AgentAttentionState
  isMissionActive: boolean
  isParticipatingInMission: boolean
  isPaused: boolean
  pendingApprovalCount: number
  activeWorkItemCount: number
  isProcessingInboxItem?: boolean
}

export interface DerivedAgentLocation {
  currentZoneId: OfficeZoneId
  targetZoneId?: OfficeZoneId
  movementReason?: OfficeMovementReason
  isMoving: boolean
}

/**
 * Pure function to derive agent location and semantic movement reason.
 */
export function deriveAgentOfficeLocation(
  params: DeriveAgentLocationParams,
): DerivedAgentLocation {
  const {
    homeZoneId,
    status,
    attentionState,
    isMissionActive,
    isParticipatingInMission,
    isPaused,
    pendingApprovalCount,
    isProcessingInboxItem = false,
  } = params

  // 1. Error / Critical failure -> Retain at home desk with error status
  if (status === 'error' || attentionState === 'error') {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: undefined,
      movementReason: 'error',
      isMoving: false,
    }
  }

  // 2. Explicit Pending Human Approval / Needs Input -> Review Station wins
  if (pendingApprovalCount > 0 || attentionState === 'waiting_approval') {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: 'review_station',
      movementReason: 'approval_required',
      isMoving: homeZoneId !== 'review_station',
    }
  }

  if (attentionState === 'needs_input') {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: 'review_station',
      movementReason: 'needs_input',
      isMoving: homeZoneId !== 'review_station',
    }
  }

  // 3. Active Multi-Agent Mission Collaboration -> Conference Room
  if (isMissionActive && isParticipatingInMission) {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: 'meeting_room',
      movementReason: 'mission_collaboration',
      isMoving: homeZoneId !== 'meeting_room',
    }
  }

  // 4. Active Work Inbox Item Processing -> Work Inbox Board
  if (isProcessingInboxItem) {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: 'inbox_board',
      movementReason: 'inbox_processing',
      isMoving: homeZoneId !== 'inbox_board',
    }
  }

  // 5. Explicit Paused / Break state -> Staff Lounge
  if (isPaused) {
    return {
      currentZoneId: homeZoneId,
      targetZoneId: 'lounge_break',
      movementReason: 'paused',
      isMoving: homeZoneId !== 'lounge_break',
    }
  }

  // 6. Ordinary Working or Idle -> Stays at Home Desk
  return {
    currentZoneId: homeZoneId,
    targetZoneId: undefined,
    movementReason: status === 'working' ? 'task_started' : 'return_home',
    isMoving: false,
  }
}
