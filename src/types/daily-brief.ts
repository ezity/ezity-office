export interface SourceStatus {
  success: boolean
  count: number
  error?: string
}

export interface BriefingSourceSummaryCounts {
  needsAttentionCount: number
  waitingCount: number
  inProgressCount: number
  completedYesterdayCount: number
  pendingApprovalsCount: number
  activeMissionsCount: number
  overdueInvoicesCount: number
  totalCashBalance?: number
  currency?: string
}

export interface DailyBriefing {
  id: string
  jobId: string
  agentDefinitionId: string
  agentName: string
  agentEmoji: string
  generatedAt: string
  periodCovered: string
  timezone: string
  isManual: boolean
  title: string
  summary: string
  markdown: string
  sources: {
    workInbox: SourceStatus
    finance: SourceStatus
    engineering: SourceStatus
    operations: SourceStatus
    conductor: SourceStatus
  }
  sourceSummaryCounts: BriefingSourceSummaryCounts
  urgentWorkItemIds: string[]
}

export interface DailyBriefSettings {
  enabled: boolean
  hour: number // default 8 (8:00 AM)
  minute: number // default 0
  timezone: string // default 'Asia/Kuala_Lumpur'
  hermesJobId?: string | null
}
