import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearDailyBriefingsForTest,
  getDailyBriefing,
  getDailyBriefingByDate,
  getLatestDailyBriefing,
} from '../server/daily-brief-store'
import { generateDailyBrief } from '../server/daily-brief-service'
import {
  clearTasksForTest,
  registerApprovalWorkItem,
  upsertWorkItem,
} from '../server/task-store'
import {
  clearFinanceEventStoreForTest,
  registerFinanceDraft,
} from '../server/finance-event-store'
import { EzityHubClient } from '../../packages/ezityhub-mcp/src/client'

describe('Phase I: Daily Chief of Staff Briefing', () => {
  beforeEach(() => {
    clearDailyBriefingsForTest()
    clearTasksForTest()
    clearFinanceEventStoreForTest()
  })

  afterEach(() => {
    clearDailyBriefingsForTest()
    clearTasksForTest()
    clearFinanceEventStoreForTest()
  })

  it('A. scheduled daily brief creation produces standard briefing sections', async () => {
    // Seed an item in Work Inbox
    upsertWorkItem({
      id: 'work-test-1',
      title: 'Review quarterly revenue numbers',
      status: 'in_progress',
      assignee: 'ezity-chief-of-staff',
    })

    const brief = await generateDailyBrief({
      isManual: false,
      timezone: 'Asia/Kuala_Lumpur',
      date: new Date('2026-10-03T08:00:00+08:00'),
    })

    expect(brief).toBeDefined()
    expect(brief.id).toBe('brief_scheduled_2026-10-03')
    expect(brief.isManual).toBe(false)
    expect(brief.periodCovered).toBe('2026-10-03')
    expect(brief.title).toContain('Ezity Daily Brief — 2026-10-03')

    // Standard markdown structure
    expect(brief.markdown).toContain('# Ezity Daily Brief')
    expect(brief.markdown).toContain('## Needs Your Attention')
    expect(brief.markdown).toContain('## Finance')
    expect(brief.markdown).toContain('## Engineering')
    expect(brief.markdown).toContain('## Operations')
    expect(brief.markdown).toContain('## Yesterday')
    expect(brief.markdown).toContain('## Today')

    // Saved to store
    const stored = getDailyBriefing(brief.id)
    expect(stored).not.toBeNull()
    expect(stored?.id).toBe(brief.id)
  })

  it('B. manual generation creates a distinct manual briefing', async () => {
    const brief = await generateDailyBrief({
      isManual: true,
      timezone: 'Asia/Kuala_Lumpur',
      date: new Date('2026-10-03T14:30:00+08:00'),
    })

    expect(brief.id).toMatch(/^brief_manual_/)
    expect(brief.isManual).toBe(true)
    expect(brief.jobId).toBe('manual')
    expect(brief.markdown).toContain('Manual Run')
  })

  it('C. aggregates Work Inbox status counts correctly', async () => {
    // 1 needs_attention, 2 waiting, 1 in_progress, 1 completed
    upsertWorkItem({
      id: 'task-att-1',
      title: 'Fix broken API route',
      status: 'needs_attention',
      priority: 'urgent',
      assignee: 'ezity-developer',
    })
    upsertWorkItem({
      id: 'task-wait-1',
      title: 'Invoice INV-001 awaiting payment',
      status: 'waiting',
      assignee: 'ezity-accountant',
    })
    upsertWorkItem({
      id: 'task-wait-2',
      title: 'Draft JRN-002 awaiting supervisor review',
      status: 'waiting',
      assignee: 'ezity-accountant',
    })
    upsertWorkItem({
      id: 'task-prog-1',
      title: 'Refactor auth middleware',
      status: 'in_progress',
      assignee: 'ezity-developer',
    })

    const brief = await generateDailyBrief({
      isManual: true,
      timezone: 'Asia/Kuala_Lumpur',
    })

    expect(brief.sourceSummaryCounts.needsAttentionCount).toBe(1)
    expect(brief.sourceSummaryCounts.waitingCount).toBe(2)
    expect(brief.sourceSummaryCounts.inProgressCount).toBe(1)
    expect(brief.urgentWorkItemIds).toContain('task-att-1')
    expect(brief.markdown).toContain('Fix broken API route')
  })

  it('D. aggregates real finance telemetry from EzityHub client', async () => {
    // Mock EzityHub client
    const mockClient = {
      listBankAccounts: vi.fn().mockResolvedValue({
        success: true,
        count: 2,
        bank_accounts: [
          { name: 'Maybank Operating', current_balance: 120500.5, currency: 'MYR' },
          { name: 'CIMB Payroll', current_balance: 45000.0, currency: 'MYR' },
        ],
      }),
      getProfitAndLoss: vi.fn().mockResolvedValue({
        success: true,
        statement: {
          total_income: 88000,
          total_expense: 52000,
          net_income: 36000,
        },
      }),
      getArAgeing: vi.fn().mockResolvedValue({
        success: true,
        count: 1,
        ageing: [{ invoice_number: 'INV-2026-08', amount_due: 4500, days_overdue: 14 }],
      }),
    } as unknown as EzityHubClient

    // Also register a rejected draft in finance event store
    registerFinanceDraft({
      recordId: 'jrn-draft-99',
      entryNumber: 'JRN-2026-99',
      type: 'journal',
      workflowState: 'Rejected',
    })

    const brief = await generateDailyBrief({
      isManual: true,
      timezone: 'Asia/Kuala_Lumpur',
      customClient: mockClient,
    })

    expect(brief.sources.finance.success).toBe(true)
    expect(brief.sourceSummaryCounts.totalCashBalance).toBeCloseTo(165500.5, 1)
    expect(brief.markdown).toContain('Maybank Operating: MYR 120,500.50')
    expect(brief.markdown).toContain('CIMB Payroll: MYR 45,000.00')
    expect(brief.markdown).toContain('Revenue: MYR 88,000')
    expect(brief.markdown).toContain('Net Income: MYR 36,000')
    expect(brief.markdown).toContain('1 overdue invoice(s)')
  })

  it('E. handles partial source failure gracefully without failing the entire briefing', async () => {
    // Mock client that throws timeout error
    const failingClient = {
      listBankAccounts: vi.fn().mockRejectedValue(new Error('Connection timed out after 5000ms')),
      getProfitAndLoss: vi.fn().mockRejectedValue(new Error('Gateway timeout')),
      getArAgeing: vi.fn().mockRejectedValue(new Error('Gateway timeout')),
    } as unknown as EzityHubClient

    const brief = await generateDailyBrief({
      isManual: true,
      timezone: 'Asia/Kuala_Lumpur',
      customClient: failingClient,
    })

    expect(brief).toBeDefined()
    expect(brief.sources.finance.success).toBe(false)
    expect(brief.markdown).toContain('Finance live telemetry unavailable')
    // Other sections must still be present and intact
    expect(brief.markdown).toContain('## Engineering')
    expect(brief.markdown).toContain('## Operations')
    expect(brief.markdown).toContain('## Today')
  })

  it('F. handles timezones properly for date period calculation', async () => {
    // 2026-10-03 01:00 UTC is 2026-10-03 09:00 in Asia/Kuala_Lumpur (+8)
    const testDate = new Date('2026-10-03T01:00:00Z')

    const klBrief = await generateDailyBrief({
      isManual: false,
      timezone: 'Asia/Kuala_Lumpur',
      date: testDate,
    })
    expect(klBrief.periodCovered).toBe('2026-10-03')
    expect(klBrief.timezone).toBe('Asia/Kuala_Lumpur')

    // Same moment in Pacific/Honolulu (-10) is 2026-10-02 15:00
    const hnlBrief = await generateDailyBrief({
      isManual: false,
      timezone: 'Pacific/Honolulu',
      date: testDate,
      force: true,
    })
    expect(hnlBrief.periodCovered).toBe('2026-10-02')
    expect(hnlBrief.timezone).toBe('Pacific/Honolulu')
  })

  it('G. prevents duplicate scheduled runs for the same date period', async () => {
    const date = new Date('2026-10-03T08:00:00+08:00')

    const firstRun = await generateDailyBrief({
      isManual: false,
      timezone: 'Asia/Kuala_Lumpur',
      date,
    })

    const secondRun = await generateDailyBrief({
      isManual: false,
      timezone: 'Asia/Kuala_Lumpur',
      date,
    })

    // Must return the exact same instance without creating another briefing
    expect(secondRun.id).toBe(firstRun.id)
    expect(secondRun.generatedAt).toBe(firstRun.generatedAt)
  })

  it('H. uses Chief of Staff identity with correct persona, role, and emoji', async () => {
    const brief = await generateDailyBrief({
      isManual: true,
    })

    expect(brief.agentDefinitionId).toBe('ezity-chief-of-staff')
    expect(brief.agentName).toBe('En.Hafiz')
    expect(brief.agentEmoji).toBe('👔')
    expect(brief.markdown).toContain('En.Hafiz')
    expect(brief.markdown).toContain('👔')
  })

  it('I. surfaces pending approvals in Operations and Needs Attention', async () => {
    registerApprovalWorkItem({
      approvalId: 'appr-exec-55',
      sessionKey: 'worker-developer-1',
      command: 'npm run deploy:staging',
      action: 'Deploy Staging Bundle',
      context: 'Developer requesting dangerous deployment command approval',
    })

    const brief = await generateDailyBrief({
      isManual: true,
    })

    expect(brief.sourceSummaryCounts.pendingApprovalsCount).toBe(1)
    expect(brief.sourceSummaryCounts.needsAttentionCount).toBeGreaterThanOrEqual(1)
    expect(brief.markdown).toContain('Deploy Staging Bundle')
    expect(brief.markdown).toContain('Execution approval')
  })
})
