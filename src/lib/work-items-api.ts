import type {
  TaskPriority,
  TaskSourceType,
  WorkItem,
  WorkItemStatus,
  WorkItemSummary,
} from '@/types/task'

export interface WorkItemFilter {
  status?: WorkItemStatus
  assignee?: string
  sourceType?: TaskSourceType
}

export async function fetchWorkItems(
  filter?: WorkItemFilter,
): Promise<{ items: WorkItem[]; summary: WorkItemSummary }> {
  const params = new URLSearchParams()
  if (filter?.status) params.set('status', filter.status)
  if (filter?.assignee) params.set('assignee', filter.assignee)
  if (filter?.sourceType) params.set('sourceType', filter.sourceType)

  const qs = params.toString()
  const res = await fetch(`/api/work-items${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    throw new Error('Failed to fetch work items')
  }

  const data = (await res.json()) as {
    success: boolean
    items: WorkItem[]
    summary: WorkItemSummary
  }

  return {
    items: data.items ?? [],
    summary: data.summary ?? {
      needsAttention: 0,
      inProgress: 0,
      waiting: 0,
      completedToday: 0,
      total: 0,
    },
  }
}

export async function updateWorkItemStatus(
  id: string,
  status: WorkItemStatus,
): Promise<WorkItem> {
  const res = await fetch('/api/work-items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  })

  if (!res.ok) {
    throw new Error('Failed to update work item status')
  }

  const data = (await res.json()) as { success: boolean; item: WorkItem }
  return data.item
}

export async function createWorkItem(input: {
  title: string
  description?: string
  status?: WorkItemStatus
  priority?: TaskPriority
  assignee?: string | null
  sourceType?: TaskSourceType
  sourceId?: string | null
  sourceSessionKey?: string | null
  metadata?: Record<string, unknown>
}): Promise<WorkItem> {
  const res = await fetch('/api/work-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error('Failed to create work item')
  }

  const data = (await res.json()) as { success: boolean; item: WorkItem }
  return data.item
}
