/**
 * Conductor Mission Drawer
 *
 * Collapsible frosted-glass activity panel on the right side of the screen.
 * Displays live tasks, worker thought streams, outputs & deliverables,
 * and cost tracking with pause, stop, and retry controls.
 */

import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  PlayIcon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import type { useConductorGateway } from '../hooks/use-conductor-gateway'
import { CostTracker, estimateTokenCost, formatUsd, type CostWorker } from './cost-tracker'
import { getAgentPersona } from './agent-avatar'
import { CyclingStatus } from './mission-event-log'
import { Markdown } from '@/components/prompt-kit/markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConductorMissionDrawerProps {
  conductor: ReturnType<typeof useConductorGateway>
  open: boolean
  onClose: () => void
  onNewMission: () => void
  now: number
}

type DrawerTab = 'tasks' | 'workers' | 'output' | 'cost'

const WORKING_STEPS = [
  'Reviewing the brief...',
  'Scanning existing patterns...',
  'Drafting the implementation...',
  'Thinking through edge cases...',
  'Polishing the design...',
  'Wiring up components...',
  'Checking the layout...',
  'Almost there...',
]

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

function formatElapsedTime(startIso: string | null | undefined, endMs: number): string {
  if (!startIso) return '0s'
  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return '0s'
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getShortModelName(model: string | null | undefined): string {
  if (!model) return 'Unknown'
  const parts = model.split('/')
  return parts[parts.length - 1] || model
}

export function ConductorMissionDrawer({
  conductor,
  open,
  onClose,
  onNewMission,
  now,
}: ConductorMissionDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('tasks')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [costExpanded, setCostExpanded] = useState(true)

  const isComplete = conductor.phase === 'complete'
  const isRunning = conductor.phase === 'running' || conductor.phase === 'decomposing'

  const costWorkers = useMemo<Array<CostWorker>>(() => {
    return conductor.workers.map((worker, index) => {
      const persona = getAgentPersona(index)
      return {
        id: worker.key,
        label: worker.label,
        totalTokens: worker.totalTokens,
        personaEmoji: worker.agentEmoji ?? persona.emoji,
        personaName: worker.agentName ?? persona.name,
      }
    })
  }, [conductor.workers])

  const totalTokens = useMemo(() => {
    return conductor.workers.reduce((sum, w) => sum + (w.totalTokens || 0), 0)
  }, [conductor.workers])

  if (!open) return null

  return (
    <aside className="pointer-events-auto absolute top-16 sm:top-20 right-3 sm:right-4 bottom-4 sm:bottom-6 z-30 flex w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 shadow-2xl backdrop-blur-2xl transition-all">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                isComplete
                  ? 'bg-emerald-400'
                  : isRunning
                    ? 'bg-sky-400 animate-pulse'
                    : 'bg-zinc-400',
              )}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
              {isComplete
                ? 'Mission Complete'
                : conductor.phase === 'decomposing'
                  ? 'Planning Graph'
                  : 'Mission Active'}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-[var(--theme-text)]">
            {conductor.goal || 'Active Mission'}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-xl text-[var(--theme-muted)] transition hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
          title="Minimize drawer"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      {/* ── Mission Controls Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 px-4 py-2.5">
        {isRunning && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!conductor.orchestratorSessionKey || conductor.isPausing}
              onClick={async () => {
                if (!conductor.orchestratorSessionKey) return
                try {
                  await conductor.pauseAgent(
                    conductor.orchestratorSessionKey,
                    !conductor.isPaused,
                  )
                } catch {}
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition',
                conductor.isPaused
                  ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent-strong)]'
                  : 'border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
              )}
            >
              <span>{conductor.isPaused ? '▶' : '⏸'}</span>
              <span>{conductor.isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={() => void conductor.stopMission()}
              className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              Stop
            </button>
          </div>
        )}

        {isComplete && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={onNewMission}
              className="rounded-xl bg-[var(--theme-accent)] px-3 py-1 text-xs text-white hover:bg-[var(--theme-accent-strong)]"
            >
              New Mission
            </Button>
            <button
              type="button"
              onClick={() => void conductor.retryMission()}
              className="rounded-xl border border-[var(--theme-border)] px-2.5 py-1 text-xs text-[var(--theme-muted)] hover:text-[var(--theme-text)]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'rounded-lg px-2 py-0.5 font-medium transition',
              activeTab === 'tasks'
                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
            )}
          >
            Tasks ({conductor.tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={cn(
              'rounded-lg px-2 py-0.5 font-medium transition',
              activeTab === 'workers'
                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
            )}
          >
            Workers ({conductor.workers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cost')}
            className={cn(
              'rounded-lg px-2 py-0.5 font-medium transition',
              activeTab === 'cost'
                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
            )}
          >
            Cost
          </button>
        </div>
      </div>

      {/* ── Timeout warning alert ── */}
      {conductor.timeoutWarning && (
        <div className="border-b border-[var(--theme-warning-border)] bg-[var(--theme-warning-soft)] p-3">
          <p className="text-xs font-semibold text-[var(--theme-warning)]">
            Mission appears quiet — no activity for 60s
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={conductor.dismissTimeoutWarning}
              className="rounded-lg border border-[var(--theme-warning-border)] bg-[var(--theme-card)] px-2.5 py-1 text-xs text-[var(--theme-text)]"
            >
              Keep Waiting
            </button>
            <button
              type="button"
              onClick={() => void conductor.stopMission()}
              className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs text-red-400"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Tab 1: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {conductor.tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-6 text-center text-xs text-[var(--theme-muted)]">
                {conductor.phase === 'decomposing'
                  ? 'Architect is decomposing the goal into tasks...'
                  : 'No tasks generated yet.'}
              </div>
            ) : (
              conductor.tasks.map((task) => {
                const isSelected = selectedTaskId === task.id
                const statusDot =
                  task.status === 'complete'
                    ? 'bg-emerald-400'
                    : task.status === 'running'
                      ? 'bg-sky-400 animate-pulse'
                      : task.status === 'failed'
                        ? 'bg-red-400'
                        : 'bg-zinc-500'

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                    className={cn(
                      'cursor-pointer rounded-2xl border p-3 transition-colors',
                      isSelected
                        ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)]'
                        : 'border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-[var(--theme-border-strong)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2 shrink-0 rounded-full', statusDot)} />
                      <span className="text-xs font-semibold text-[var(--theme-text)]">
                        {task.title}
                      </span>
                    </div>
                    {task.workerKey && (
                      <p className="mt-1 text-[10px] text-[var(--theme-muted)]">
                        Assigned: {task.workerKey}
                      </p>
                    )}
                  </div>
                )
              })
            )}

            {conductor.streamText && (
              <div className="mt-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted)] mb-1">
                  Live Log Output
                </p>
                <div className="max-h-48 overflow-y-auto text-xs text-[var(--theme-text)] whitespace-pre-wrap font-mono">
                  {conductor.streamText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Workers */}
        {activeTab === 'workers' && (
          <div className="space-y-3">
            {conductor.workers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--theme-border)] p-6 text-center text-xs text-[var(--theme-muted)]">
                Spawning workers...
              </div>
            ) : (
              conductor.workers.map((worker, index) => {
                const persona = getAgentPersona(index)
                const workerOutput = conductor.workerOutputs[worker.key] ?? ''
                return (
                  <div
                    key={worker.key}
                    className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {worker.agentEmoji ?? persona.emoji}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[var(--theme-text)]">
                            {worker.agentName ?? persona.name}
                          </p>
                          <p className="text-[10px] text-[var(--theme-muted)]">
                            {getShortModelName(worker.model)}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-[var(--theme-border)] px-2 py-0.5 text-[10px] uppercase font-semibold text-[var(--theme-muted)]">
                        {worker.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--theme-muted)] border-t border-[var(--theme-border)] pt-2">
                      <span>{worker.totalTokens.toLocaleString()} tok</span>
                      <span>{formatRelativeTime(worker.updatedAt, now)}</span>
                    </div>

                    {workerOutput && (
                      <div className="max-h-32 overflow-y-auto rounded-xl bg-[var(--theme-bg)] p-2 text-[11px] font-mono text-[var(--theme-text)]">
                        {workerOutput}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Tab 3: Cost */}
        {activeTab === 'cost' && (
          <div className="space-y-3">
            <CostTracker
              totalTokens={totalTokens}
              workers={costWorkers}
              expanded={costExpanded}
              onToggle={() => setCostExpanded((c) => !c)}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
