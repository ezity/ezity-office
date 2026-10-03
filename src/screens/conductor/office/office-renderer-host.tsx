/**
 * Office Renderer Host
 *
 * Hosts the active virtual office renderer (SVG default, and future Three.js),
 * wires real application navigation handlers, and provides mobile responsive fallbacks.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { OfficeSceneState, OfficeZoneId } from '@/types/office-scene'
import type { OfficeLayoutTemplate, OfficeRendererProps } from './types'
import { SvgOfficeRenderer } from './renderers/svg/svg-office-renderer'
import { cn } from '@/lib/utils'

export interface OfficeRendererHostProps extends Partial<OfficeRendererProps> {
  scene: OfficeSceneState
}

export function OfficeRendererHost({
  scene,
  className = '',
  height,
  containerHeight,
  enableReducedMotion = false,
  selectedAgentId,
  selectedZoneId,
  layoutTemplate: initialLayoutTemplate = 'ezity_hq',
  onLayoutChange,
  hideHeader = false,
  companyName = 'EZity Solutions',
  onAgentClick: propOnAgentClick,
  onZoneClick: propOnZoneClick,
  onWorkItemClick: propOnWorkItemClick,
  onApprovalClick: propOnApprovalClick,
  onMissionClick: propOnMissionClick,
  onViewOutput: propOnViewOutput,
}: OfficeRendererHostProps) {
  const navigate = useNavigate()

  // Layout template state (defaults to modern 'ezity_hq')
  const [layoutTemplate, setLayoutTemplate] = useState<OfficeLayoutTemplate>(() => {
    if (typeof window === 'undefined') return initialLayoutTemplate
    const saved = window.localStorage.getItem('ezity-office:layout')
    if (saved === 'ezity_hq' || saved === 'grid' || saved === 'roundtable' || saved === 'warroom') {
      return saved as OfficeLayoutTemplate
    }
    return initialLayoutTemplate
  })

  const handleLayoutChange = useCallback(
    (nextLayout: OfficeLayoutTemplate) => {
      setLayoutTemplate(nextLayout)
      onLayoutChange?.(nextLayout)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('ezity-office:layout', nextLayout)
      }
    },
    [onLayoutChange],
  )

  // Default smart routing handlers
  const handleAgentClick = useCallback(
    (agentId: string, sessionKey?: string) => {
      if (propOnAgentClick) {
        propOnAgentClick(agentId, sessionKey)
        return
      }
      if (propOnViewOutput) {
        propOnViewOutput(agentId)
      }
      if (sessionKey) {
        navigate({ to: '/chat/$sessionKey', params: { sessionKey } }).catch(() => {
          navigate({ to: '/chat' }).catch(() => {})
        })
      } else {
        navigate({ to: '/chat' }).catch(() => {})
      }
    },
    [propOnAgentClick, propOnViewOutput, navigate],
  )

  const handleZoneClick = useCallback(
    (zoneId: OfficeZoneId) => {
      if (propOnZoneClick) {
        propOnZoneClick(zoneId)
        return
      }
      switch (zoneId) {
        case 'inbox_board':
        case 'review_station':
          navigate({ to: '/inbox' }).catch(() => {})
          break
        case 'meeting_room':
          navigate({ to: '/conductor' }).catch(() => {})
          break
        case 'executive':
        case 'finance':
        case 'engineering':
        default:
          navigate({ to: '/chat' }).catch(() => {})
          break
      }
    },
    [propOnZoneClick, navigate],
  )

  const handleWorkItemClick = useCallback(
    (workItemId: string) => {
      if (propOnWorkItemClick) {
        propOnWorkItemClick(workItemId)
        return
      }
      navigate({ to: '/inbox' }).catch(() => {})
    },
    [propOnWorkItemClick, navigate],
  )

  const handleApprovalClick = useCallback(
    (approvalId?: string) => {
      if (propOnApprovalClick) {
        propOnApprovalClick(approvalId)
        return
      }
      navigate({ to: '/inbox' }).catch(() => {})
    },
    [propOnApprovalClick, navigate],
  )

  const handleMissionClick = useCallback(() => {
    if (propOnMissionClick) {
      propOnMissionClick()
      return
    }
    navigate({ to: '/conductor' }).catch(() => {})
  }, [propOnMissionClick, navigate])

  return (
    <div
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-[0_24px_80px_var(--theme-shadow)]',
        className,
      )}
      style={{ height: containerHeight || height || '100%' }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP & TABLET VIEW: FULL SVG VIRTUAL OFFICE
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden h-full w-full md:block">
        <SvgOfficeRenderer
          scene={scene}
          enableReducedMotion={enableReducedMotion}
          selectedAgentId={selectedAgentId}
          selectedZoneId={selectedZoneId}
          companyName={companyName}
          onAgentClick={handleAgentClick}
          onZoneClick={handleZoneClick}
          onWorkItemClick={handleWorkItemClick}
          onApprovalClick={handleApprovalClick}
          onMissionClick={handleMissionClick}
          onViewOutput={propOnViewOutput}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE VIEW (<768px): COMPACT RESPONSIVE AGENT LIST
      ───────────────────────────────────────────────────────────── */}
      <div className="flex h-full w-full flex-col overflow-y-auto p-4 md:hidden">
        {/* Mobile Header Banner */}
        <div className="mb-3 flex items-center justify-between border-b border-[var(--theme-border)] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[var(--theme-text)]">
              🏢 {companyName}
            </span>
          </div>
          {scene.pendingApprovalCount > 0 && (
            <button
              onClick={() => handleApprovalClick()}
              className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400"
            >
              ⚠️ {scene.pendingApprovalCount} Review
            </button>
          )}
        </div>

        {/* Quick Operations Strip */}
        <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs">
          <button
            onClick={() => handleWorkItemClick('inbox')}
            className="rounded-xl border border-teal-500/30 bg-teal-950/30 p-2 font-medium text-teal-300"
          >
            📋 Work Inbox ({scene.workItems.length})
          </button>
          <button
            onClick={handleMissionClick}
            className={`rounded-xl border p-2 font-medium ${
              scene.missionRunning
                ? 'border-sky-500/40 bg-sky-950/40 text-sky-300'
                : 'border-[var(--theme-border)] bg-[var(--theme-muted-bg)] text-[var(--theme-muted)]'
            }`}
          >
            {scene.missionRunning ? '⚡ Active Mission' : '🏛️ Conference Room'}
          </button>
        </div>

        {/* Staff Card Fallback */}
        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {scene.agents.map((agent) => (
            <div
              key={agent.id}
              role="button"
              tabIndex={0}
              onClick={() => handleAgentClick(agent.id, agent.sessionKey)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 shadow-sm transition hover:border-[var(--theme-border-strong)]"
            >
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-xl"
                style={{ backgroundColor: `${agent.colorHex}22` }}
              >
                {agent.emoji || '🤖'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--theme-text)] text-sm">
                    {agent.name}
                  </span>
                  <span
                    className={`inline-block size-2 rounded-full ${
                      agent.status === 'working'
                        ? 'bg-emerald-500'
                        : agent.status === 'error'
                          ? 'bg-red-500'
                          : agent.status === 'waiting'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                    }`}
                  />
                </div>
                <p className="truncate text-xs text-[var(--theme-muted)]">
                  {agent.currentTaskTitle || agent.roleTitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
