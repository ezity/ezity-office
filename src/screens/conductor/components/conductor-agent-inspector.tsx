/**
 * Conductor Agent Inspector
 *
 * Floating glassmorphic card on the bottom-left that activates when clicking
 * any agent in the virtual office canvas. Displays agent role, active zone,
 * current task, and live attention state.
 */

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import type { OfficeAgentSceneNode } from '@/types/office-scene'
import { getOfficeModelLabel } from './office-view'
import { cn } from '@/lib/utils'

export interface ConductorAgentInspectorProps {
  agent: OfficeAgentSceneNode | null
  onClose: () => void
}

export function ConductorAgentInspector({
  agent,
  onClose,
}: ConductorAgentInspectorProps) {
  if (!agent) return null

  const currentZone = agent.targetZoneId || agent.currentZoneId
  const zoneLabel =
    currentZone === 'review_station'
      ? 'Review Station'
      : currentZone === 'meeting_room'
        ? 'Conference Room'
        : currentZone === 'inbox_board'
          ? 'Work Inbox'
          : currentZone === 'lounge_break'
            ? 'Staff Lounge'
            : agent.department === 'executive'
              ? 'Executive Suite'
              : agent.department === 'finance'
                ? 'Finance Wing'
                : 'Engineering Bay'

  return (
    <div className="pointer-events-auto absolute bottom-4 sm:bottom-6 left-3 sm:left-6 z-35 w-full max-w-[320px] overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 shadow-2xl backdrop-blur-2xl transition-all">
      <div className="flex items-start justify-between border-b border-[var(--theme-border)] p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl border border-white/10 text-2xl shadow-inner"
            style={{ backgroundColor: `${agent.colorHex}25` }}
          >
            {agent.emoji || '🤖'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--theme-text)]">
              {agent.name}
            </h4>
            <p className="text-xs text-[var(--theme-muted)] capitalize">
              {agent.roleTitle || agent.department}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-xl text-[var(--theme-muted)] transition hover:bg-[var(--theme-card2)] hover:text-[var(--theme-text)]"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={15} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        {/* Location & Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card2)] p-2">
            <span className="text-[10px] text-[var(--theme-muted)]">Location</span>
            <p className="mt-0.5 truncate font-medium text-[var(--theme-text)]">
              📍 {zoneLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card2)] p-2">
            <span className="text-[10px] text-[var(--theme-muted)]">Model</span>
            <p className="mt-0.5 truncate font-medium text-[var(--theme-text)]">
              {getOfficeModelLabel(agent.modelId)}
            </p>
          </div>
        </div>

        {/* Current task or thoughts */}
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/60 p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
            Current Focus
          </span>
          <p className="mt-1 text-xs text-[var(--theme-text)]">
            {agent.currentTaskTitle || agent.lastActivityText || 'Standing by for instructions'}
          </p>
          {agent.movementReason && agent.movementReason !== 'return_home' && (
            <p className="mt-2 text-[10px] font-medium text-sky-400">
              ⚡ {agent.movementReason.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
