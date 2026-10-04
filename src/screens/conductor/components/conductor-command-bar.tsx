/**
 * Conductor Command Bar
 *
 * Floating Spotlight/Raycast-style Mission Launcher centered at the bottom of the screen.
 * Provides a clean, multiline prompt input with quick action chips and resume banner.
 */

import { useRef, type KeyboardEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  PlayIcon,
  Rocket01Icon,
  Search01Icon,
  TaskDone01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

export type QuickActionId = 'research' | 'build' | 'review' | 'deploy'

export const QUICK_ACTIONS: Array<{
  id: QuickActionId
  label: string
  icon: typeof Search01Icon
  prompt: string
}> = [
  {
    id: 'research',
    label: 'Research',
    icon: Search01Icon,
    prompt:
      'Research the problem space, gather constraints, compare approaches, and propose the most viable plan.',
  },
  {
    id: 'build',
    label: 'Build',
    icon: PlayIcon,
    prompt:
      'Build the requested feature end-to-end, including implementation, validation, and a concise delivery summary.',
  },
  {
    id: 'review',
    label: 'Review',
    icon: TaskDone01Icon,
    prompt:
      'Review the current implementation for correctness, regressions, missing tests, and release risks.',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: Rocket01Icon,
    prompt:
      'Prepare the work for deployment, verify readiness, and summarize any operational follow-ups.',
  },
]

export interface ConductorCommandBarProps {
  goalDraft: string
  setGoalDraft: (v: string) => void
  onSubmit: () => void
  isSending?: boolean
  hasPersistedMission?: boolean
  onResumeMission?: () => void
}

export function ConductorCommandBar({
  goalDraft,
  setGoalDraft,
  onSubmit,
  isSending = false,
  hasPersistedMission = false,
  onResumeMission,
}: ConductorCommandBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (goalDraft.trim() && !isSending) {
        onSubmit()
      }
    }
  }

  const handleQuickAction = (actionPrompt: string) => {
    setGoalDraft(actionPrompt)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 sm:bottom-6 left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 px-3 sm:px-4">
      {/* Resume previous mission highlight chip */}
      {hasPersistedMission && onResumeMission && (
        <div className="mb-2.5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--theme-accent)]/30 bg-[var(--theme-card)]/90 px-4 py-2 shadow-lg backdrop-blur-md">
          <p className="text-xs text-[var(--theme-text)]">
            ⚡ A previous mission was in progress.
          </p>
          <button
            type="button"
            onClick={onResumeMission}
            className="rounded-xl bg-[var(--theme-accent)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--theme-accent-strong)]"
          >
            Resume Mission
          </button>
        </div>
      )}

      {/* Main command bar box */}
      <div className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition focus-within:border-[var(--theme-accent)]">
        <div className="flex items-start gap-2 p-3 sm:p-4">
          <textarea
            ref={textareaRef}
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={2}
            placeholder="Assign a mission to your agent team... (e.g. Audit API security, build login flow, refactor database)"
            className="min-h-[48px] max-h-[140px] w-full resize-none bg-transparent text-sm text-[var(--theme-text)] placeholder-[var(--theme-muted-2)] focus:outline-none"
          />

          <button
            type="button"
            disabled={!goalDraft.trim() || isSending}
            onClick={onSubmit}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all',
              goalDraft.trim() && !isSending
                ? 'bg-[var(--theme-accent)] text-white shadow-md hover:bg-[var(--theme-accent-strong)] active:scale-95'
                : 'cursor-not-allowed bg-[var(--theme-border)] text-[var(--theme-muted)] opacity-50',
            )}
            title="Launch Mission (Enter)"
            aria-label="Launch Mission"
          >
            {isSending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
            )}
          </button>
        </div>

        {/* Quick action chips & shortcut hint */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[var(--theme-border)]/60 bg-[var(--theme-bg)]/40 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted-2)] mr-1">
              Quick:
            </span>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action.prompt)}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--theme-muted)] transition hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)] active:scale-95"
              >
                <HugeiconsIcon icon={action.icon} size={12} strokeWidth={1.8} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <span className="hidden sm:inline-block text-[10px] text-[var(--theme-muted-2)]">
            Press <kbd className="rounded border border-[var(--theme-border)] px-1 py-0.5 font-mono text-[9px]">Enter ↵</kbd> to launch
          </span>
        </div>
      </div>
    </div>
  )
}
