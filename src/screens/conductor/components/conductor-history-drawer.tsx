/**
 * Conductor History Drawer
 *
 * Slide-over drawer presenting previous missions, token costs, and detailed
 * worker deliverables without leaving or occluding the virtual office canvas.
 */

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import type { useConductorGateway } from '../hooks/use-conductor-gateway'
import type { MissionHistoryEntry } from '@/types/conductor'
import { Markdown } from '@/components/prompt-kit/markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConductorHistoryDrawerProps {
  conductor: ReturnType<typeof useConductorGateway>
  open: boolean
  onClose: () => void
  now: number
}

function formatRelativeTime(value: string | null | undefined, now: number): string {
  if (!value) return 'just now'
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return 'just now'
  const diffSeconds = Math.max(0, Math.floor((now - ms) / 1000))
  if (diffSeconds < 10) return 'just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  return `${Math.floor(diffMinutes / 60)}h ago`
}

export function ConductorHistoryDrawer({
  conductor,
  open,
  onClose,
  now,
}: ConductorHistoryDrawerProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all')

  if (!open) return null

  const selectedEntry = conductor.selectedHistoryEntry

  const filteredHistory = conductor.missionHistory.filter((entry) => {
    if (filter === 'all') return true
    return entry.status === filter
  })

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[var(--theme-border)] bg-[var(--theme-card)] shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--theme-border)] p-4">
          <div>
            <h3 className="text-base font-bold text-[var(--theme-text)]">
              {selectedEntry ? 'Mission Details' : 'Recent Missions'}
            </h3>
            <p className="text-xs text-[var(--theme-muted)]">
              {selectedEntry
                ? `Completed ${formatRelativeTime(selectedEntry.completedAt, now)}`
                : `${conductor.missionHistory.length} recorded missions`}
            </p>
          </div>
          <button
            type="button"
            onClick={selectedEntry ? () => conductor.setSelectedHistoryEntry(null) : onClose}
            className="flex size-8 items-center justify-center rounded-xl text-[var(--theme-muted)] hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Selected entry detailed inspection */}
        {selectedEntry ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 space-y-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] uppercase font-semibold',
                  selectedEntry.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20',
                )}
              >
                {selectedEntry.status}
              </span>
              <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                {selectedEntry.goal}
              </h4>
              <p className="text-xs text-[var(--theme-muted)]">
                Total Tokens: {selectedEntry.totalTokens.toLocaleString()}
              </p>
            </div>

            {(selectedEntry.completeSummary || selectedEntry.outputText) && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
                  Summary
                </span>
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 text-xs text-[var(--theme-text)]">
                  <Markdown>{selectedEntry.completeSummary || selectedEntry.outputText || ''}</Markdown>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={() => conductor.setSelectedHistoryEntry(null)}
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] text-xs text-[var(--theme-text)] hover:bg-[var(--theme-card2)]"
            >
              Back to Missions List
            </Button>
          </div>
        ) : (
          /* Mission list */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter tags */}
            <div className="flex items-center gap-1.5 border-b border-[var(--theme-border)] px-4 py-2.5">
              {(['all', 'completed', 'failed'] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilter(tag)}
                  className={cn(
                    'rounded-xl px-3 py-1 text-xs font-medium capitalize transition',
                    filter === tag
                      ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                      : 'border border-[var(--theme-border)] text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center text-xs text-[var(--theme-muted)]">
                  No missions found in history.
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => conductor.setSelectedHistoryEntry(item)}
                    className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-left transition hover:border-[var(--theme-accent)] hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-[var(--theme-text)]">
                        {item.goal}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase',
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400',
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--theme-muted)]">
                      <span>{formatRelativeTime(item.completedAt, now)}</span>
                      <span>{item.totalTokens.toLocaleString()} tok</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
