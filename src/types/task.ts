/**
 * Task types — Kanban board task management.
 */

export type TaskColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskSourceType =
  | 'manual'
  | 'conductor'
  | 'crew'
  | 'finance'
  | 'approval'
  | 'system'
  | 'delegation'

export type WorkItemStatus =
  | 'needs_attention'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'dismissed'

export type WorkItemType = 'finance_event' | 'approval' | 'task' | 'failure'

export interface HermesTask {
  id: string
  title: string
  description: string
  column: TaskColumn
  status?: WorkItemStatus
  workItemType?: WorkItemType
  priority: TaskPriority
  assignee: string | null
  tags: Array<string>
  dueDate: string | null
  position: number
  sourceType: TaskSourceType
  sourceId: string | null
  sourceSessionKey?: string | null
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface WorkItem {
  id: string
  type: WorkItemType
  title: string
  description: string
  status: WorkItemStatus
  priority: TaskPriority
  assignedAgentId: string
  source: 'ezityhub' | 'hermes' | 'system' | 'manual'
  sourceRecordId?: string | null
  sourceSessionKey?: string | null
  createdAt: number
  updatedAt: number
  dueAt?: number | null
  metadata?: Record<string, unknown>
}

export interface WorkItemSummary {
  needsAttention: number
  inProgress: number
  waiting: number
  completedToday: number
  total: number
}

export interface CreateTaskInput {
  title: string
  description?: string
  column?: TaskColumn
  status?: WorkItemStatus
  workItemType?: WorkItemType
  priority?: TaskPriority
  assignee?: string | null
  tags?: Array<string>
  dueDate?: string | null
  sourceType?: TaskSourceType
  sourceId?: string | null
  sourceSessionKey?: string | null
  metadata?: Record<string, unknown>
  createdBy?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  column?: TaskColumn
  status?: WorkItemStatus
  workItemType?: WorkItemType
  priority?: TaskPriority
  assignee?: string | null
  tags?: Array<string>
  dueDate?: string | null
  sourceSessionKey?: string | null
  metadata?: Record<string, unknown>
  position?: number
}

export const TASK_COLUMNS: ReadonlyArray<TaskColumn> = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
] as const

export const TASK_COLUMN_LABELS: Record<TaskColumn, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  needs_attention: 'Needs Attention',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  completed: 'Completed',
  dismissed: 'Dismissed',
}
