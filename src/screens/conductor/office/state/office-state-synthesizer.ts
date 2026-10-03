/**
 * Canonical Office State Synthesizer
 *
 * Pure, deterministic functions to transform Conductor runtime state,
 * WorkItems, and agent definitions into a renderer-neutral OfficeSceneState,
 * and provide a backward-compatible adapter for the existing OfficeView.
 */

import type {
  AgentAttentionState,
  OfficeAgentOperationalStatus,
  OfficeAgentSceneNode,
  OfficeDepartment,
  OfficeRoomSceneNode,
  OfficeSceneState,
  OfficeWorkItemSummary,
  OfficeZoneId,
} from '@/types/office-scene'
import { OFFICE_ZONES } from '@/types/office-scene'
import type { AgentWorkingRow } from '@/screens/conductor/components/office-view'
import { getAgentPersona } from '@/screens/conductor/components/agent-avatar'
import type { WorkItem } from '@/types/task'

export const CANONICAL_STAFF_DEFS = {
  'ezity-chief-of-staff': {
    agentDefinitionId: 'ezity-chief-of-staff',
    name: 'Chief of Staff',
    roleTitle: 'Executive Orchestrator',
    department: 'executive' as const,
    emoji: '👔',
    colorHex: '#a855f7',
    homeDeskId: 'desk-chief-of-staff',
    homeZoneId: 'executive' as const,
    defaultIdleLine: 'Ready to coordinate missions...',
  },
  'ezity-accountant': {
    agentDefinitionId: 'ezity-accountant',
    name: 'Accountant',
    roleTitle: 'Financial Analysis & Planning',
    department: 'finance' as const,
    emoji: '📊',
    colorHex: '#10b981',
    homeDeskId: 'desk-accountant',
    homeZoneId: 'finance' as const,
    defaultIdleLine: 'Standing by for finance and reporting...',
  },
  'ezity-developer': {
    agentDefinitionId: 'ezity-developer',
    name: 'Developer',
    roleTitle: 'Engineering & Automation',
    department: 'engineering' as const,
    emoji: '💻',
    colorHex: '#38bdf8',
    homeDeskId: 'desk-developer',
    homeZoneId: 'engineering' as const,
    defaultIdleLine: 'Standing by for engineering tasks...',
  },
} as const

export const OFFICE_NAMES = [
  'Nova',
  'Pixel',
  'Blaze',
  'Echo',
  'Sage',
  'Drift',
  'Flux',
  'Volt',
]

export interface ConductorWorkerSnapshot {
  key: string
  displayName: string
  status: 'running' | 'complete' | 'stale' | 'idle'
  model?: string
  updatedAt?: string
  agentId?: string | null
  agentName?: string | null
  agentEmoji?: string | null
  agentRole?: string | null
}

export interface ConductorTaskSnapshot {
  id: string
  title: string
  workerKey?: string
  status: string
}

export interface ConductorSessionSnapshot {
  key?: string
  status?: string
  kind?: string
  updatedAt?: string
  agentId?: string
  agentName?: string
  agentEmoji?: string
  agentRole?: string
  model?: string
  task?: string
  label?: string
  title?: string
  derivedTitle?: string
}

export interface ConductorSnapshot {
  phase?: 'idle' | 'decomposing' | 'running' | 'complete'
  goal?: string
  isPaused?: boolean
  pausedAtMs?: number | null
  workers?: Array<ConductorWorkerSnapshot>
  activeWorkers?: Array<unknown>
  tasks?: Array<ConductorTaskSnapshot>
  workerOutputs?: Record<string, string>
  streamText?: string
  isEZityStaff?: boolean
  conductorSettings?: {
    staffOrchestrated?: boolean
    orchestratorModel?: string
    workerModel?: string
    [key: string]: unknown
  }
  orchestratorSessionKey?: string | null
  recentSessions?: Array<ConductorSessionSnapshot>
}

export interface SynthesizeOfficeStateParams {
  conductor?: ConductorSnapshot
  workItems?: Array<WorkItem>
  now?: number
  companyName?: string
}

/**
 * Deterministic department mapping based on agent definition ID and role title.
 * Fallback to operations for generic/custom workers without LLM inference.
 */
export function mapDepartment(
  agentDefinitionId: string,
  roleTitle?: string,
): OfficeDepartment {
  const normalizedId = (agentDefinitionId || '').toLowerCase()
  const normalizedRole = (roleTitle || '').toLowerCase()

  if (
    normalizedId === 'ezity-chief-of-staff' ||
    normalizedId.includes('chief-of-staff') ||
    normalizedId.includes('conductor') ||
    normalizedRole.includes('executive') ||
    normalizedRole.includes('orchestrator')
  ) {
    return 'executive'
  }

  if (
    normalizedId === 'ezity-accountant' ||
    normalizedId.includes('accountant') ||
    normalizedId.includes('finance') ||
    normalizedRole.includes('accounting') ||
    normalizedRole.includes('financial') ||
    normalizedRole.includes('bookkeeping') ||
    normalizedRole.includes('tax') ||
    normalizedRole.includes('budget') ||
    normalizedRole.includes('ledger')
  ) {
    return 'finance'
  }

  if (
    normalizedId === 'ezity-developer' ||
    normalizedId.includes('developer') ||
    normalizedId.includes('engineer') ||
    normalizedRole.includes('developer') ||
    normalizedRole.includes('engineering') ||
    normalizedRole.includes('software')
  ) {
    return 'engineering'
  }

  return 'operations'
}

/**
 * Returns default home desk ID for a given department.
 */
export function getDepartmentHomeDesk(
  department: OfficeDepartment,
  agentId: string,
): { deskId: string; zoneId: OfficeZoneId } {
  switch (department) {
    case 'executive':
      return { deskId: 'desk-chief-of-staff', zoneId: 'executive' }
    case 'finance':
      return { deskId: 'desk-accountant', zoneId: 'finance' }
    case 'engineering':
      return { deskId: 'desk-developer', zoneId: 'engineering' }
    default:
      return { deskId: `desk-${agentId}`, zoneId: 'inbox_board' }
  }
}

/**
 * Helper to get default color hex for a department or index.
 */
function getDepartmentColorHex(department: OfficeDepartment, index = 0): string {
  switch (department) {
    case 'executive':
      return '#a855f7'
    case 'finance':
      return '#10b981'
    case 'engineering':
      return '#38bdf8'
    default: {
      const palette = ['#f59e0b', '#06b6d4', '#d946ef', '#84cc16']
      return palette[index % palette.length]
    }
  }
}

/**
 * Pure function to synthesize canonical OfficeSceneState.
 */
export function synthesizeOfficeSceneState(
  params: SynthesizeOfficeStateParams,
): OfficeSceneState {
  const {
    conductor = {},
    workItems = [],
    now = Date.now(),
    companyName = 'EZity AI Office',
  } = params

  const isMissionActive =
    conductor.phase === 'decomposing' ||
    conductor.phase === 'running' ||
    (conductor.workers && conductor.workers.length > 0)

  // 1. Process Work Items & Summaries
  const activeWorkItems = workItems.filter(
    (item) => item.status !== 'dismissed' && item.status !== 'completed',
  )

  const workSummaries: Array<OfficeWorkItemSummary> = activeWorkItems.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    assignedAgentId: item.assignedAgentId,
    status:
      item.status === 'dismissed' ? 'completed' : item.status,
    priority: item.priority,
  }))

  const allPendingApprovals = activeWorkItems.filter(
    (item) =>
      item.type === 'approval' ||
      (item.status === 'needs_attention' &&
        (item.type === 'finance_event' ||
          item.source === 'ezityhub' ||
          item.title.toLowerCase().includes('approval') ||
          item.title.toLowerCase().includes('review'))),
  )

  // 2. Build Agent Nodes
  const agentNodes: Array<OfficeAgentSceneNode> = []

  if (isMissionActive) {
    const workers = conductor.workers ?? []
    if (workers.length > 0) {
      // Map active workers
      workers.forEach((worker, index) => {
        const persona = getAgentPersona(index)
        const agentId =
          worker.agentId ||
          (worker.key.includes('accountant')
            ? 'ezity-accountant'
            : worker.key.includes('developer')
              ? 'ezity-developer'
              : worker.key.includes('chief-of-staff')
                ? 'ezity-chief-of-staff'
                : `worker-${index}`)

        const role = worker.agentRole ?? worker.displayName
        const department = mapDepartment(agentId, role)
        const { deskId, zoneId } = getDepartmentHomeDesk(department, worker.key)

        const currentRunningTask = (conductor.tasks ?? []).find(
          (t) => t.workerKey === worker.key && t.status === 'running',
        )

        const isWorkerPaused =
          Boolean(conductor.isPaused) &&
          (worker.status === 'running' || worker.status === 'idle')

        let status: OfficeAgentOperationalStatus = 'working'
        let attentionState: AgentAttentionState = 'working'
        let targetZoneId: OfficeZoneId | undefined = undefined

        if (isWorkerPaused) {
          status = 'idle'
          attentionState = 'nominal'
          targetZoneId = 'lounge_break'
        } else if (worker.status === 'complete') {
          status = 'idle'
          attentionState = 'nominal'
        } else if (worker.status === 'stale') {
          status = 'error'
          attentionState = 'error'
        } else {
          status = 'working'
          attentionState = 'working'
        }

        const lastLine = conductor.workerOutputs?.[worker.key] ?? ''
        const updatedAt = worker.updatedAt
          ? new Date(worker.updatedAt).getTime()
          : undefined

        agentNodes.push({
          id: worker.key,
          agentDefinitionId: agentId,
          name: worker.agentName ?? persona.name,
          roleTitle: role,
          department,
          emoji: worker.agentEmoji ?? persona.emoji,
          colorHex: getDepartmentColorHex(department, index),
          modelId: worker.model || 'auto',
          status,
          attentionState,
          currentTaskTitle: isWorkerPaused ? 'Paused' : currentRunningTask?.title,
          lastActivityText: isWorkerPaused ? 'Paused' : lastLine || undefined,
          lastActivityAt: updatedAt,
          homeDeskId: deskId,
          currentZoneId: zoneId,
          targetZoneId,
          isMoving: false,
          sessionKey: worker.key,
          activeTaskId: currentRunningTask?.id,
          pendingApprovalIds: [],
          activeWorkItemIds: [],
        })
      })
    } else {
      // Mission decomposing / preparing before workers spawn
      const isEZityStaff = conductor.isEZityStaff !== false
      if (isEZityStaff) {
        const cosDef = CANONICAL_STAFF_DEFS['ezity-chief-of-staff']
        const isPaused = Boolean(conductor.isPaused)
        agentNodes.push({
          id: conductor.orchestratorSessionKey || 'conductor-chief-of-staff',
          agentDefinitionId: cosDef.agentDefinitionId,
          name: cosDef.name,
          roleTitle: cosDef.roleTitle,
          department: cosDef.department,
          emoji: cosDef.emoji,
          colorHex: cosDef.colorHex,
          modelId: conductor.conductorSettings?.orchestratorModel || 'auto',
          status: isPaused ? 'idle' : 'working',
          attentionState: isPaused ? 'nominal' : 'working',
          currentTaskTitle: conductor.goal || 'Coordinating mission...',
          lastActivityText: isPaused
            ? 'Paused'
            : conductor.streamText
              ? 'Chief of Staff analyzing mission...'
              : 'Chief of Staff preparing staff team...',
          homeDeskId: cosDef.homeDeskId,
          currentZoneId: cosDef.homeZoneId,
          targetZoneId: 'meeting_room',
          isMoving: false,
          sessionKey:
            conductor.orchestratorSessionKey || 'conductor-chief-of-staff',
          pendingApprovalIds: [],
          activeWorkItemIds: [],
        })
      } else {
        const persona = getAgentPersona(0)
        agentNodes.push({
          id: 'conductor-placeholder-agent',
          agentDefinitionId: 'custom-worker-0',
          name: persona.name,
          roleTitle: 'Waiting for workers',
          department: 'operations',
          emoji: persona.emoji,
          colorHex: getDepartmentColorHex('operations', 0),
          modelId: conductor.conductorSettings?.workerModel || 'auto',
          status: 'working',
          attentionState: 'working',
          currentTaskTitle: conductor.goal || 'Preparing the office...',
          lastActivityText: conductor.goal || 'Preparing the office...',
          homeDeskId: 'desk-placeholder-0',
          currentZoneId: 'inbox_board',
          targetZoneId: 'meeting_room',
          isMoving: false,
          sessionKey: 'conductor-placeholder-agent',
          pendingApprovalIds: [],
          activeWorkItemIds: [],
        })
      }
    }
  } else {
    // Conductor Idle / Home view
    const isEZityStaff = conductor.conductorSettings?.staffOrchestrated !== false
    const sessions = conductor.recentSessions ?? []

    if (sessions.length === 0) {
      if (isEZityStaff) {
        // Built-in EZity staff triad
        const cos = CANONICAL_STAFF_DEFS['ezity-chief-of-staff']
        const acct = CANONICAL_STAFF_DEFS['ezity-accountant']
        const dev = CANONICAL_STAFF_DEFS['ezity-developer']

        agentNodes.push(
          {
            id: cos.agentDefinitionId,
            agentDefinitionId: cos.agentDefinitionId,
            name: cos.name,
            roleTitle: cos.roleTitle,
            department: cos.department,
            emoji: cos.emoji,
            colorHex: cos.colorHex,
            modelId: conductor.conductorSettings?.orchestratorModel || 'auto',
            status: 'idle',
            attentionState: 'nominal',
            lastActivityText: cos.defaultIdleLine,
            homeDeskId: cos.homeDeskId,
            currentZoneId: cos.homeZoneId,
            isMoving: false,
            pendingApprovalIds: [],
            activeWorkItemIds: [],
          },
          {
            id: acct.agentDefinitionId,
            agentDefinitionId: acct.agentDefinitionId,
            name: acct.name,
            roleTitle: acct.roleTitle,
            department: acct.department,
            emoji: acct.emoji,
            colorHex: acct.colorHex,
            modelId: conductor.conductorSettings?.workerModel || 'auto',
            status: 'idle',
            attentionState: 'nominal',
            lastActivityText: acct.defaultIdleLine,
            homeDeskId: acct.homeDeskId,
            currentZoneId: acct.homeZoneId,
            isMoving: false,
            pendingApprovalIds: [],
            activeWorkItemIds: [],
          },
          {
            id: dev.agentDefinitionId,
            agentDefinitionId: dev.agentDefinitionId,
            name: dev.name,
            roleTitle: dev.roleTitle,
            department: dev.department,
            emoji: dev.emoji,
            colorHex: dev.colorHex,
            modelId: conductor.conductorSettings?.workerModel || 'auto',
            status: 'idle',
            attentionState: 'nominal',
            lastActivityText: dev.defaultIdleLine,
            homeDeskId: dev.homeDeskId,
            currentZoneId: dev.homeZoneId,
            isMoving: false,
            pendingApprovalIds: [],
            activeWorkItemIds: [],
          },
        )
      } else {
        // Fallback placeholder agents
        OFFICE_NAMES.slice(0, 3).forEach((name, i) => {
          const persona = getAgentPersona(i)
          agentNodes.push({
            id: `placeholder-${i}`,
            agentDefinitionId: `placeholder-${i}`,
            name,
            roleTitle: 'Worker',
            department: 'operations',
            emoji: persona.emoji,
            colorHex: getDepartmentColorHex('operations', i),
            modelId: 'auto',
            status: 'idle',
            attentionState: 'nominal',
            lastActivityText: 'Waiting for work...',
            homeDeskId: `desk-placeholder-${i}`,
            currentZoneId: 'inbox_board',
            isMoving: false,
            pendingApprovalIds: [],
            activeWorkItemIds: [],
          })
        })
      }
    } else {
      // Map recent sessions up to 6
      sessions.slice(0, 6).forEach((s, i) => {
        const updatedAt =
          typeof s.updatedAt === 'string' ? new Date(s.updatedAt).getTime() : 0
        const statusText = `${s.status ?? ''} ${s.kind ?? ''}`.toLowerCase()

        let status: OfficeAgentOperationalStatus = 'idle'
        let attentionState: AgentAttentionState = 'nominal'
        let targetZoneId: OfficeZoneId | undefined = undefined

        if (/error|failed/.test(statusText)) {
          status = 'error'
          attentionState = 'error'
        } else if (/pause/.test(statusText)) {
          status = 'idle'
          attentionState = 'nominal'
          targetZoneId = 'lounge_break'
        } else if (now - updatedAt < 120_000) {
          status = 'working'
          attentionState = 'working'
        } else {
          status = 'idle'
          attentionState = 'nominal'
        }

        const agentId =
          s.agentId ||
          (s.key?.includes('accountant')
            ? 'ezity-accountant'
            : s.key?.includes('developer')
              ? 'ezity-developer'
              : s.key?.includes('chief-of-staff')
                ? 'ezity-chief-of-staff'
                : `session-agent-${i}`)

        const role = s.agentRole ?? s.label ?? 'Worker'
        const department = mapDepartment(agentId, role)
        const { deskId, zoneId } = getDepartmentHomeDesk(department, s.key ?? `session-${i}`)
        const persona = getAgentPersona(i)

        agentNodes.push({
          id: s.key ?? `session-${i}`,
          agentDefinitionId: agentId,
          name: s.agentName ?? OFFICE_NAMES[i % OFFICE_NAMES.length],
          roleTitle: role,
          department,
          emoji: s.agentEmoji ?? persona.emoji,
          colorHex: getDepartmentColorHex(department, i),
          modelId: s.model ?? 'auto',
          status,
          attentionState,
          lastActivityText:
            s.task ?? s.label ?? s.title ?? s.derivedTitle ?? 'Working...',
          lastActivityAt: updatedAt || undefined,
          homeDeskId: deskId,
          currentZoneId: zoneId,
          targetZoneId,
          isMoving: false,
          sessionKey: s.key ?? undefined,
          pendingApprovalIds: [],
          activeWorkItemIds: [],
        })
      })
    }
  }

  // 3. Correlate Work Items & Approvals with Agent Nodes
  agentNodes.forEach((node) => {
    // Match work items assigned to this agent definition or id
    const assignedItems = activeWorkItems.filter((item) => {
      const assigned = (item.assignedAgentId || '').toLowerCase()
      const defId = node.agentDefinitionId.toLowerCase()
      const nodeId = node.id.toLowerCase()

      if (assigned === defId || assigned === nodeId) return true
      if (node.sessionKey && item.sourceSessionKey === node.sessionKey) return true

      if (node.department === 'finance') {
        return (
          assigned.includes('accountant') ||
          assigned.includes('finance') ||
          item.type === 'finance_event'
        )
      }
      if (node.department === 'engineering') {
        return assigned.includes('developer') || assigned.includes('engineer')
      }
      if (node.department === 'executive') {
        return assigned.includes('chief-of-staff') || assigned.includes('conductor')
      }
      return false
    })

    node.activeWorkItemIds = assignedItems.map((item) => item.id)

    // Approvals requiring attention
    const agentApprovals = assignedItems.filter(
      (item) =>
        item.type === 'approval' ||
        (item.status === 'needs_attention' &&
          (item.type === 'finance_event' ||
            item.title.toLowerCase().includes('approval') ||
            item.title.toLowerCase().includes('review'))),
    )
    node.pendingApprovalIds = agentApprovals.map((item) => item.id)

    // Apply Approval & Attention overrides
    if (node.pendingApprovalIds.length > 0) {
      node.attentionState = 'waiting_approval'
      if (node.status !== 'error') {
        node.status = 'waiting'
      }
      node.targetZoneId = 'review_station'
    } else if (
      assignedItems.some((i) => i.status === 'needs_attention') &&
      node.status !== 'error'
    ) {
      node.attentionState = 'needs_input'
      if (!node.targetZoneId && !isMissionActive) {
        node.targetZoneId = 'inbox_board'
      }
    } else if (
      node.activeWorkItemIds.length > 0 &&
      node.status === 'idle' &&
      !node.targetZoneId &&
      !isMissionActive
    ) {
      // Active work item processing
      node.targetZoneId = 'inbox_board'
    }

    // Chief of Staff multi-agent mission target
    if (
      isMissionActive &&
      node.department === 'executive' &&
      !node.pendingApprovalIds.length &&
      node.targetZoneId !== 'lounge_break'
    ) {
      node.targetZoneId = 'meeting_room'
    }

    // Fallback current task title from active work item if none set
    if (!node.currentTaskTitle && assignedItems.length > 0) {
      const ongoing =
        assignedItems.find((i) => i.status === 'in_progress') || assignedItems[0]
      node.currentTaskTitle = ongoing.title
    }
  })

  // 4. Construct Logical Rooms
  const rooms: Array<OfficeRoomSceneNode> = Object.values(OFFICE_ZONES).map(
    (zone) => {
      const occupants = agentNodes.filter(
        (a) => a.currentZoneId === zone.id || a.targetZoneId === zone.id,
      )

      let hasPendingAction = false
      let actionBadgeCount = 0

      if (zone.id === 'review_station') {
        hasPendingAction = allPendingApprovals.length > 0
        actionBadgeCount = allPendingApprovals.length
      } else if (zone.id === 'inbox_board') {
        const needsAttentionCount = activeWorkItems.filter(
          (i) => i.status === 'needs_attention',
        ).length
        hasPendingAction = needsAttentionCount > 0
        actionBadgeCount = needsAttentionCount
      } else if (zone.id === 'meeting_room') {
        hasPendingAction = isMissionActive
        actionBadgeCount = isMissionActive ? 1 : 0
      }

      return {
        id: zone.id,
        name: zone.title,
        department: zone.department,
        capacity: zone.capacity,
        occupantAgentIds: occupants.map((a) => a.id),
        hasPendingAction,
        actionBadgeCount: actionBadgeCount > 0 ? actionBadgeCount : undefined,
      }
    },
  )

  // 5. Mission Progress Calculation
  const totalWorkers = conductor.workers?.length ?? 0
  const completedWorkers =
    conductor.workers?.filter((w) => w.status === 'complete').length ?? 0
  const missionProgressPercent =
    totalWorkers > 0
      ? Math.round((completedWorkers / totalWorkers) * 100)
      : undefined

  return {
    companyName,
    missionRunning: isMissionActive,
    activeMissionGoal: conductor.goal || undefined,
    missionProgressPercent,
    agents: agentNodes,
    rooms,
    workItems: workSummaries,
    pendingApprovalCount: allPendingApprovals.length,
    lastSyncAt: now,
  }
}

/**
 * Backward compatibility adapter: transforms OfficeSceneState into legacy AgentWorkingRow[]
 * for consumption by the existing OfficeView component.
 */
export function toLegacyAgentWorkingRows(
  scene: OfficeSceneState,
): Array<AgentWorkingRow> {
  return scene.agents.map((node) => {
    let legacyStatus: AgentWorkingRow['status'] = 'idle'

    if (node.status === 'error' || node.attentionState === 'error') {
      legacyStatus = 'error'
    } else if (node.targetZoneId === 'lounge_break') {
      legacyStatus = 'paused'
    } else if (
      node.status === 'waiting' ||
      node.attentionState === 'waiting_approval' ||
      node.attentionState === 'needs_input'
    ) {
      legacyStatus = 'waiting_for_input'
    } else if (node.status === 'working') {
      // In active mission when workers have not spawned yet, orchestrator displays as spawning
      if (
        scene.missionRunning &&
        scene.agents.length === 1 &&
        node.targetZoneId === 'meeting_room' &&
        !node.sessionKey?.startsWith('worker-')
      ) {
        legacyStatus = 'spawning'
      } else {
        legacyStatus = 'active'
      }
    } else if (node.status === 'idle') {
      legacyStatus = 'idle'
    }

    return {
      id: node.id,
      name: node.name,
      modelId: node.modelId || 'auto',
      status: legacyStatus,
      lastLine: node.lastActivityText,
      lastAt: node.lastActivityAt,
      taskCount: node.activeWorkItemIds.length + (node.activeTaskId ? 1 : 0),
      currentTask: node.currentTaskTitle,
      sessionKey: node.sessionKey,
      roleDescription: node.roleTitle,
      emoji: node.emoji,
      avatarEmoji: node.emoji,
      agentId: node.agentDefinitionId,
    }
  })
}
