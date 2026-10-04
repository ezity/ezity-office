import { useState } from 'react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'

export interface DelegationResult {
  taskId: string
  sessionKey: string
  friendlyId: string
  isNewSession: boolean
  navigationUrl: string
  initialPrompt: string
  prePlanResult?: { ok: boolean; output?: string; error?: string } | null
}

interface DelegateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceSessionKey: string
  initialTitle?: string
  initialDescription?: string
  onDelegationSuccess: (result: DelegationResult) => void
}

export function DelegateTaskModal({
  open,
  onOpenChange,
  sourceSessionKey,
  initialTitle = '',
  initialDescription = '',
  onDelegationSuccess,
}: DelegateTaskModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [repo, setRepo] = useState<
    'ezity-office' | 'PharmaHadir' | 'EZBip' | 'workspace'
  >('ezity-office')
  const [reuseSession, setReuseSession] = useState(true)
  const [prePlanWithBridge, setPrePlanWithBridge] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both a title and technical description.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/agent-delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSessionKey,
          fromAgentId: 'ezity-accountant',
          toAgentId: 'ezity-developer',
          title: title.trim(),
          description: description.trim(),
          repo,
          reuseSession,
          prePlanWithBridge,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        taskId?: string
        sessionKey?: string
        friendlyId?: string
        isNewSession?: boolean
        navigationUrl?: string
        initialPrompt?: string
        prePlanResult?: { ok: boolean; output?: string; error?: string } | null
      }

      if (!res.ok || !data.ok || !data.sessionKey) {
        throw new Error(data.error || `Delegation failed (${res.status})`)
      }

      onDelegationSuccess({
        taskId: data.taskId || '',
        sessionKey: data.sessionKey,
        friendlyId: data.friendlyId || data.sessionKey,
        isNewSession: Boolean(data.isNewSession),
        navigationUrl: data.navigationUrl || `/chat/${data.sessionKey}`,
        initialPrompt: data.initialPrompt || '',
        prePlanResult: data.prePlanResult,
      })
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(560px,94vw)] max-h-[90vh] flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between border-b border-[var(--theme-border)] p-4 pb-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <span>💻</span>
              <span>Delegate Task to Salmanz (Developer)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--theme-muted)] mt-0.5">
              Handoff technical requirements directly from Fariz
              (ezity-accountant). Coding is mediated via the Antigravity bridge.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]"
                aria-label="Close delegation dialog"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={1.5}
                />
              </Button>
            }
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 space-y-4 text-xs"
        >
          {errorMessage && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-2.5 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block font-medium mb-1 text-[var(--theme-text)]">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Build automated reconciliation script"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input-bg,transparent)] px-3 py-2 text-xs outline-none focus:border-accent-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-[var(--theme-text)]">
              Technical Description & Context <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide context from Fariz's analysis, ledger rules, or bug details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-input-bg,transparent)] p-3 text-xs outline-none focus:border-accent-500 font-mono resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 text-[var(--theme-text)]">
                Target Repository
              </label>
              <select
                value={repo}
                onChange={(e) =>
                  setRepo(e.target.value as typeof repo)
                }
                className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-2.5 py-1.5 text-xs outline-none focus:border-accent-500"
              >
                <option value="ezity-office">ezity-office</option>
                <option value="PharmaHadir">PharmaHadir</option>
                <option value="EZBip">EZBip</option>
                <option value="workspace">workspace (shared)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--theme-text)]">
                <input
                  type="checkbox"
                  checked={reuseSession}
                  onChange={(e) => setReuseSession(e.target.checked)}
                  className="rounded border-[var(--theme-border)] text-accent-600 focus:ring-0"
                />
                <span>Reuse active Salmanz session</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--theme-text)]">
                <input
                  type="checkbox"
                  checked={prePlanWithBridge}
                  onChange={(e) => setPrePlanWithBridge(e.target.checked)}
                  className="rounded border-[var(--theme-border)] text-accent-600 focus:ring-0"
                />
                <span>Pre-plan via Antigravity Bridge</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--theme-subtle,rgba(0,0,0,0.03))] border border-[var(--theme-border)] p-2.5 text-[11px] text-[var(--theme-muted)] leading-relaxed">
            🛡️ <strong>Antigravity Mediation Policy:</strong> Salmanz
            (Lead Developer) will receive this task with the mandatory directive
            to execute all planning and repo modifications via the containerized
            Antigravity bridge.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--theme-border)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
                  <span>Delegating…</span>
                </span>
              ) : (
                'Delegate to Salmanz'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
