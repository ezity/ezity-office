/**
 * Office View Component (Phase I-B)
 *
 * Modern modular Virtual Office component delegating to OfficeRendererHost
 * and SvgOfficeRenderer. Preserves backward compatibility for legacy props.
 */

import React, { useMemo } from 'react'
import type {
  AgentAttentionState,
  OfficeAgentOperationalStatus,
  OfficeAgentSceneNode,
  OfficeDepartment,
  OfficeSceneState,
  OfficeZoneId,
} from '@/types/office-scene'
import { OFFICE_ZONES } from '@/types/office-scene'
import {
  getDepartmentHomeDesk,
  mapDepartment,
} from '../office/state/office-state-synthesizer'
import { OfficeRendererHost } from '../office/office-renderer-host'

// ── Exported types ──

export type AgentWorkingStatus =
  | 'spawning'
  | 'ready'
  | 'active'
  | 'idle'
  | 'paused'
  | 'error'
  | 'none'
  | 'waiting_for_input'

export type AgentWorkingRow = {
  id: string
  name: string
  modelId: string
  status: AgentWorkingStatus
  lastLine?: string
  lastAt?: number
  taskCount: number
  currentTask?: string
  sessionKey?: string
  roleDescription?: string
  emoji?: string | null
  avatarEmoji?: string | null
  agentId?: string | null
}

export type RemoteSession = {
  sessionKey: string
  title: string
  status: string
  kind: string
  lastMessage?: string
  tokenCount?: number
}

export type OfficeViewProps = {
  scene?: OfficeSceneState
  agentRows?: Array<AgentWorkingRow>
  missionRunning?: boolean
  onViewOutput?: (agentId: string) => void
  onNewMission?: () => void
  selectedOutputAgentId?: string
  activeTemplateName?: string
  processType?: 'sequential' | 'hierarchical' | 'parallel'
  companyName?: string
  agentTasks?: Record<string, string>
  remoteSessions?: Array<RemoteSession>
  onViewRemoteOutput?: (sessionKey: string, label: string) => void
  /** Fixed pixel height for the office container (compact mode) */
  containerHeight?: number
  /** Hide the header bar (title, badges, buttons) */
  hideHeader?: boolean
}

// ── Model preset helpers (retained for backward compatibility) ──

type ModelPresetId =
  | 'auto'
  | 'opus'
  | 'sonnet'
  | 'codex'
  | 'flash'
  | 'minimax'
  | 'pc1-coder'
  | 'pc1-planner'
  | 'pc1-critic'

const OFFICE_MODEL_BADGE: Record<ModelPresetId, string> = {
  auto: 'rounded-full border border-neutral-200 bg-neutral-100 text-neutral-600',
  opus: 'border border-orange-200 bg-orange-50 text-orange-700',
  sonnet: 'border border-blue-200 bg-blue-50 text-blue-700',
  codex: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  flash: 'border border-violet-200 bg-violet-50 text-violet-700',
  minimax: 'border border-amber-200 bg-amber-50 text-amber-700',
  'pc1-coder': 'border border-cyan-200 bg-cyan-50 text-cyan-700',
  'pc1-planner': 'border border-indigo-200 bg-indigo-50 text-indigo-700',
  'pc1-critic': 'border border-purple-200 bg-purple-50 text-purple-700',
}

const OFFICE_MODEL_LABEL: Record<ModelPresetId, string> = {
  auto: 'Auto',
  opus: 'Opus',
  sonnet: 'Sonnet',
  codex: 'Codex',
  flash: 'Flash',
  minimax: 'MiniMax',
  'pc1-coder': 'PC1 Coder',
  'pc1-planner': 'PC1 Planner',
  'pc1-critic': 'PC1 Critic',
}

const DEFAULT_OFFICE_MODEL_BADGE =
  'border border-neutral-200 bg-neutral-50 text-neutral-700'

export function getOfficeModelBadge(modelId: string): string {
  return (
    OFFICE_MODEL_BADGE[modelId as ModelPresetId] ?? DEFAULT_OFFICE_MODEL_BADGE
  )
}

export function getOfficeModelLabel(modelId: string): string {
  if (!modelId) return 'Unknown'
  return (
    OFFICE_MODEL_LABEL[modelId as ModelPresetId] ??
    modelId.split('/')[1] ??
    modelId
  )
}

function agentRowsToScene(
  rows: Array<AgentWorkingRow>,
  missionRunning = false,
  companyName = 'EZity AI Office',
): OfficeSceneState {
  const agentNodes: Array<OfficeAgentSceneNode> = rows.map((row) => {
    const department = mapDepartment(row.agentId || row.id, row.roleDescription)
    const { deskId, zoneId } = getDepartmentHomeDesk(department, row.id)
    let status: OfficeAgentOperationalStatus = 'idle'
    let attentionState: AgentAttentionState = 'nominal'
    let targetZoneId: OfficeZoneId | undefined = undefined

    if (row.status === 'error') {
      status = 'error'
      attentionState = 'error'
    } else if (row.status === 'paused') {
      status = 'idle'
      targetZoneId = 'lounge_break'
    } else if (row.status === 'waiting_for_input') {
      status = 'waiting'
      attentionState = 'waiting_approval'
      targetZoneId = 'review_station'
    } else if (row.status === 'active' || row.status === 'spawning') {
      status = 'working'
      attentionState = 'working'
      if (department === 'executive' && missionRunning) {
        targetZoneId = 'meeting_room'
      }
    }

    return {
      id: row.id,
      agentDefinitionId: row.agentId || row.id,
      name: row.name,
      roleTitle: row.roleDescription || 'Worker',
      department,
      emoji: row.emoji || row.avatarEmoji || '🤖',
      colorHex:
        department === 'executive'
          ? '#a855f7'
          : department === 'finance'
            ? '#10b981'
            : department === 'engineering'
              ? '#38bdf8'
              : '#f59e0b',
      modelId: row.modelId || 'auto',
      status,
      attentionState,
      currentTaskTitle: row.currentTask,
      lastActivityText: row.lastLine,
      lastActivityAt: row.lastAt,
      homeDeskId: deskId,
      currentZoneId: zoneId,
      targetZoneId,
      isMoving: false,
      sessionKey: row.sessionKey,
      pendingApprovalIds: attentionState === 'waiting_approval' ? ['appr-1'] : [],
      activeWorkItemIds: [],
    }
  })

  const pendingCount = agentNodes.filter(
    (a) => a.attentionState === 'waiting_approval',
  ).length

  return {
    companyName,
    missionRunning,
    agents: agentNodes,
    rooms: Object.values(OFFICE_ZONES).map((z) => ({
      id: z.id,
      name: z.title,
      department: z.department,
      capacity: z.capacity,
      occupantAgentIds: agentNodes
        .filter((a) => a.currentZoneId === z.id || a.targetZoneId === z.id)
        .map((a) => a.id),
      hasPendingAction:
        (z.id === 'review_station' && pendingCount > 0) ||
        (z.id === 'meeting_room' && missionRunning),
      actionBadgeCount:
        z.id === 'review_station' && pendingCount > 0 ? pendingCount : undefined,
    })),
    workItems: [],
    pendingApprovalCount: pendingCount,
    lastSyncAt: Date.now(),
  }
}

/**
 * Main OfficeView Component
 * Renders the modern Ezity SVG Virtual Office via OfficeRendererHost.
 */
export function OfficeView({
  scene,
  agentRows = [],
  missionRunning = false,
  onViewOutput,
  companyName = 'EZity AI Office',
  containerHeight,
  hideHeader = false,
}: OfficeViewProps) {
  // Use canonical scene if passed, or synthesize from legacy agentRows
  const effectiveScene = useMemo(() => {
    if (scene) return scene
    return agentRowsToScene(agentRows, missionRunning, companyName)
  }, [scene, agentRows, missionRunning, companyName])

  return (
    <OfficeRendererHost
      scene={effectiveScene}
      containerHeight={containerHeight}
      companyName={companyName}
      hideHeader={hideHeader}
      onViewOutput={onViewOutput}
    />
  )
}
