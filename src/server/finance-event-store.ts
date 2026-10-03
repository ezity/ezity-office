/**
 * Finance Event Store — persistent store for EzityHub financial events and draft lifecycles.
 *
 * Persisted in .runtime/finance-events.json.
 * Survives Studio restart, provides bounded retention, and prevents duplicate event processing.
 * Never stores credentials or secrets.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), '.runtime')
const FILE_PATH = join(DATA_DIR, 'finance-events.json')

const MAX_PROCESSED_IDS = 1000
const MAX_EVENTS_HISTORY = 200

export type WorkflowState =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Posted'
  | 'Rejected'

export interface PersistedFinanceEvent {
  eventId: string
  eventType: string
  recordId: string
  workflowState: WorkflowState
  actor?: string | null
  reason?: string | null
  timestamp: string
  sessionKey?: string | null
  entryNumber?: string | null
}

export interface TrackedFinanceDraft {
  recordId: string
  type: 'journal' | 'invoice' | 'expense' | 'proposal'
  entryNumber?: string
  description?: string
  amount?: number
  sessionKey?: string
  workflowState: WorkflowState
  createdAt: string
  updatedAt: string
  actor?: string
  reason?: string | null
  idempotencyKey?: string
}

interface FinanceStoreData {
  lastEventId: string | null
  processedEventIds: string[]
  events: PersistedFinanceEvent[]
  drafts: Record<string, TrackedFinanceDraft>
}

let store: FinanceStoreData = {
  lastEventId: null,
  processedEventIds: [],
  events: [],
  drafts: {},
}

function loadFromDisk(): void {
  try {
    if (existsSync(FILE_PATH)) {
      const raw = readFileSync(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<FinanceStoreData>
      store = {
        lastEventId: typeof parsed.lastEventId === 'string' ? parsed.lastEventId : null,
        processedEventIds: Array.isArray(parsed.processedEventIds)
          ? parsed.processedEventIds.slice(-MAX_PROCESSED_IDS)
          : [],
        events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS_HISTORY) : [],
        drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
      }
    }
  } catch {
    // Start clean if file corrupt
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // Non-fatal disk write error
  }
}

// Initial load
loadFromDisk()

export function hasProcessedEvent(eventId: string): boolean {
  if (!eventId) return false
  return store.processedEventIds.includes(eventId)
}

export function getLastProcessedEventId(): string | null {
  return store.lastEventId
}

export function registerFinanceDraft(draft: {
  recordId: string
  type: 'journal' | 'invoice' | 'expense' | 'proposal'
  entryNumber?: string
  description?: string
  amount?: number
  sessionKey?: string
  workflowState?: WorkflowState
  idempotencyKey?: string
}): TrackedFinanceDraft {
  const existing = store.drafts[draft.recordId]
  const now = new Date().toISOString()

  const entry: TrackedFinanceDraft = {
    recordId: draft.recordId,
    type: draft.type,
    entryNumber: draft.entryNumber || existing?.entryNumber,
    description: draft.description || existing?.description,
    amount: draft.amount ?? existing?.amount,
    sessionKey: draft.sessionKey || existing?.sessionKey,
    workflowState: draft.workflowState || existing?.workflowState || 'Pending Approval',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    idempotencyKey: draft.idempotencyKey || existing?.idempotencyKey,
  }

  store.drafts[draft.recordId] = entry
  saveToDisk()
  return entry
}

export function getFinanceDraft(recordId: string): TrackedFinanceDraft | null {
  return store.drafts[recordId] || null
}

export function listFinanceDrafts(): TrackedFinanceDraft[] {
  return Object.values(store.drafts)
}

export function recordFinancialEvent(event: {
  eventId: string
  eventType: string
  recordId: string
  workflowState: WorkflowState
  actor?: string | null
  reason?: string | null
  timestamp?: string
  sessionKey?: string | null
  entryNumber?: string | null
}): { recorded: boolean; draftUpdated: boolean } {
  if (hasProcessedEvent(event.eventId)) {
    return { recorded: false, draftUpdated: false }
  }

  // Deduplication tracking
  store.processedEventIds.push(event.eventId)
  if (store.processedEventIds.length > MAX_PROCESSED_IDS) {
    store.processedEventIds.splice(0, store.processedEventIds.length - MAX_PROCESSED_IDS)
  }
  store.lastEventId = event.eventId

  // Correlate with tracked draft
  let draftUpdated = false
  const existingDraft = store.drafts[event.recordId]
  const associatedSessionKey = event.sessionKey || existingDraft?.sessionKey || null
  const associatedEntryNumber = event.entryNumber || existingDraft?.entryNumber || null

  if (existingDraft) {
    existingDraft.workflowState = event.workflowState
    existingDraft.updatedAt = event.timestamp || new Date().toISOString()
    if (event.actor) existingDraft.actor = event.actor
    if (event.reason) existingDraft.reason = event.reason
    draftUpdated = true
  }

  const persistedEvent: PersistedFinanceEvent = {
    eventId: event.eventId,
    eventType: event.eventType,
    recordId: event.recordId,
    workflowState: event.workflowState,
    actor: event.actor || null,
    reason: event.reason || null,
    timestamp: event.timestamp || new Date().toISOString(),
    sessionKey: associatedSessionKey,
    entryNumber: associatedEntryNumber,
  }

  store.events.push(persistedEvent)
  if (store.events.length > MAX_EVENTS_HISTORY) {
    store.events.splice(0, store.events.length - MAX_EVENTS_HISTORY)
  }

  saveToDisk()
  return { recorded: true, draftUpdated }
}

export function listRecentFinancialEvents(limit = 50): PersistedFinanceEvent[] {
  return store.events.slice(-limit).reverse()
}

export function flushFinanceEventStore(): void {
  saveToDisk()
}

export function reloadFinanceEventStore(): void {
  loadFromDisk()
}

export function clearFinanceEventStoreForTest(): void {
  store = {
    lastEventId: null,
    processedEventIds: [],
    events: [],
    drafts: {},
  }
  saveToDisk()
}
