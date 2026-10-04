/**
 * Conductor Work Inbox Drawer
 *
 * Slide-out frosted glass activity drawer for the Operations Board.
 * Displays real active work items with status categorization, one-click
 * resolution, and agent localization without navigating away from the office.
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import type { OfficeSceneState, OfficeWorkItemSummary } from '@/types/office-scene'
import { updateWorkItemStatus } from '@/lib/work-items-api'
import { cn } from '@/lib/utils'

export interface ConductorInboxDrawerProps {
  open: boolean
  onClose: () => void
  scene: OfficeSceneState
  onLocateAgent?: (agentId: string) => void
}

type InboxFilter = 'all' | 'needs_attention' | 'in_progress' | 'waiting'

export function ConductorInboxDrawer({
  open,
  onClose,
  scene,
  onLocateAgent,
}: ConductorInboxDrawerProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [search, setSearch] = useState('')

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'completed' | 'dismissed' }) =>
      updateWorkItemStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['work-items'] })
    },
  })

  if (!open) return null

  const items = scene.workItems || []

  const filteredItems = items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false
    if (search.trim() && !item.title.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const needsAttentionCount = items.filter(
    (i) => i.status === 'needs_attention',
  ).length
  const inProgressCount = items.filter((i) => i.status === 'in_progress').length
  const waitingCount = items.filter((i) => i.status === 'waiting').length

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-400'
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      case 'low':
      default:
        return 'border-slate-500/30 bg-slate-500/10 text-slate-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'needs_attention':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-400'
      case 'in_progress':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-400'
      case 'waiting':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      default:
        return 'border-slate-500/30 bg-slate-500/10 text-slate-400'
    }
  }

  return (
    <aside className="pointer-events-auto absolute top-16 sm:top-20 right-3 sm:right-4 bottom-4 sm:bottom-6 z-35 flex w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 shadow-2xl backdrop-blur-2xl transition-all">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-base">
            📌
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-text)]">
              Operations Board & Inbox
            </h3>
            <p className="text-[11px] text-[var(--theme-muted)]">
              {items.length} active operational work items
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close operations board"
          className="flex size-7 items-center justify-center rounded-xl text-[var(--theme-muted)] transition hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {/* ── Filter Strip ── */}
      <div className="flex items-center gap-1.5 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-xl px-2.5 py-1 font-medium transition',
            filter === 'all'
              ? 'bg-[var(--theme-accent)] text-white shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
          )}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('needs_attention')}
          className={cn(
            'flex items-center gap-1 rounded-xl px-2.5 py-1 font-medium transition',
            filter === 'needs_attention'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
          )}
        >
          Attention ({needsAttentionCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('in_progress')}
          className={cn(
            'rounded-xl px-2.5 py-1 font-medium transition',
            filter === 'in_progress'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
          )}
        >
          Active ({inProgressCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('waiting')}
          className={cn(
            'rounded-xl px-2.5 py-1 font-medium transition',
            filter === 'waiting'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
          )}
        >
          Review ({waitingCount})
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="border-b border-[var(--theme-border)] px-4 py-2">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-xs text-[var(--theme-text)]">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="text-[var(--theme-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search work items..."
            className="w-full bg-transparent focus:outline-none placeholder:text-[var(--theme-muted-2)]"
          />
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-xs text-[var(--theme-muted)]">
            <span className="text-2xl block mb-2">📋</span>
            No matching work items in the Operations Inbox.
          </div>
        ) : (
          filteredItems.map((item) => {
            const assignedAgent = scene.agents.find(
              (a) => a.id === item.assignedAgentId || a.agentDefinitionId === item.assignedAgentId,
            )

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3.5 space-y-2.5 transition hover:border-[var(--theme-border-strong)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                          getStatusBadge(item.status),
                        )}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                          getPriorityBadge(item.priority),
                        )}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[10px] text-[var(--theme-muted-2)]">
                        {item.type}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[var(--theme-text)] line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                </div>

                {/* Assigned Agent & Actions */}
                <div className="flex items-center justify-between border-t border-[var(--theme-border)]/60 pt-2 text-[11px]">
                  {assignedAgent ? (
                    <button
                      type="button"
                      onClick={() => onLocateAgent?.(assignedAgent.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[var(--theme-muted)] transition hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
                      title="Locate agent at their desk"
                    >
                      <span>{assignedAgent.emoji || '🤖'}</span>
                      <span className="font-medium text-[var(--theme-text)]">
                        {assignedAgent.name}
                      </span>
                      <span className="text-[10px] text-sky-400">📍 Locate</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[var(--theme-muted)]">
                      Unassigned
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: item.id,
                          status: 'completed',
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/25"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                      <span>Complete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
