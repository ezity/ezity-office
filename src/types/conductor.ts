/**
 * Conductor types — gateway-native mission orchestration.
 *
 * These types match the upstream gateway conductor, NOT the old
 * file-backed mission-store types that were deleted.
 */

export type MissionPhase = 'idle' | 'decomposing' | 'running' | 'complete'

export type ConductorSettings = {
  orchestratorModel: string
  workerModel: string
  projectsDir: string
  maxParallel: number
  supervised: boolean
  staffOrchestrated?: boolean
}

export type ConductorWorkerStatus = 'running' | 'complete' | 'stale' | 'idle'

export type ConductorWorker = {
  key: string
  label: string
  model: string | null
  status: ConductorWorkerStatus
  updatedAt: string | null
  displayName: string
  totalTokens: number
  contextTokens: number
  tokenUsageLabel: string
  raw: import('@/lib/gateway-api').GatewaySession
  agentId?: string | null
  agentName?: string | null
  agentEmoji?: string | null
  agentRole?: string | null
  agentColor?: string | null
}

export type ConductorTask = {
  id: string
  title: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  workerKey: string | null
  output: string | null
}

export type MissionHistoryWorkerDetail = {
  label: string
  model: string
  totalTokens: number
  personaEmoji: string
  personaName: string
  agentId?: string | null
  agentRole?: string | null
}

export type MissionHistoryEntry = {
  id: string
  goal: string
  startedAt: string
  completedAt: string
  workerCount: number
  totalTokens: number
  status: 'completed' | 'failed'
  projectPath: string | null
  outputPath?: string | null
  workerSummary?: string[]
  outputText?: string
  streamText?: string
  completeSummary?: string
  workerDetails?: MissionHistoryWorkerDetail[]
  error?: string | null
  isEzityStaff?: boolean
}

export type StreamEvent =
  | { type: 'assistant'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool'; name?: string; phase?: string; data?: Record<string, unknown> }
  | { type: 'done'; state?: string; message?: string }
  | { type: 'error'; message: string }
  | { type: 'started'; runId?: string; sessionKey?: string }

export type PersistedMission = {
  goal: string
  phase: MissionPhase
  missionStartedAt: string | null
  isPaused: boolean
  pausedElapsedMs: number
  accumulatedPausedMs: number
  pauseStartedAt: string | null
  workerKeys: string[]
  workerLabels: string[]
  workerOutputs: Record<string, string>
  streamText: string
  planText: string
  completedAt: string | null
  tasks: ConductorTask[]
  isEzityStaff?: boolean
}

/** Default settings — empty model strings = Hermes default */
export const DEFAULT_CONDUCTOR_SETTINGS: ConductorSettings = {
  orchestratorModel: '',
  workerModel: '',
  projectsDir: '',
  maxParallel: 1,
  supervised: false,
  staffOrchestrated: true,
}
