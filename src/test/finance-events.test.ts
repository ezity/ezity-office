import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearFinanceEventStoreForTest,
  getFinanceDraft,
  hasProcessedEvent,
  listFinanceDrafts,
  listRecentFinancialEvents,
  recordFinancialEvent,
  registerFinanceDraft,
  reloadFinanceEventStore,
} from '../server/finance-event-store'
import {
  handleFinancialLifecycleEvent,
  startFinanceEventBridge,
  stopFinanceEventBridge,
  getBridgeStatus,
} from '../server/finance-event-bridge'
import { getAgent } from '../server/agent-definitions-store'

describe('Finance Event Store & Bridge (Phase G)', () => {
  beforeEach(() => {
    clearFinanceEventStoreForTest()
  })

  afterEach(() => {
    stopFinanceEventBridge()
    clearFinanceEventStoreForTest()
  })

  it('records financial events and maintains bounded deduplication (Requirement 14.B, 14.E)', () => {
    const res1 = recordFinancialEvent({
      eventId: 'evt-001',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-100',
      workflowState: 'Pending Approval',
      actor: 'user-1',
    })

    expect(res1.recorded).toBe(true)
    expect(hasProcessedEvent('evt-001')).toBe(true)

    // Re-recording the exact same event ID must be suppressed
    const res2 = recordFinancialEvent({
      eventId: 'evt-001',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-100',
      workflowState: 'Pending Approval',
      actor: 'user-1',
    })

    expect(res2.recorded).toBe(false)
  })

  it('correlates incoming supervisor decision event with existing draft (Requirement 14.H, 14.G)', () => {
    // 1. Accountant prepares draft journal in session 'session-chat-99'
    registerFinanceDraft({
      recordId: 'jrn-abc',
      type: 'journal',
      entryNumber: 'JRN-2026-089',
      description: 'Domain renewal RM89',
      amount: 89.0,
      sessionKey: 'session-chat-99',
      workflowState: 'Pending Approval',
    })

    const initial = getFinanceDraft('jrn-abc')
    expect(initial?.workflowState).toBe('Pending Approval')
    expect(initial?.sessionKey).toBe('session-chat-99')

    // 2. Authoritative EzityHub event arrives: supervisor approves and posts
    handleFinancialLifecycleEvent({
      eventId: 'evt-approve-01',
      eventType: 'accounting.journal.resolved.v1',
      recordId: 'jrn-abc',
      workflowState: 'Posted',
      actor: 'supervisor-azman',
      reason: 'Confirmed bank debit of RM89',
      timestamp: '2026-10-03T10:30:00Z',
    })

    // 3. Draft must transition authoritatively to Posted
    const updated = getFinanceDraft('jrn-abc')
    expect(updated).not.toBeNull()
    expect(updated?.workflowState).toBe('Posted')
    expect(updated?.actor).toBe('supervisor-azman')
    expect(updated?.reason).toBe('Confirmed bank debit of RM89')
    expect(updated?.sessionKey).toBe('session-chat-99')

    // 4. Check recent events list
    const recentEvents = listRecentFinancialEvents(10)
    expect(recentEvents.length).toBe(1)
    expect(recentEvents[0].workflowState).toBe('Posted')
    expect(recentEvents[0].entryNumber).toBe('JRN-2026-089')
  })

  it('correlates rejected journal event with supervisor reason (Requirement 14.F)', () => {
    registerFinanceDraft({
      recordId: 'jrn-reject-test',
      type: 'journal',
      entryNumber: 'JRN-2026-090',
      description: 'Consultancy fee draft',
      workflowState: 'Pending Approval',
    })

    handleFinancialLifecycleEvent({
      eventId: 'evt-reject-01',
      eventType: 'accounting.journal.resolved.v1',
      recordId: 'jrn-reject-test',
      workflowState: 'Rejected',
      actor: 'supervisor-azman',
      reason: 'Missing tax invoice attachment',
      timestamp: '2026-10-03T10:35:00Z',
    })

    const draft = getFinanceDraft('jrn-reject-test')
    expect(draft?.workflowState).toBe('Rejected')
    expect(draft?.reason).toBe('Missing tax invoice attachment')
  })

  it('persists drafts and events across server reloads (Requirement 14.K)', () => {
    registerFinanceDraft({
      recordId: 'jrn-survive-restart',
      type: 'journal',
      entryNumber: 'JRN-RESTART-1',
      workflowState: 'Pending Approval',
    })

    recordFinancialEvent({
      eventId: 'evt-restart-test',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-survive-restart',
      workflowState: 'Pending Approval',
    })

    // Simulate process cold restart
    reloadFinanceEventStore()

    expect(hasProcessedEvent('evt-restart-test')).toBe(true)
    const draft = getFinanceDraft('jrn-survive-restart')
    expect(draft).not.toBeNull()
    expect(draft?.entryNumber).toBe('JRN-RESTART-1')
  })

  it('ezity-accountant system prompt enforces authoritative Phase G event lifecycle rules', () => {
    const accountant = getAgent('ezity-accountant')
    expect(accountant).toBeDefined()
    expect(accountant?.systemPrompt).toContain('Authoritative Event Stream & Lifecycle (Phase G)')
    expect(accountant?.systemPrompt).toContain('CRITICAL RULE: You must NEVER infer or assume that a draft was approved or posted')
    expect(accountant?.systemPrompt).toContain('Only transition a draft\'s status to [Posted] or [Rejected] when confirmed')
  })
})
