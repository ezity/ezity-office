/**
 * Task store — file-backed persistence for Kanban board tasks.
 *
 * Follows the same pattern as crew-store.ts: in-memory cache with
 * deferred disk writes to .runtime/tasks.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { publishChatEvent } from './chat-event-bus'
import type {
  CreateTaskInput,
  HermesTask,
  TaskColumn,
  TaskSourceType,
  UpdateTaskInput,
} from '../types/task'

const DATA_DIR = join(process.cwd(), '.runtime')
const TASKS_FILE = join(DATA_DIR, 'tasks.json')

type StoreData = { tasks: Record<string, HermesTask> }

export interface TaskFilter {
  column?: TaskColumn
  assignee?: string
  priority?: 'high' | 'medium' | 'low'
  sourceType?: TaskSourceType
  sourceId?: string
}

let store: StoreData = { tasks: {} }

function loadFromDisk(): void {
  try {
    if (existsSync(TASKS_FILE)) {
      const raw = readFileSync(TASKS_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as StoreData
      if (parsed?.tasks && typeof parsed.tasks === 'object') {
        store = parsed
      }
    }
  } catch {
    /* corrupt file — start fresh */
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(TASKS_FILE, JSON.stringify(store, null, 2))
  } catch {
    /* ignore write failure */
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(): void {
  if (_saveTimer) return
  _saveTimer = setTimeout(() => {
    _saveTimer = null
    saveToDisk()
  }, 1_000)
}

loadFromDisk()

export function listTasks(filter?: TaskFilter): Array<HermesTask> {
  let tasks = Object.values(store.tasks)
  if (filter?.column) tasks = tasks.filter((t) => t.column === filter.column)
  if (filter?.assignee)
    tasks = tasks.filter((t) => t.assignee === filter.assignee)
  if (filter?.priority)
    tasks = tasks.filter((t) => t.priority === filter.priority)
  if (filter?.sourceType)
    tasks = tasks.filter((t) => t.sourceType === filter.sourceType)
  if (filter?.sourceId)
    tasks = tasks.filter((t) => t.sourceId === filter.sourceId)
  return tasks.sort((a, b) => b.createdAt - a.createdAt)
}

export function getTask(taskId: string): HermesTask | null {
  return store.tasks[taskId] ?? null
}

export function createTask(input: CreateTaskInput): HermesTask {
  const now = Date.now()
  const task: HermesTask = {
    id: randomUUID(),
    title: (input.title ?? '').trim(),
    description: (input.description ?? '').trim(),
    column: input.column ?? 'backlog',
    priority: input.priority ?? 'medium',
    assignee: input.assignee ?? null,
    tags: input.tags ?? [],
    dueDate: input.dueDate ?? null,
    position: now,
    sourceType: input.sourceType ?? 'manual',
    sourceId: input.sourceId ?? null,
    createdBy: input.createdBy ?? 'user',
    createdAt: now,
    updatedAt: now,
  }
  store.tasks[task.id] = task
  saveToDisk()
  publishChatEvent('task.created', {
    sessionKey: 'all',
    taskId: task.id,
    title: task.title,
    sourceType: task.sourceType,
  })
  return task
}

export function updateTask(
  taskId: string,
  updates: UpdateTaskInput,
): HermesTask | null {
  const task = store.tasks[taskId]
  if (!task) return null
  if (updates.title !== undefined) task.title = updates.title.trim()
  if (updates.description !== undefined)
    task.description = updates.description.trim()
  if (updates.column !== undefined) task.column = updates.column
  if (updates.priority !== undefined) task.priority = updates.priority
  if (updates.assignee !== undefined) task.assignee = updates.assignee
  if (updates.tags !== undefined) task.tags = updates.tags
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate
  if (updates.position !== undefined) task.position = updates.position
  task.updatedAt = Date.now()
  scheduleSave()
  return task
}

export function moveTask(
  taskId: string,
  column: TaskColumn,
): HermesTask | null {
  const result = updateTask(taskId, { column })
  if (result) {
    publishChatEvent('task.moved', { sessionKey: 'all', taskId, column })
  }
  return result
}

export function deleteTask(taskId: string): boolean {
  if (!store.tasks[taskId]) return false
  delete store.tasks[taskId]
  saveToDisk()
  publishChatEvent('task.deleted', { sessionKey: 'all', taskId })
  return true
}

// ─── WorkItem Operations (Phase H) ──────────────────────────────────

export function deriveWorkItemStatus(task: HermesTask): WorkItemStatus {
  if (task.status) return task.status
  switch (task.column) {
    case 'review':
      return 'needs_attention'
    case 'in_progress':
      return 'in_progress'
    case 'done':
      return 'completed'
    case 'todo':
    case 'backlog':
    default:
      return 'waiting'
  }
}

export function deriveTaskColumn(status: WorkItemStatus): TaskColumn {
  switch (status) {
    case 'needs_attention':
      return 'review'
    case 'in_progress':
      return 'in_progress'
    case 'completed':
      return 'done'
    case 'dismissed':
      return 'backlog'
    case 'waiting':
    default:
      return 'todo'
  }
}

export function normalizeToWorkItem(task: HermesTask): WorkItem {
  const status = deriveWorkItemStatus(task)
  const assignedAgentId =
    task.assignee ||
    (task.sourceType === 'finance'
      ? 'ezity-accountant'
      : task.sourceType === 'approval'
        ? 'ezity-developer'
        : 'ezity-chief-of-staff')

  const source: 'ezityhub' | 'hermes' | 'system' | 'manual' =
    task.sourceType === 'finance'
      ? 'ezityhub'
      : task.sourceType === 'approval' ||
          task.sourceType === 'conductor' ||
          task.sourceType === 'delegation'
        ? 'hermes'
        : task.sourceType === 'system'
          ? 'system'
          : 'manual'

  const workItemType: WorkItemType =
    task.workItemType ||
    (task.sourceType === 'finance'
      ? 'finance_event'
      : task.sourceType === 'approval'
        ? 'approval'
        : 'task')

  return {
    id: task.id,
    type: workItemType,
    title: task.title,
    description: task.description,
    status,
    priority: task.priority,
    assignedAgentId,
    source,
    sourceRecordId: task.sourceId,
    sourceSessionKey: task.sourceSessionKey || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    dueAt: task.dueDate ? new Date(task.dueDate).getTime() : null,
    metadata: task.metadata,
  }
}

export function upsertWorkItem(input: {
  id?: string
  title: string
  description?: string
  status?: WorkItemStatus
  priority?: TaskPriority
  assignee?: string | null
  sourceType?: TaskSourceType
  sourceId?: string | null
  sourceSessionKey?: string | null
  metadata?: Record<string, unknown>
  workItemType?: WorkItemType
}): WorkItem {
  const now = Date.now()
  const taskId = input.id || randomUUID()
  const status = input.status || 'waiting'
  const column = deriveTaskColumn(status)

  const existing = store.tasks[taskId]
  if (existing) {
    existing.title = input.title.trim()
    if (input.description !== undefined) existing.description = input.description.trim()
    existing.status = status
    existing.column = column
    if (input.priority !== undefined) existing.priority = input.priority
    if (input.assignee !== undefined) existing.assignee = input.assignee
    if (input.sourceType !== undefined) existing.sourceType = input.sourceType
    if (input.sourceId !== undefined) existing.sourceId = input.sourceId
    if (input.sourceSessionKey !== undefined) existing.sourceSessionKey = input.sourceSessionKey
    if (input.metadata !== undefined) existing.metadata = { ...existing.metadata, ...input.metadata }
    if (input.workItemType !== undefined) existing.workItemType = input.workItemType
    existing.updatedAt = now

    saveToDisk()
    const workItem = normalizeToWorkItem(existing)
    publishChatEvent('work_item.updated', { sessionKey: 'all', workItem })
    return workItem
  }

  const task: HermesTask = {
    id: taskId,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    column,
    status,
    workItemType: input.workItemType || (input.sourceType === 'finance' ? 'finance_event' : 'task'),
    priority: input.priority || 'medium',
    assignee: input.assignee ?? (input.sourceType === 'finance' ? 'ezity-accountant' : 'ezity-chief-of-staff'),
    tags: [],
    dueDate: null,
    position: now,
    sourceType: input.sourceType || 'system',
    sourceId: input.sourceId || null,
    sourceSessionKey: input.sourceSessionKey || null,
    metadata: input.metadata || {},
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  }

  store.tasks[task.id] = task
  saveToDisk()

  const workItem = normalizeToWorkItem(task)
  publishChatEvent('work_item.created', { sessionKey: 'all', workItem })
  return workItem
}

export function listWorkItems(filter?: {
  status?: WorkItemStatus
  assignee?: string
  sourceType?: TaskSourceType
}): WorkItem[] {
  let items = Object.values(store.tasks).map(normalizeToWorkItem)
  if (filter?.status) {
    items = items.filter((i) => i.status === filter.status)
  }
  if (filter?.assignee) {
    items = items.filter((i) => i.assignedAgentId === filter.assignee)
  }
  if (filter?.sourceType) {
    items = items.filter((i) => {
      const orig = store.tasks[i.id]
      return orig && orig.sourceType === filter.sourceType
    })
  }

  // Sort priority: needs_attention first, then in_progress, waiting, completed, dismissed
  const order: Record<WorkItemStatus, number> = {
    needs_attention: 1,
    in_progress: 2,
    waiting: 3,
    completed: 4,
    dismissed: 5,
  }

  return items.sort((a, b) => {
    const diff = (order[a.status] || 99) - (order[b.status] || 99)
    if (diff !== 0) return diff
    return b.updatedAt - a.updatedAt
  })
}

export function getWorkItemSummary(): WorkItemSummary {
  const items = Object.values(store.tasks).map(normalizeToWorkItem)
  const now = Date.now()
  const startOfDay = new Date().setHours(0, 0, 0, 0)

  let needsAttention = 0
  let inProgress = 0
  let waiting = 0
  let completedToday = 0

  for (const item of items) {
    if (item.status === 'needs_attention') {
      needsAttention++
    } else if (item.status === 'in_progress') {
      inProgress++
    } else if (item.status === 'waiting') {
      waiting++
    } else if (item.status === 'completed') {
      if (item.updatedAt >= startOfDay || (now - item.updatedAt) < 86_400_000) {
        completedToday++
      }
    }
  }

  return {
    needsAttention,
    inProgress,
    waiting,
    completedToday,
    total: items.length,
  }
}

export function clearTasksForTest(): void {
  store.tasks = {}
  saveToDisk()
}

export function registerApprovalWorkItem(approval: {
  approvalId: string
  sessionKey: string
  command?: string
  action?: string
  context?: string
  agentId?: string
}): WorkItem {
  return upsertWorkItem({
    id: `work_appr_${approval.approvalId}`,
    title: `Execution approval: ${approval.action || approval.command || 'Action required'}`,
    description:
      approval.context ||
      approval.command ||
      'Approval requested by agent before execution.',
    status: 'needs_attention',
    priority: 'high',
    assignee: approval.agentId || 'ezity-developer',
    sourceType: 'approval',
    sourceId: approval.approvalId,
    sourceSessionKey: approval.sessionKey,
    workItemType: 'approval',
    metadata: {
      approvalId: approval.approvalId,
      command: approval.command,
      action: approval.action,
    },
  })
}

export function updateApprovalWorkItem(
  approvalId: string,
  resolution: 'approved' | 'denied',
): WorkItem | null {
  const taskId = `work_appr_${approvalId}`
  const existing = store.tasks[taskId]
  if (!existing) return null

  return upsertWorkItem({
    id: taskId,
    title: existing.title,
    description: existing.description,
    status: resolution === 'approved' ? 'completed' : 'dismissed',
    priority: existing.priority,
    assignee: existing.assignee,
    sourceType: 'approval',
    sourceId: approvalId,
    sourceSessionKey: existing.sourceSessionKey || undefined,
    workItemType: 'approval',
    metadata: {
      ...existing.metadata,
      resolution,
      resolvedAt: Date.now(),
    },
  })
}
