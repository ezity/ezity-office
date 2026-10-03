import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FilterIcon,
  HelpCircleIcon,
  Mail01Icon,
  PlayIcon,
  RefreshIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { Link } from '@tanstack/react-router'
import type { WorkItem, WorkItemStatus } from '@/types/task'
import { fetchWorkItems, updateWorkItemStatus } from '@/lib/work-items-api'
import { fetchLatestBriefing } from '@/lib/briefings-api'
import { DailyBriefModal } from '@/screens/dashboard/components/daily-brief-modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const AGENT_MAP: Record<string, { name: string; emoji: string; color: string }> = {
  'ezity-accountant': {
    name: 'Accountant',
    emoji: '📊',
    color: 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20',
  },
  'ezity-developer': {
    name: 'Developer',
    emoji: '💻',
    color: 'text-sky-400 border-sky-800/40 bg-sky-950/20',
  },
  'ezity-chief-of-staff': {
    name: 'Chief of Staff',
    emoji: '🧑',
    color: 'text-indigo-400 border-indigo-800/40 bg-indigo-950/20',
  },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function InboxScreen() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'all' | WorkItemStatus>('needs_attention')
  const [selectedAgent, setSelectedAgent] = useState<string | 'all'>('all')
  const [briefModalOpen, setBriefModalOpen] = useState(false)

  const { data: latestBriefing } = useQuery({
    queryKey: ['daily-brief', 'latest'],
    queryFn: () => fetchLatestBriefing(false),
    staleTime: 60_000,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['work-items'],
    queryFn: () => fetchWorkItems(),
    refetchInterval: 3_000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      updateWorkItemStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] })
    },
  })

  const items = data?.items ?? []
  const summary = data?.summary ?? {
    needsAttention: 0,
    inProgress: 0,
    waiting: 0,
    completedToday: 0,
    total: 0,
  }

  const filteredItems = items.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (selectedAgent !== 'all' && item.assignedAgentId !== selectedAgent) return false
    return true
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header & Department Operations Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={1.5} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Work Inbox</h1>
              <p className="text-xs text-muted">
                Department operations, supervisor resolutions, and actionable AI staff items
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs"
          >
            <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Chief of Staff Daily Brief Banner */}
      {latestBriefing && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              👔
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-indigo-300">
                  Chief of Staff Brief — {latestBriefing.periodCovered}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  {latestBriefing.isManual ? 'Manual' : 'Scheduled'}
                </span>
              </div>
              <p className="text-neutral-300 mt-0.5 line-clamp-1">{latestBriefing.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {latestBriefing.urgentWorkItemIds.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('needs_attention')}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {latestBriefing.urgentWorkItemIds.length} Urgent Item(s)
              </button>
            )}
            <button
              type="button"
              onClick={() => setBriefModalOpen(true)}
              className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Open Full Brief &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('needs_attention')}
          className={cn(
            'flex flex-col p-3 rounded-xl border text-left transition-all',
            activeTab === 'needs_attention'
              ? 'border-rose-500/60 bg-rose-950/20 shadow-sm'
              : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-neutral-700',
          )}
        >
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Needs Attention</span>
            <HugeiconsIcon icon={AlertCircleIcon} size={14} strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-bold mt-1 text-rose-300">
            {summary.needsAttention}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('waiting')}
          className={cn(
            'flex flex-col p-3 rounded-xl border text-left transition-all',
            activeTab === 'waiting'
              ? 'border-amber-500/60 bg-amber-950/20 shadow-sm'
              : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-neutral-700',
          )}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>Waiting / Review</span>
            <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-300">
            {summary.waiting}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={cn(
            'flex flex-col p-3 rounded-xl border text-left transition-all',
            activeTab === 'in_progress'
              ? 'border-sky-500/60 bg-sky-950/20 shadow-sm'
              : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-neutral-700',
          )}
        >
          <div className="flex items-center justify-between text-xs text-sky-400 font-medium">
            <span>In Progress</span>
            <HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-bold mt-1 text-sky-300">
            {summary.inProgress}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            'flex flex-col p-3 rounded-xl border text-left transition-all',
            activeTab === 'completed'
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-sm'
              : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-neutral-700',
          )}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Completed Today</span>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.5} />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-300">
            {summary.completedToday}
          </div>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-[var(--theme-card2)] border border-[var(--theme-border)] w-fit">
          {(
            [
              ['needs_attention', 'Needs Attention'],
              ['waiting', 'Waiting'],
              ['in_progress', 'In Progress'],
              ['completed', 'Completed'],
              ['all', 'All Items'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-3 py-1 text-xs rounded-md font-medium transition-colors',
                activeTab === key
                  ? 'bg-[var(--theme-card)] text-[var(--theme-text)] shadow-sm'
                  : 'text-muted hover:text-[var(--theme-text)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={FilterIcon} size={14} className="text-muted" />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="h-8 rounded-md border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 text-xs text-[var(--theme-text)] focus:outline-none"
          >
            <option value="all">All Staff</option>
            <option value="ezity-accountant">📊 Accountant</option>
            <option value="ezity-developer">💻 Developer</option>
            <option value="ezity-chief-of-staff">🧑 Chief of Staff</option>
          </select>
        </div>
      </div>

      {/* Work Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted">Loading work items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)]/50">
            <HugeiconsIcon icon={Tick02Icon} size={32} className="text-muted mb-2" />
            <h3 className="text-sm font-semibold">No work items found</h3>
            <p className="text-xs text-muted max-w-sm mt-1">
              There are no actionable items in this view. All tasks and supervisor reviews are up to date.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const agent = AGENT_MAP[item.assignedAgentId] || {
              name: item.assignedAgentId,
              emoji: '🤖',
              color: 'text-neutral-400 border-neutral-800 bg-neutral-900',
            }

            const isNeedsAttention = item.status === 'needs_attention'
            const isWaiting = item.status === 'waiting'
            const isCompleted = item.status === 'completed'
            const isDismissed = item.status === 'dismissed'

            return (
              <div
                key={item.id}
                className={cn(
                  'relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all gap-4',
                  'bg-[var(--theme-card)] hover:border-[var(--theme-accent-border)]',
                  isNeedsAttention && 'border-rose-900/50 bg-rose-950/10',
                  isWaiting && 'border-amber-900/40 bg-amber-950/5',
                  isCompleted && 'opacity-80',
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="text-2xl mt-0.5 select-none">{agent.emoji}</div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight text-[var(--theme-text)] truncate">
                        {item.title}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border',
                          isNeedsAttention && 'bg-rose-500/15 border-rose-500/40 text-rose-300',
                          isWaiting && 'bg-amber-500/15 border-amber-500/40 text-amber-300',
                          item.status === 'in_progress' && 'bg-sky-500/15 border-sky-500/40 text-sky-300',
                          isCompleted && 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
                          isDismissed && 'bg-neutral-800 border-neutral-700 text-neutral-400',
                        )}
                      >
                        {item.status.replace('_', ' ')}
                      </span>

                      {/* Source Badge */}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800/80 text-neutral-400 border border-neutral-700/50">
                        {item.source}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted pt-1">
                      <span className="font-medium text-[var(--theme-text)]">
                        Assigned: {agent.name}
                      </span>
                      <span>•</span>
                      <span>{timeAgo(item.updatedAt)}</span>

                      {item.sourceRecordId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-neutral-500">
                            ID: {item.sourceRecordId}
                          </span>
                        </>
                      )}

                      {item.sourceSessionKey && (
                        <>
                          <span>•</span>
                          <Link
                            to="/chat"
                            search={{ session: item.sourceSessionKey }}
                            className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            Open Session
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {item.status !== 'in_progress' && item.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: item.id, status: 'in_progress' })
                      }
                      className="h-7 px-2.5 text-xs text-sky-400 hover:text-sky-300"
                    >
                      In Progress
                    </Button>
                  )}

                  {item.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: item.id, status: 'completed' })
                      }
                      className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Complete
                    </Button>
                  )}

                  {item.status !== 'dismissed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: item.id, status: 'dismissed' })
                      }
                      className="h-7 px-2 text-xs text-muted hover:text-[var(--theme-text)]"
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Daily Brief Modal */}
      <DailyBriefModal
        open={briefModalOpen}
        onOpenChange={setBriefModalOpen}
        briefing={latestBriefing || null}
      />
    </div>
  )
}
