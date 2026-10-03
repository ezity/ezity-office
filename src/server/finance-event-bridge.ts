/**
 * Finance Event Bridge — Server-side SSE bridge connecting EzityHub's agent
 * event stream to Hermes Studio event bus and financial lifecycle store.
 *
 * Requirements:
 * - Server-side only: never expose EZITYHUB_API_TOKEN to frontend code.
 * - Authoritative lifecycle updates: updates draft state on EzityHub event confirmation.
 * - Broadcasts notifications to Studio UI via publishChatEvent.
 * - Survives Vite HMR via globalThis.
 */

import { EzityHubEventSubscriber } from '../../packages/ezityhub-mcp/src/events'
import type {
  CorrelatedFinancialLifecycleEvent,
  EzityHubConnectedData,
} from '../../packages/ezityhub-mcp/src/types'
import { publishChatEvent } from './chat-event-bus'
import {
  getLastProcessedEventId,
  hasProcessedEvent,
  recordFinancialEvent,
  getFinanceDraft,
  registerFinanceDraft,
  type TrackedFinanceDraft,
} from './finance-event-store'
import { upsertWorkItem } from './task-store'
import type { TaskPriority, WorkItemStatus } from '../types/task'

const BRIDGE_KEY = '__hermes_finance_event_bridge__' as const

export interface BridgeStatus {
  running: boolean
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  connectedOrgId: string | null
  lastEventId: string | null
  lastConnectedAt: string | null
  apiUrl: string
}

interface BridgeState {
  subscriber: EzityHubEventSubscriber | null
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  lastConnectedAt: string | null
  connectedOrgId: string | null
}

function getBridgeState(): BridgeState {
  if (!(globalThis as any)[BRIDGE_KEY]) {
    ;(globalThis as any)[BRIDGE_KEY] = {
      subscriber: null,
      status: 'disconnected',
      lastConnectedAt: null,
      connectedOrgId: null,
    }
  }
  return (globalThis as any)[BRIDGE_KEY]
}

export function handleFinancialLifecycleEvent(
  event: CorrelatedFinancialLifecycleEvent,
): void {
  const existingDraft = getFinanceDraft(event.recordId)
  const sessionKey = existingDraft?.sessionKey || undefined
  const entryNumber = existingDraft?.entryNumber || undefined

  const { recorded, draftUpdated } = recordFinancialEvent({
    eventId: event.eventId,
    eventType: event.eventType,
    recordId: event.recordId,
    workflowState: event.workflowState,
    actor: event.actor,
    reason: event.reason,
    timestamp: event.timestamp,
    sessionKey,
    entryNumber,
  })

  if (!recorded) {
    // Duplicate event already processed — safe suppression
    return
  }

  const updatedDraft = getFinanceDraft(event.recordId)

  // Format activity notification text
  let icon = '📊'
  let actionText = 'updated'
  if (event.workflowState === 'Posted') {
    icon = '📊'
    actionText = 'was posted'
  } else if (event.workflowState === 'Approved') {
    icon = '📊'
    actionText = 'was approved'
  } else if (event.workflowState === 'Rejected') {
    icon = '⚠️'
    actionText = 'was rejected'
  } else if (event.workflowState === 'Pending Approval') {
    icon = '📝'
    actionText = 'submitted for review'
  }

  const recordLabel = entryNumber || `jrn_${event.recordId.slice(0, 8)}`
  const title = `${icon} Journal ${recordLabel} ${actionText}`
  const reasonText = event.reason ? ` (${event.reason})` : ''

  console.log(
    `[FINANCE_AUDIT] Event ID: ${event.eventId} | Type: ${event.eventType} | Record: ${event.recordId} | State: ${event.workflowState} | Actor: ${event.actor || 'system'} | Correlated Draft: ${draftUpdated ? 'yes' : 'no'}`,
  )

  // Map authoritative event to Work Inbox item (Phase H)
  const workItemId = `work_jrn_${event.recordId}`
  let workItemStatus: WorkItemStatus = 'waiting'
  let workItemTitle = `Journal ${recordLabel} awaiting supervisor review`
  let workItemDesc = 'Draft journal awaiting review in EzityHub by supervisor.'
  let workItemPriority: TaskPriority = 'medium'

  if (event.workflowState === 'Rejected') {
    workItemStatus = 'needs_attention'
    workItemPriority = 'high'
    workItemTitle = `Journal ${recordLabel} rejected by supervisor`
    workItemDesc = `Supervisor rejected draft journal${event.reason ? ': ' + event.reason : ''}. Review entry details.`
  } else if (event.workflowState === 'Posted' || event.workflowState === 'Approved') {
    workItemStatus = 'completed'
    workItemPriority = 'medium'
    workItemTitle = `Journal ${recordLabel} posted to ledger`
    workItemDesc = 'Supervisor approved and posted journal to EzityHub general ledger.'
  }

  upsertWorkItem({
    id: workItemId,
    title: workItemTitle,
    description: workItemDesc,
    status: workItemStatus,
    priority: workItemPriority,
    assignee: 'ezity-accountant',
    sourceType: 'finance',
    sourceId: event.recordId,
    sourceSessionKey: sessionKey,
    workItemType: 'finance_event',
    metadata: {
      eventId: event.eventId,
      eventType: event.eventType,
      entryNumber: recordLabel,
      workflowState: event.workflowState,
      actor: event.actor,
      reason: event.reason,
    },
  })

  // Broadcast financial lifecycle update to chat-event-bus
  publishChatEvent('finance.lifecycle', {
    eventId: event.eventId,
    eventType: event.eventType,
    recordId: event.recordId,
    workflowState: event.workflowState,
    actor: event.actor || null,
    reason: event.reason || null,
    timestamp: event.timestamp,
    sessionKey: sessionKey || null,
    entryNumber: recordLabel,
    draft: updatedDraft || null,
  })

  // Broadcast activity notice for UI header / pills / toasts
  publishChatEvent('activity', {
    type: 'finance',
    title: `${title}${reasonText}`,
    timestamp: Date.now(),
    recordId: event.recordId,
    workflowState: event.workflowState,
    sessionKey: sessionKey || null,
  })
}

export function startFinanceEventBridge(customOptions?: {
  apiUrl?: string
  apiToken?: string
  organizationId?: string
  fetchFn?: typeof fetch
}): void {
  const state = getBridgeState()
  if (state.subscriber?.isRunning()) {
    return
  }

  const apiUrl =
    customOptions?.apiUrl ||
    process.env.EZITYHUB_API_URL ||
    'http://localhost:3000'
  const apiToken = customOptions?.apiToken || process.env.EZITYHUB_API_TOKEN
  const expectedOrgId =
    customOptions?.organizationId || process.env.EZITYHUB_ORGANIZATION_ID

  if (!apiToken) {
    console.log(
      '[FINANCE_EVENT_BRIDGE] EZITYHUB_API_TOKEN not configured. Event bridge is idle.',
    )
    return
  }

  const lastEventId = getLastProcessedEventId() || undefined

  const subscriber = new EzityHubEventSubscriber({
    apiUrl,
    apiToken,
    expectedOrgId,
    lastEventId,
    fetchFn: customOptions?.fetchFn,
    onStatusChange: (status) => {
      state.status = status
    },
    onConnected: (info: EzityHubConnectedData) => {
      state.status = 'connected'
      state.lastConnectedAt = new Date().toISOString()
      state.connectedOrgId = info.agent?.organization_id || null
      console.log(
        `[FINANCE_EVENT_BRIDGE] Connected to EzityHub SSE: org=${info.agent?.organization_id} agent=${info.agent?.name}`,
      )
    },
    onEvent: (event: CorrelatedFinancialLifecycleEvent) => {
      handleFinancialLifecycleEvent(event)
    },
    onError: (err: Error) => {
      console.warn(`[FINANCE_EVENT_BRIDGE] Stream error: ${err.message}`)
    },
  })

  state.subscriber = subscriber
  subscriber.start()
}

export function stopFinanceEventBridge(): void {
  const state = getBridgeState()
  if (state.subscriber) {
    state.subscriber.stop()
    state.subscriber = null
  }
  state.status = 'disconnected'
}

export function getBridgeStatus(): BridgeStatus {
  const state = getBridgeState()
  const apiUrl = process.env.EZITYHUB_API_URL || 'http://localhost:3000'

  return {
    running: state.subscriber ? state.subscriber.isRunning() : false,
    status: state.status,
    connectedOrgId: state.connectedOrgId,
    lastEventId: state.subscriber?.getLastEventId() || getLastProcessedEventId(),
    lastConnectedAt: state.lastConnectedAt,
    apiUrl,
  }
}

export function correlateFinanceDraft(draft: {
  recordId: string
  type: 'journal' | 'invoice' | 'expense' | 'proposal'
  entryNumber?: string
  description?: string
  amount?: number
  sessionKey?: string
  workflowState?: 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Rejected'
  idempotencyKey?: string
}): TrackedFinanceDraft {
  const registered = registerFinanceDraft(draft)
  const recordLabel = registered.entryNumber || `jrn_${registered.recordId.slice(0, 8)}`

  // Register in Work Inbox as waiting
  upsertWorkItem({
    id: `work_${registered.type}_${registered.recordId}`,
    title: `Journal ${recordLabel} awaiting supervisor review`,
    description: registered.description || 'Draft journal prepared and submitted to EzityHub supervisor review queue.',
    status: 'waiting',
    priority: 'medium',
    assignee: 'ezity-accountant',
    sourceType: 'finance',
    sourceId: registered.recordId,
    sourceSessionKey: registered.sessionKey,
    workItemType: 'finance_event',
    metadata: {
      entryNumber: recordLabel,
      workflowState: registered.workflowState,
      amount: registered.amount,
      idempotencyKey: registered.idempotencyKey,
    },
  })

  console.log(
    `[FINANCE_AUDIT] Correlated draft registered: recordId=${registered.recordId} entryNumber=${registered.entryNumber} state=${registered.workflowState} sessionKey=${registered.sessionKey}`,
  )
  return registered
}
