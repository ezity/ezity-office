/**
 * Daily Brief Service — Pipeline for generating and scheduling Chief of Staff executive briefings.
 *
 * Requirements:
 * - Deterministic, non-hallucinatory facts derived from real data sources.
 * - Fault-tolerant: if one source fails (e.g. EzityHub offline), other sections still render with clear notice.
 * - Single pipeline shared by scheduled morning runs and manual on-demand triggers.
 * - Deduplication: only one scheduled daily brief per date period.
 * - Reuses Hermes jobs/cron infrastructure.
 */

import { getAgent } from './agent-definitions-store'
import {
  getDailyBriefingByDate,
  getDailyBriefSettings,
  saveDailyBriefing,
  updateDailyBriefSettings,
} from './daily-brief-store'
import { listWorkItems } from './task-store'
import { listFinanceDrafts } from './finance-event-store'
import { EzityHubClient } from '../../packages/ezityhub-mcp/src/client'
import {
  HERMES_API,
  ensureGatewayProbed,
  getCapabilities,
} from './gateway-capabilities'
import type {
  BriefingSourceSummaryCounts,
  DailyBriefing,
  SourceStatus,
} from '../types/daily-brief'
import type { WorkItem } from '../types/task'

function formatDateKey(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(date) // Returns YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function formatDisplayDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

async function resolveOrganizationTimezone(): Promise<string> {
  // 1. Prefer EzityHub /api/v1/agent/me if available
  const apiUrl = process.env.EZITYHUB_API_URL || 'http://localhost:3000'
  const apiToken = process.env.EZITYHUB_API_TOKEN

  if (apiToken) {
    try {
      const client = new EzityHubClient({
        apiUrl,
        apiToken,
        timeoutMs: 3000,
      })
      const me = await client.getMe('briefing_timezone_lookup')
      if (me?.agent?.timezone) return me.agent.timezone
      if (me?.agent?.organization?.timezone) return me.agent.organization.timezone
    } catch {
      // Ignore network failure, fall back to environment or stored settings
    }
  }

  // 2. Check environment variables
  if (process.env.EZITY_ORGANIZATION_TIMEZONE) {
    return process.env.EZITY_ORGANIZATION_TIMEZONE
  }
  if (process.env.TZ) {
    return process.env.TZ
  }

  // 3. Check stored settings
  const settings = getDailyBriefSettings()
  if (settings.timezone) {
    return settings.timezone
  }

  // 4. Fallback default
  return 'Asia/Kuala_Lumpur'
}

export async function generateDailyBrief(options?: {
  isManual?: boolean
  force?: boolean
  timezone?: string
  date?: Date
  customClient?: EzityHubClient
}): Promise<DailyBriefing> {
  const isManual = options?.isManual ?? false
  const force = options?.force ?? false
  const now = options?.date || new Date()

  // Resolve Timezone
  const timezone = options?.timezone || (await resolveOrganizationTimezone())
  const periodCovered = formatDateKey(now, timezone)

  // Deduplication check for scheduled runs
  if (!isManual && !force) {
    const existing = getDailyBriefingByDate(periodCovered, false)
    if (existing) {
      return existing
    }
  }

  // Resolve Chief of Staff
  const cosAgent = getAgent('ezity-chief-of-staff')
  const agentDefinitionId = cosAgent?.id || 'ezity-chief-of-staff'
  const agentName = cosAgent?.name || 'Chief of Staff'
  const agentEmoji = cosAgent?.emoji || '👔'

  // Source 1: Work Inbox Data
  let workInboxStatus: SourceStatus = { success: false, count: 0 }
  let allWorkItems: WorkItem[] = []
  let needsAttentionItems: WorkItem[] = []
  let waitingItems: WorkItem[] = []
  let inProgressItems: WorkItem[] = []
  let completedYesterdayItems: WorkItem[] = []

  try {
    allWorkItems = listWorkItems()
    workInboxStatus = { success: true, count: allWorkItems.length }

    needsAttentionItems = allWorkItems.filter((i) => i.status === 'needs_attention')
    waitingItems = allWorkItems.filter((i) => i.status === 'waiting')
    inProgressItems = allWorkItems.filter((i) => i.status === 'in_progress')

    // Items completed in the last 24-36h / yesterday
    const oneDayAgoMs = now.getTime() - 86_400_000
    completedYesterdayItems = allWorkItems.filter(
      (i) => i.status === 'completed' && i.updatedAt >= oneDayAgoMs,
    )
  } catch (err: any) {
    workInboxStatus = {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Source 2: Finance Data
  let financeStatus: SourceStatus = { success: false, count: 0 }
  let bankAccounts: Array<{ name: string; balance: number; currency: string }> = []
  let totalCash = 0
  let currency = 'MYR'
  let pnlSummary: { revenue: number; expenses: number; netIncome: number } | null = null
  let overdueReceivables: { count: number; totalAmount: number; currency: string } | null = null
  let pendingJournals: any[] = []
  let rejectedJournals: any[] = []

  // Check local authoritative tracked finance drafts first
  try {
    const drafts = listFinanceDrafts()
    pendingJournals = drafts.filter((d) => d.workflowState === 'Pending Approval')
    rejectedJournals = drafts.filter((d) => d.workflowState === 'Rejected')
  } catch {
    // Non-fatal
  }

  // Attempt live EzityHub query
  const apiUrl = process.env.EZITYHUB_API_URL || 'http://localhost:3000'
  const apiToken = process.env.EZITYHUB_API_TOKEN

  if (options?.customClient || apiToken) {
    try {
      const client =
        options?.customClient ||
        new EzityHubClient({
          apiUrl,
          apiToken: apiToken!,
          timeoutMs: 5000,
        })

      let hasLiveSuccess = false
      let liveError: string | null = null

      // Query bank accounts (cash position)
      try {
        const bankRes = await client.listBankAccounts('briefing_cash_position')
        if (bankRes?.bank_accounts && Array.isArray(bankRes.bank_accounts)) {
          bankAccounts = bankRes.bank_accounts.map((b: any) => ({
            name: b.name || b.bank_name || 'Bank Account',
            balance: Number(b.current_balance ?? b.balance ?? 0),
            currency: b.currency || 'MYR',
          }))
          totalCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0)
          if (bankAccounts.length > 0) currency = bankAccounts[0].currency
          hasLiveSuccess = true
        }
      } catch (err: any) {
        liveError = err instanceof Error ? err.message : String(err)
      }

      // Query P&L statement
      try {
        const pnlRes = await client.getProfitAndLoss({}, 'briefing_pnl')
        if (pnlRes?.statement) {
          const stmt = pnlRes.statement
          pnlSummary = {
            revenue: Number(stmt.total_income ?? stmt.revenue ?? 0),
            expenses: Number(stmt.total_expense ?? stmt.expenses ?? 0),
            netIncome: Number(stmt.net_income ?? stmt.net_profit ?? 0),
          }
          hasLiveSuccess = true
        }
      } catch (err: any) {
        if (!liveError) liveError = err instanceof Error ? err.message : String(err)
      }

      // Query Overdue Receivables
      try {
        const arRes = await client.getArAgeing({}, 'briefing_ar_ageing')
        if (arRes?.ageing && Array.isArray(arRes.ageing)) {
          const overdue = arRes.ageing.filter((item: any) => (item.days_overdue ?? 0) > 0)
          const overdueTotal = overdue.reduce(
            (sum: number, item: any) => sum + Number(item.amount_due ?? item.amount ?? 0),
            0,
          )
          overdueReceivables = {
            count: overdue.length,
            totalAmount: overdueTotal,
            currency,
          }
          hasLiveSuccess = true
        }
      } catch (err: any) {
        if (!liveError) liveError = err instanceof Error ? err.message : String(err)
      }

      financeStatus = {
        success: hasLiveSuccess,
        count: bankAccounts.length + pendingJournals.length + rejectedJournals.length,
        ...(liveError && !hasLiveSuccess ? { error: liveError } : {}),
      }
    } catch (err: any) {
      financeStatus = {
        success: false,
        count: pendingJournals.length + rejectedJournals.length,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  } else {
    // No API credentials: record soft warning, but drafts still present
    financeStatus = {
      success: false,
      count: pendingJournals.length + rejectedJournals.length,
      error: 'EzityHub API credentials not configured. Showing local tracked journal records only.',
    }
  }

  // Source 3: Engineering Tasks
  let engineeringStatus: SourceStatus = { success: false, count: 0 }
  let devActiveTasks: WorkItem[] = []
  let devBlockedTasks: WorkItem[] = []
  let devCompletedTasks: WorkItem[] = []

  try {
    const devTasks = allWorkItems.filter(
      (i) =>
        i.assignedAgentId === 'ezity-developer' ||
        i.title.toLowerCase().includes('engineer') ||
        i.title.toLowerCase().includes('code'),
    )
    devActiveTasks = devTasks.filter((i) => i.status === 'in_progress')
    devBlockedTasks = devTasks.filter(
      (i) => i.status === 'needs_attention' || i.priority === 'urgent',
    )
    devCompletedTasks = devTasks.filter(
      (i) => i.status === 'completed' && i.updatedAt >= now.getTime() - 86_400_000,
    )

    engineeringStatus = { success: true, count: devTasks.length }
  } catch (err: any) {
    engineeringStatus = {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Source 4: Operations & Approvals
  let operationsStatus: SourceStatus = { success: false, count: 0 }
  let pendingApprovals: WorkItem[] = []
  let recentApprovals: WorkItem[] = []

  try {
    const approvalItems = allWorkItems.filter(
      (i) => i.type === 'approval' || i.id.startsWith('work_appr_'),
    )
    pendingApprovals = approvalItems.filter((i) => i.status === 'needs_attention')
    recentApprovals = approvalItems.filter((i) => i.status === 'completed' || i.status === 'dismissed')
    operationsStatus = { success: true, count: approvalItems.length }
  } catch (err: any) {
    operationsStatus = {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Source 5: Conductor Missions
  let conductorStatus: SourceStatus = { success: true, count: 0 }
  let activeMissionsCount = 0
  try {
    // Count conductor work items or sessions in progress
    const conductorItems = allWorkItems.filter(
      (i) => i.sourceSessionKey?.startsWith('conductor') || i.title.toLowerCase().includes('mission'),
    )
    activeMissionsCount = conductorItems.filter((i) => i.status === 'in_progress').length
    conductorStatus = { success: true, count: conductorItems.length }
  } catch {
    conductorStatus = { success: false, count: 0, error: 'Failed to inspect conductor missions' }
  }

  // Summary counts
  const sourceSummaryCounts: BriefingSourceSummaryCounts = {
    needsAttentionCount: needsAttentionItems.length,
    waitingCount: waitingItems.length,
    inProgressCount: inProgressItems.length,
    completedYesterdayCount: completedYesterdayItems.length,
    pendingApprovalsCount: pendingApprovals.length,
    activeMissionsCount,
    overdueInvoicesCount: overdueReceivables?.count ?? 0,
    totalCashBalance: totalCash,
    currency,
  }

  const urgentWorkItemIds = needsAttentionItems.map((i) => i.id)

  // -------------------------------------------------------------
  // Construct Markdown Briefing
  // -------------------------------------------------------------

  const formattedDisplayTime = formatDisplayDate(now, timezone)
  const isScheduledLabel = isManual ? 'Manual Run' : 'Scheduled Morning Brief'

  const sections: string[] = []

  sections.push(`# Ezity Daily Brief`)
  sections.push(`> **Type:** ${isScheduledLabel} | **Period:** ${periodCovered} | **Generated:** ${formattedDisplayTime} (${timezone})  \n> **Author:** ${agentEmoji} ${agentName} (${cosAgent?.roleLabel || 'Workforce & Operations Lead'})\n`)

  // --- 1. Needs Your Attention ---
  sections.push(`## Needs Your Attention`)
  if (needsAttentionItems.length === 0) {
    sections.push(`No critical blockers or rejected items requiring executive intervention.\n`)
  } else {
    for (const item of needsAttentionItems) {
      const reasonPart = item.metadata?.reason ? ` — *Reason:* ${item.metadata.reason}` : ''
      sections.push(`- **[${item.priority.toUpperCase()}]** ${item.title}${reasonPart} *(Work Item: \`${item.id}\`)*`)
    }
    sections.push('')
  }

  // --- 2. Finance ---
  sections.push(`## Finance`)
  if (!financeStatus.success && bankAccounts.length === 0 && !pnlSummary && !overdueReceivables) {
    sections.push(`> [!WARNING]\n> Finance live telemetry unavailable — ${financeStatus.error || 'EzityHub offline'}.\n`)
  }

  sections.push(`### Recorded Facts`)
  if (bankAccounts.length > 0) {
    sections.push(`- **Cash Accounts:**`)
    for (const acc of bankAccounts) {
      sections.push(`  - ${acc.name}: ${acc.currency} ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    }
  } else {
    sections.push(`- **Cash Accounts:** No live bank accounts connected or retrieved.`)
  }

  if (pnlSummary) {
    sections.push(
      `- **P&L Summary:** Revenue: ${currency} ${pnlSummary.revenue.toLocaleString()} | Expenses: ${currency} ${pnlSummary.expenses.toLocaleString()} | Net Income: ${currency} ${pnlSummary.netIncome.toLocaleString()}`,
    )
  } else {
    sections.push(`- **P&L Summary:** Not available for this cycle.`)
  }

  if (overdueReceivables) {
    sections.push(
      `- **Overdue Receivables:** ${overdueReceivables.count} overdue invoice(s) totaling ${overdueReceivables.currency} ${overdueReceivables.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    )
  } else {
    sections.push(`- **Overdue Receivables:** None reported.`)
  }

  if (pendingJournals.length > 0 || rejectedJournals.length > 0) {
    sections.push(`- **Journal Drafts:**`)
    if (pendingJournals.length > 0) {
      sections.push(`  - **Pending Review:** ${pendingJournals.length} draft(s) awaiting supervisor approval.`)
    }
    if (rejectedJournals.length > 0) {
      for (const rej of rejectedJournals) {
        sections.push(`  - **Rejected Draft:** \`${rej.entryNumber || rej.recordId}\` (${rej.reason || 'No reason specified'})`)
      }
    }
  } else {
    sections.push(`- **Journal Drafts:** All drafts resolved.`)
  }

  sections.push(`\n### Derived Calculations`)
  if (totalCash > 0) {
    sections.push(`- **Total Cash Reserves:** ${currency} ${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  } else {
    sections.push(`- **Total Cash Reserves:** 0.00`)
  }
  if (pnlSummary && pnlSummary.revenue > 0) {
    const margin = ((pnlSummary.netIncome / pnlSummary.revenue) * 100).toFixed(1)
    sections.push(`- **Operating Margin:** ${margin}%`)
  }

  sections.push(`\n### Recommendations`)
  if (rejectedJournals.length > 0) {
    sections.push(`- Have Accountant revise rejected journal entries to resolve missing documentation before cutoff.`)
  }
  if (overdueReceivables && overdueReceivables.count > 0) {
    sections.push(`- Issue reminder notices for the ${overdueReceivables.count} overdue invoice(s).`)
  }
  if (rejectedJournals.length === 0 && (!overdueReceivables || overdueReceivables.count === 0)) {
    sections.push(`- Financial operations are healthy; proceed with planned monthly reconciliation.`)
  }
  sections.push('')

  // --- 3. Engineering ---
  sections.push(`## Engineering`)
  sections.push(`### Recorded Facts`)
  sections.push(`- **Active Tasks:** ${devActiveTasks.length}`)
  for (const t of devActiveTasks) {
    sections.push(`  - \`${t.id}\`: ${t.title}`)
  }
  sections.push(`- **Blockers:** ${devBlockedTasks.length}`)
  for (const b of devBlockedTasks) {
    sections.push(`  - \`${b.id}\`: ${b.title}`)
  }
  sections.push(`- **Recently Completed:** ${devCompletedTasks.length}`)

  sections.push(`\n### Recommendations`)
  if (devBlockedTasks.length > 0) {
    sections.push(`- Prioritize unblocking Developer on ${devBlockedTasks[0].title}.`)
  } else {
    sections.push(`- Engineering velocity is unblocked; continue active task execution.`)
  }
  sections.push('')

  // --- 4. Operations ---
  sections.push(`## Operations`)
  sections.push(`### Recorded Facts`)
  sections.push(`- **Active Conductor Missions:** ${activeMissionsCount}`)
  sections.push(`- **Waiting Items:** ${waitingItems.length}`)
  sections.push(`- **Pending Approvals:** ${pendingApprovals.length}`)
  for (const app of pendingApprovals) {
    sections.push(`  - \`${app.id}\`: ${app.title}`)
  }

  sections.push(`\n### Recommendations`)
  if (pendingApprovals.length > 0) {
    sections.push(`- Review and resolve ${pendingApprovals.length} pending execution approval(s) in the Work Inbox.`)
  } else {
    sections.push(`- All operational workflows progressing normally.`)
  }
  sections.push('')

  // --- 5. Yesterday ---
  sections.push(`## Yesterday`)
  if (completedYesterdayItems.length === 0) {
    sections.push(`No work items recorded as completed in the preceding period.\n`)
  } else {
    for (const c of completedYesterdayItems.slice(0, 10)) {
      sections.push(`- **[Completed]** ${c.title} *(Assigned: ${c.assignedAgentId})*`)
    }
    sections.push('')
  }

  // --- 6. Today ---
  sections.push(`## Today`)
  sections.push(`**Priorities suggested by Chief of Staff:**`)
  let priorityNum = 1
  if (needsAttentionItems.length > 0) {
    sections.push(`${priorityNum++}. Resolve the ${needsAttentionItems.length} item(s) flagged under Needs Your Attention.`)
  }
  if (pendingApprovals.length > 0) {
    sections.push(`${priorityNum++}. Approve or deny ${pendingApprovals.length} pending execution request(s).`)
  }
  if (waitingItems.length > 0) {
    sections.push(`${priorityNum++}. Monitor supervisor resolution for ${waitingItems.length} item(s) in Waiting state.`)
  }
  sections.push(`${priorityNum++}. Maintain steady coordination between Accountant and Developer departments.`)
  sections.push('')

  const markdown = sections.join('\n')

  // Generate executive summary for dashboard card
  const summaryParts: string[] = []
  if (needsAttentionItems.length > 0) {
    summaryParts.push(`${needsAttentionItems.length} item(s) require attention`)
  } else {
    summaryParts.push(`All systems operational`)
  }
  if (totalCash > 0) {
    summaryParts.push(`Cash reserves: ${currency} ${totalCash.toLocaleString()}`)
  }
  if (inProgressItems.length > 0) {
    summaryParts.push(`${inProgressItems.length} active work item(s) in progress`)
  }
  const summary = summaryParts.join(' • ') + '.'

  const briefingId = isManual
    ? `brief_manual_${Date.now()}`
    : `brief_scheduled_${periodCovered}`

  const briefing: DailyBriefing = {
    id: briefingId,
    jobId: isManual ? 'manual' : (getDailyBriefSettings().hermesJobId || 'hermes-daily-brief'),
    agentDefinitionId,
    agentName,
    agentEmoji,
    generatedAt: now.toISOString(),
    periodCovered,
    timezone,
    isManual,
    title: `Ezity Daily Brief — ${periodCovered}`,
    summary,
    markdown,
    sources: {
      workInbox: workInboxStatus,
      finance: financeStatus,
      engineering: engineeringStatus,
      operations: operationsStatus,
      conductor: conductorStatus,
    },
    sourceSummaryCounts,
    urgentWorkItemIds,
  }

  saveDailyBriefing(briefing)
  return briefing
}

/**
 * Ensures the Hermes scheduled cron job exists for daily briefing.
 * Uses Hermes /api/jobs.
 */
export async function syncHermesDailyBriefJob(): Promise<{
  synced: boolean
  jobId?: string
  error?: string
}> {
  await ensureGatewayProbed()
  if (!getCapabilities().jobs) {
    return { synced: false, error: 'Hermes gateway jobs API unavailable' }
  }

  const settings = getDailyBriefSettings()
  const cronHour = settings.hour ?? 8
  const cronMinute = settings.minute ?? 0
  const cronSchedule = `${cronMinute} ${cronHour} * * *`

  try {
    // 1. Check existing jobs
    const listRes = await fetch(`${HERMES_API}/api/jobs?include_disabled=true`)
    if (!listRes.ok) {
      return { synced: false, error: `Failed to query jobs: HTTP ${listRes.status}` }
    }
    const listData = await listRes.json().catch(() => ({}))
    const existingJobs: any[] = listData.jobs || []
    const existing = existingJobs.find(
      (j) => j.name === 'Ezity Daily Brief' || j.id === settings.hermesJobId,
    )

    if (existing) {
      updateDailyBriefSettings({ hermesJobId: existing.id })
      return { synced: true, jobId: existing.id }
    }

    // 2. Create job in Hermes
    const createRes = await fetch(`${HERMES_API}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ezity Daily Brief',
        schedule: cronSchedule,
        prompt:
          'You are the Ezity Chief of Staff. Generate the authoritative daily operations executive briefing.',
        deliver: ['local'],
      }),
    })

    if (!createRes.ok) {
      return { synced: false, error: `Failed to create job: HTTP ${createRes.status}` }
    }

    const createdData = await createRes.json().catch(() => ({}))
    const jobId = createdData.job?.id
    if (jobId) {
      updateDailyBriefSettings({ hermesJobId: jobId })
    }
    return { synced: true, jobId }
  } catch (err: any) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
