/**
 * Canonical Renderer-Neutral Office Scene Types
 *
 * Defines the shared operational and spatial data contract consumed by both the
 * current 2D SVG renderer and future 3D/Canvas renderers (e.g. Three.js).
 */

export type OfficeDepartment =
  | 'executive'
  | 'finance'
  | 'engineering'
  | 'operations'

export type OfficeZoneId =
  | 'executive'
  | 'finance'
  | 'engineering'
  | 'review_station'
  | 'inbox_board'
  | 'meeting_room'
  | 'lounge_break'
  | 'desk_executive'
  | 'desk_finance'
  | 'desk_engineering'

export type AgentAttentionState =
  | 'nominal'
  | 'working'
  | 'waiting_approval'
  | 'needs_input'
  | 'error'

export type OfficeAgentOperationalStatus =
  | 'idle'
  | 'working'
  | 'waiting'
  | 'error'
  | 'offline'

export type OfficeMovementReason =
  | 'return_home'
  | 'approval_required'
  | 'needs_input'
  | 'inbox_processing'
  | 'mission_collaboration'
  | 'paused'
  | 'task_started'
  | 'task_completed'
  | 'error'

export type OfficeAgentSceneNode = {
  id: string
  agentDefinitionId: string
  name: string
  roleTitle: string
  department: OfficeDepartment
  emoji: string
  colorHex: string
  modelId: string

  // Operational State
  status: OfficeAgentOperationalStatus
  attentionState: AgentAttentionState
  currentTaskTitle?: string
  lastActivityText?: string
  lastActivityAt?: number

  // Spatial / Navigation Mapping
  homeDeskId: string
  currentZoneId: OfficeZoneId
  targetZoneId?: OfficeZoneId
  isMoving: boolean
  movementReason?: OfficeMovementReason
  movementStartedAt?: number
  movementCompletedAt?: number

  // Relational Links
  sessionKey?: string
  activeTaskId?: string
  pendingApprovalIds: Array<string>
  activeWorkItemIds: Array<string>
}

export type OfficeRoomSceneNode = {
  id: OfficeZoneId
  name: string
  department?: OfficeDepartment
  capacity: number
  occupantAgentIds: Array<string>
  hasPendingAction: boolean
  actionBadgeCount?: number
}

export type OfficeWorkItemSummary = {
  id: string
  type: 'finance_event' | 'approval' | 'task' | 'failure'
  title: string
  assignedAgentId: string
  status: 'needs_attention' | 'in_progress' | 'waiting' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

export type OfficeSceneState = {
  companyName: string
  missionRunning: boolean
  activeMissionGoal?: string
  missionProgressPercent?: number

  agents: Array<OfficeAgentSceneNode>
  rooms: Array<OfficeRoomSceneNode>
  workItems: Array<OfficeWorkItemSummary>
  pendingApprovalCount: number

  // Real-time synchronization
  lastSyncAt: number
}

export interface OfficeSpatialZone {
  id: OfficeZoneId
  title: string
  department: OfficeDepartment
  type: 'desk_cluster' | 'room' | 'utility_station'
  capacity: number
}

export const OFFICE_ZONES: Record<
  | 'executive'
  | 'finance'
  | 'engineering'
  | 'review_station'
  | 'inbox_board'
  | 'meeting_room'
  | 'lounge_break',
  OfficeSpatialZone
> = {
  executive: {
    id: 'executive',
    title: 'Executive Suite',
    department: 'executive',
    type: 'desk_cluster',
    capacity: 2,
  },
  finance: {
    id: 'finance',
    title: 'Finance & Accounting Wing',
    department: 'finance',
    type: 'desk_cluster',
    capacity: 3,
  },
  engineering: {
    id: 'engineering',
    title: 'Engineering Bay',
    department: 'engineering',
    type: 'desk_cluster',
    capacity: 4,
  },
  review_station: {
    id: 'review_station',
    title: 'Approval & Review Station',
    department: 'operations',
    type: 'utility_station',
    capacity: 4,
  },
  inbox_board: {
    id: 'inbox_board',
    title: 'Work Inbox Board',
    department: 'operations',
    type: 'utility_station',
    capacity: 2,
  },
  meeting_room: {
    id: 'meeting_room',
    title: 'Strategic Conference Room',
    department: 'operations',
    type: 'room',
    capacity: 8,
  },
  lounge_break: {
    id: 'lounge_break',
    title: 'Staff Lounge & Coffee',
    department: 'operations',
    type: 'room',
    capacity: 6,
  },
}
