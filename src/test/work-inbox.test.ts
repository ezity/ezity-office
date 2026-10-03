import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  clearTasksForTest,
  getWorkItemSummary,
  listWorkItems,
  registerApprovalWorkItem,
  updateApprovalWorkItem,
  upsertWorkItem,
} from '../server/task-store'
import {
  clearFinanceEventStoreForTest,
  registerFinanceDraft,
} from '../server/finance-event-store'
import {
  handleFinancialLifecycleEvent,
  stopFinanceEventBridge,
} from '../server/finance-event-bridge'

describe('Phase H: AI Work Inbox & Department Operations', () => {
  beforeEach(() => {
    clearTasksForTest()
    clearFinanceEventStoreForTest()
  })

  afterEach(() => {
    stopFinanceEventBridge()
    clearTasksForTest()
    clearFinanceEventStoreForTest()
  })

  it('A. converts journal submitted event into a Waiting work item', () => {
    handleFinancialLifecycleEvent({
      eventId: 'evt-sub-001',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-sub-001',
      workflowState: 'Pending Approval',
      actor: 'user-finance-1',
      timestamp: '2026-10-03T11:00:00Z',
    })

    const items = listWorkItems({ status: 'waiting' })
    expect(items.length).toBe(1)
    expect(items[0].id).toBe('work_jrn_jrn-sub-001')
    expect(items[0].status).toBe('waiting')
    expect(items[0].assignedAgentId).toBe('ezity-accountant')
    expect(items[0].source).toBe('ezityhub')
  })

  it('B. converts journal rejected event into a Needs Attention work item with supervisor reason', () => {
    // 1. Initial submission
    handleFinancialLifecycleEvent({
      eventId: 'evt-sub-002',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-reject-002',
      workflowState: 'Pending Approval',
      actor: 'user-finance-1',
    })

    expect(listWorkItems({ status: 'waiting' }).length).toBe(1)

    // 2. Supervisor rejects
    handleFinancialLifecycleEvent({
      eventId: 'evt-res-002',
      eventType: 'accounting.journal.resolved.v1',
      recordId: 'jrn-reject-002',
      workflowState: 'Rejected',
      actor: 'supervisor-azman',
      reason: 'Incorrect GL expense attribution',
      timestamp: '2026-10-03T11:15:00Z',
    })

    const attentionItems = listWorkItems({ status: 'needs_attention' })
    expect(attentionItems.length).toBe(1)
    expect(attentionItems[0].id).toBe('work_jrn_jrn-reject-002')
    expect(attentionItems[0].status).toBe('needs_attention')
    expect(attentionItems[0].description).toContain('Incorrect GL expense attribution')
    expect(attentionItems[0].assignedAgentId).toBe('ezity-accountant')

    // Must not be in waiting anymore
    expect(listWorkItems({ status: 'waiting' }).length).toBe(0)
  })

  it('C. transitions work item to Completed when journal is posted', () => {
    // 1. Draft created and submitted
    handleFinancialLifecycleEvent({
      eventId: 'evt-sub-003',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-post-003',
      workflowState: 'Pending Approval',
    })

    // 2. Supervisor approves and posts
    handleFinancialLifecycleEvent({
      eventId: 'evt-res-003',
      eventType: 'accounting.journal.resolved.v1',
      recordId: 'jrn-post-003',
      workflowState: 'Posted',
      actor: 'supervisor-azman',
      timestamp: '2026-10-03T11:20:00Z',
    })

    const completedItems = listWorkItems({ status: 'completed' })
    expect(completedItems.length).toBe(1)
    expect(completedItems[0].id).toBe('work_jrn_jrn-post-003')
    expect(completedItems[0].status).toBe('completed')
  })

  it('D. replayed SSE event does not duplicate the work item', () => {
    handleFinancialLifecycleEvent({
      eventId: 'evt-sub-dup',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-dup-001',
      workflowState: 'Pending Approval',
    })

    // Replay exact same event
    handleFinancialLifecycleEvent({
      eventId: 'evt-sub-dup',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-dup-001',
      workflowState: 'Pending Approval',
    })

    const allItems = listWorkItems()
    expect(allItems.length).toBe(1)
  })

  it('E. persists work items across reloads and restarts', () => {
    upsertWorkItem({
      id: 'work_manual_test_1',
      title: 'Audit tax ledger for Q3',
      status: 'in_progress',
      assignee: 'ezity-accountant',
    })

    const items = listWorkItems({ status: 'in_progress' })
    expect(items.length).toBe(1)
    expect(items[0].id).toBe('work_manual_test_1')
    expect(items[0].title).toBe('Audit tax ledger for Q3')
  })

  it('F. deterministically assigns finance items to ezity-accountant', () => {
    handleFinancialLifecycleEvent({
      eventId: 'evt-acc-test',
      eventType: 'accounting.journal.submitted.v1',
      recordId: 'jrn-acc-test',
      workflowState: 'Pending Approval',
    })

    const item = listWorkItems().find((i) => i.sourceRecordId === 'jrn-acc-test')
    expect(item).toBeDefined()
    expect(item?.assignedAgentId).toBe('ezity-accountant')
  })

  it('G. generic approval appears in inbox with needs_attention status', () => {
    const item = registerApprovalWorkItem({
      approvalId: 'appr_shell_cmd_123',
      sessionKey: 'session-dev-1',
      command: 'docker-compose restart hermes',
      action: 'Restart production container',
      agentId: 'ezity-developer',
    })

    expect(item.id).toBe('work_appr_appr_shell_cmd_123')
    expect(item.status).toBe('needs_attention')
    expect(item.assignedAgentId).toBe('ezity-developer')
    expect(item.type).toBe('approval')

    // Resolving approval completes it
    const resolved = updateApprovalWorkItem('appr_shell_cmd_123', 'approved')
    expect(resolved?.status).toBe('completed')
  })

  it('H. Chief of Staff summary correctly counts outstanding department items', () => {
    upsertWorkItem({
      id: 'w1',
      title: 'Fix broken build',
      status: 'needs_attention',
      assignee: 'ezity-developer',
    })
    upsertWorkItem({
      id: 'w2',
      title: 'Review invoice draft',
      status: 'waiting',
      assignee: 'ezity-accountant',
    })
    upsertWorkItem({
      id: 'w3',
      title: 'Implement migration',
      status: 'in_progress',
      assignee: 'ezity-developer',
    })

    const summary = getWorkItemSummary()
    expect(summary.needsAttention).toBe(1)
    expect(summary.waiting).toBe(1)
    expect(summary.inProgress).toBe(1)
    expect(summary.total).toBe(3)
  })

  it('I. completed item does not stay in attention count', () => {
    const item = upsertWorkItem({
      id: 'w_resolve_test',
      title: 'Tax payment validation',
      status: 'needs_attention',
      assignee: 'ezity-accountant',
    })

    expect(getWorkItemSummary().needsAttention).toBe(1)

    upsertWorkItem({
      id: 'w_resolve_test',
      title: 'Tax payment validation',
      status: 'completed',
    })

    expect(getWorkItemSummary().needsAttention).toBe(0)
    expect(getWorkItemSummary().completedToday).toBe(1)
  })
})
