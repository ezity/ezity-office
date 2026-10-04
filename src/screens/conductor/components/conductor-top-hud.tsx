/**
 * Conductor Top HUD
 *
 * Floating frosted-glass navigation & telemetry bar for Option A Command Center.
 * Houses live system status, active mission metrics, office renderer switcher,
 * mission drawer toggle, and global settings triggers.
 */

import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Settings01Icon,
  SidebarLeft01Icon,
} from '@hugeicons/core-free-icons'
import type { OfficeRendererType } from '../office/types'
import type { OfficeSceneState } from '@/types/office-scene'
import type { useConductorGateway } from '../hooks/use-conductor-gateway'
import { estimateTokenCost, formatUsd } from './cost-tracker'
import { cn } from '@/lib/utils'

export interface ConductorTopHudProps {
  companyName?: string
  officeScene: OfficeSceneState
  conductor: ReturnType<typeof useConductorGateway>
  rendererType: OfficeRendererType
  onRendererChange: (renderer: OfficeRendererType) => void
  onHistoryOpen: () => void
  onSettingsOpen: () => void
  missionDrawerOpen: boolean
  onToggleMissionDrawer: () => void
  inboxOpen?: boolean
  onInboxOpen?: () => void
}

function formatElapsedMilliseconds(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatElapsedTime(
  startIso: string | null | undefined,
  endMs: number,
): string {
  if (!startIso) return '0s'
  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return '0s'
  return formatElapsedMilliseconds(endMs - startMs)
}

export function ConductorTopHud({
  companyName = 'EZity AI Office',
  officeScene,
  conductor,
  rendererType,
  onRendererChange,
  onHistoryOpen,
  onSettingsOpen,
  missionDrawerOpen,
  onToggleMissionDrawer,
  inboxOpen = false,
  onInboxOpen,
}: ConductorTopHudProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (conductor.isPaused) {
      setNow(conductor.pausedAtMs ?? Date.now())
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [conductor.isPaused, conductor.pausedAtMs])

  const totalWorkers = conductor.workers.length
  const completedWorkers = conductor.workers.filter(
    (w) => w.status === 'complete',
  ).length
  const totalTokens = useMemo(() => {
    return conductor.workers.reduce((sum, w) => sum + (w.totalTokens || 0), 0)
  }, [conductor.workers])

  const totalAgentsCount = officeScene.agents.length
  const workingAgentsCount = officeScene.agents.filter(
    (a) => a.status === 'working',
  ).length

  const isMissionActive =
    conductor.phase === 'decomposing' || conductor.phase === 'running'
  const isMissionComplete = conductor.phase === 'complete'

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 sm:p-4">
      {/* ── Left: Brand & Agent Status Badge ── */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/90 px-3.5 py-2 shadow-lg backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)]">
              {companyName}
            </span>
            <span className="text-[10px] text-[var(--theme-muted-2)]">
              {workingAgentsCount > 0
                ? `${workingAgentsCount} working · ${totalAgentsCount} agents`
                : `${totalAgentsCount} agents ready`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Center: Dynamic Mission Telemetry Bar ── */}
      <div className="pointer-events-auto hidden md:flex items-center gap-2">
        {isMissionActive && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--theme-accent)]/30 bg-[var(--theme-card)]/90 px-4 py-2 shadow-lg backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="size-2 rounded-full bg-sky-400 animate-pulse" />
            </span>
            <span className="max-w-[200px] truncate text-xs font-semibold text-[var(--theme-text)]">
              {conductor.goal || 'Mission in progress'}
            </span>
            <span className="h-3 w-px bg-[var(--theme-border)]" />
            <span className="text-xs text-[var(--theme-muted)]">
              ⏱️ {formatElapsedTime(conductor.missionStartedAt, now)}
            </span>
            <span className="h-3 w-px bg-[var(--theme-border)]" />
            <span className="text-xs font-medium text-[var(--theme-accent)]">
              {totalTokens > 0
                ? `${(totalTokens / 1000).toFixed(1)}k tok (${formatUsd(estimateTokenCost(totalTokens))})`
                : '0 tok'}
            </span>
          </div>
        )}

        {isMissionComplete && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[var(--theme-card)]/90 px-4 py-2 shadow-lg backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">
              Mission Complete
            </span>
            <span className="h-3 w-px bg-[var(--theme-border)]" />
            <span className="text-xs text-[var(--theme-muted)]">
              {totalTokens.toLocaleString()} tok &middot;{' '}
              {formatUsd(estimateTokenCost(totalTokens))}
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Renderer Toggle, History & Settings ── */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {/* Office Renderer Toggle (SVG vs Game) */}
        <div className="flex items-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/90 p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => onRendererChange('svg')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-xs font-semibold transition',
              rendererType === 'svg'
                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
            )}
            title="Switch to SVG Vector Office"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={() => onRendererChange('pixi')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-xs font-semibold transition',
              rendererType === 'pixi'
                ? 'bg-[var(--theme-accent)] text-white shadow-sm'
                : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]',
            )}
            title="Switch to Pixi Interactive Game Office"
          >
            Game
          </button>
        </div>

        {/* Mission Drawer Toggle Button */}
        {(isMissionActive || isMissionComplete) && (
          <button
            type="button"
            onClick={onToggleMissionDrawer}
            className={cn(
              'flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-colors',
              missionDrawerOpen
                ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)] text-[var(--theme-accent-strong)]'
                : 'border-[var(--theme-border)] bg-[var(--theme-card)]/90 text-[var(--theme-text)] hover:border-[var(--theme-accent)]',
            )}
            title="Toggle Mission Activity Panel"
          >
            <HugeiconsIcon icon={SidebarLeft01Icon} size={15} strokeWidth={1.8} />
            <span className="hidden sm:inline">Activity</span>
            {conductor.tasks.length > 0 && (
              <span className="rounded-full bg-[var(--theme-accent)] px-1.5 py-0.2 text-[10px] text-white">
                {conductor.tasks.filter((t) => t.status === 'complete').length}/
                {conductor.tasks.length}
              </span>
            )}
          </button>
        )}

        {/* Operations Board / Inbox Button */}
        <button
          type="button"
          onClick={onInboxOpen}
          className={cn(
            'flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-colors',
            inboxOpen
              ? 'border-amber-500 bg-amber-500/15 text-amber-400'
              : 'border-[var(--theme-border)] bg-[var(--theme-card)]/90 text-[var(--theme-text)] hover:border-amber-500/50',
          )}
          title="Open Operations Board & Work Inbox"
          aria-label="Operations Inbox"
        >
          <span className="text-xs">📌</span>
          <span className="hidden sm:inline">Inbox</span>
          {officeScene.workItems.length > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.2 text-[10px] font-bold text-white',
                officeScene.workItems.some((i) => i.status === 'needs_attention')
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-600',
              )}
            >
              {officeScene.workItems.length}
            </span>
          )}
        </button>

        {/* History Button */}
        <button
          type="button"
          onClick={onHistoryOpen}
          className="flex size-9 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/90 text-[var(--theme-muted)] shadow-lg backdrop-blur-md transition-colors hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]"
          title="Recent Missions History"
          aria-label="Mission History"
        >
          <HugeiconsIcon icon={Clock01Icon} size={17} strokeWidth={1.8} />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onSettingsOpen}
          className="flex size-9 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/90 text-[var(--theme-muted)] shadow-lg backdrop-blur-md transition-colors hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]"
          title="Conductor Settings"
          aria-label="Conductor Settings"
        >
          <HugeiconsIcon icon={Settings01Icon} size={17} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}
