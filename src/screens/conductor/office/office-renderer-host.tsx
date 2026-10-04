/**
 * Office Renderer Host
 *
 * Hosts the active virtual office renderer (SVG default, and future Three.js),
 * wires real application navigation handlers, and provides mobile responsive fallbacks.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { OfficeSceneState, OfficeZoneId } from '@/types/office-scene'
import type { OfficeLayoutTemplate, OfficeRendererProps, OfficeRendererType } from './types'
import { SvgOfficeRenderer } from './renderers/svg/svg-office-renderer'
import { PixiOfficeRenderer } from './renderers/pixi/pixi-office-renderer'
import { chatQueryKeys } from '@/screens/chat/chat-queries'
import { cn } from '@/lib/utils'

export interface OfficeRendererHostProps extends Partial<OfficeRendererProps> {
  scene: OfficeSceneState
}

function useOptionalQueryClient() {
  try {
    return useQueryClient()
  } catch {
    return undefined
  }
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
  officeRenderer: propOfficeRenderer,
  onRendererChange,
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
  const queryClient = useOptionalQueryClient()

  // Developer setting: active renderer ('svg' default/fallback vs 'pixi' experimental)
  const [rendererType, setRendererType] = useState<OfficeRendererType>(
    () => propOfficeRenderer || 'svg',
  )

  // Sync renderer preference from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    if (propOfficeRenderer) {
      setRendererType(propOfficeRenderer)
      return
    }
    try {
      const saved = window.localStorage.getItem('ezity-office:renderer')
      if (saved === 'pixi' || saved === 'svg') {
        setRendererType(saved)
      }
    } catch {}
  }, [propOfficeRenderer])

  const handleRendererChange = useCallback(
    (nextRenderer: OfficeRendererType) => {
      setRendererType(nextRenderer)
      onRendererChange?.(nextRenderer)
      try {
        window.localStorage.setItem('ezity-office:renderer', nextRenderer)
      } catch {}
    },
    [onRendererChange],
  )

  // Layout template state (defaults to modern 'ezity_hq')
  const [layoutTemplate, setLayoutTemplate] = useState<OfficeLayoutTemplate>(
    () => initialLayoutTemplate,
  )

  // Sync layout template preference from localStorage after hydration
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ezity-office:layout')
      if (
        saved === 'ezity_hq' ||
        saved === 'grid' ||
        saved === 'roundtable' ||
        saved === 'warroom'
      ) {
        setLayoutTemplate(saved as OfficeLayoutTemplate)
      }
    } catch {}
  }, [])

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

  // Normalize agent ID to canonical definition ID
  const resolveTargetAgentId = useCallback((rawId: string): string => {
    const id = rawId.toLowerCase()
    if (id.includes('accountant') || id.includes('fariz')) return 'ezity-accountant'
    if (id.includes('developer') || id.includes('salmanz')) return 'ezity-developer'
    if (
      id.includes('chief-of-staff') ||
      id.includes('hafiz') ||
      id.includes('cos') ||
      id.includes('orchestrator')
    ) {
      return 'ezity-chief-of-staff'
    }
    return rawId
  }, [])

  // Smart agent click handler: navigate to this agent's active chat session
  const handleAgentClick = useCallback(
    async (agentId: string, sessionKey?: string) => {
      if (propOnAgentClick) {
        propOnAgentClick(agentId, sessionKey)
        return
      }
      if (propOnViewOutput) {
        propOnViewOutput(agentId)
      }

      // 1. If agent node already has a valid active session key, navigate directly
      if (
        sessionKey &&
        sessionKey !== 'conductor-placeholder-agent' &&
        !sessionKey.startsWith('placeholder-')
      ) {
        try {
          localStorage.setItem('hermes-last-session', sessionKey)
        } catch {}
        navigate({
          to: '/chat/$sessionKey',
          params: { sessionKey },
        }).catch(() => {
          navigate({ to: '/chat' }).catch(() => {})
        })
        return
      }

      const targetAgentId = resolveTargetAgentId(agentId)

      try {
        // 2. Look up existing sessions for this agent from React Query cache
        const cachedSessions = queryClient?.getQueryData<
          Array<{
            key?: string
            friendlyId?: string
            agentId?: string | null
          }>
        >(chatQueryKeys.sessions)

        let matchingSession = cachedSessions?.find(
          (s) =>
            s.agentId === targetAgentId ||
            (s.friendlyId && s.friendlyId.includes(targetAgentId)) ||
            (s.key && s.key.includes(targetAgentId)),
        )

        // 3. If not found in cache, query /api/sessions from server
        if (!matchingSession) {
          const res = await fetch('/api/sessions')
          if (res.ok) {
            const data = (await res.json()) as {
              sessions?: Array<{
                key?: string
                friendlyId?: string
                agentId?: string | null
              }>
            }
            const list = Array.isArray(data.sessions) ? data.sessions : []
            matchingSession = list.find(
              (s) =>
                s.agentId === targetAgentId ||
                (s.friendlyId && s.friendlyId.includes(targetAgentId)) ||
                (s.key && s.key.includes(targetAgentId)),
            )
          }
        }

        let resolvedKey =
          matchingSession?.friendlyId || matchingSession?.key

        // 4. If no session exists yet for this agent, create a new one linked to this agent
        if (!resolvedKey && targetAgentId) {
          const createRes = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: targetAgentId }),
          })
          if (createRes.ok) {
            const createData = (await createRes.json()) as {
              session?: { friendlyId?: string; key?: string; id?: string }
              friendlyId?: string
              sessionKey?: string
            }
            resolvedKey =
              createData.session?.friendlyId ||
              createData.session?.key ||
              createData.session?.id ||
              createData.friendlyId ||
              createData.sessionKey

            void queryClient?.invalidateQueries({
              queryKey: chatQueryKeys.sessions,
            })
            void queryClient?.invalidateQueries({ queryKey: ['sessions'] })
          }
        }

        // 5. Open the agent's chat session
        if (resolvedKey) {
          try {
            localStorage.setItem('hermes-last-session', resolvedKey)
          } catch {}
          navigate({
            to: '/chat/$sessionKey',
            params: { sessionKey: resolvedKey },
          }).catch(() => {
            navigate({ to: '/chat' }).catch(() => {})
          })
        } else {
          navigate({ to: '/chat' }).catch(() => {})
        }
      } catch {
        navigate({ to: '/chat' }).catch(() => {})
      }
    },
    [
      propOnAgentClick,
      propOnViewOutput,
      navigate,
      queryClient,
      resolveTargetAgentId,
    ],
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
          1. DESKTOP & TABLET VIEW: DUAL VIRTUAL OFFICE RENDERER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative hidden h-full w-full md:block">
        {/* Developer Renderer Switcher Pill (Section 2 & 21) */}
        <div className="absolute top-3 right-4 z-30 flex items-center gap-1 rounded-2xl border border-amber-900/15 bg-white/90 p-1 shadow-md backdrop-blur-md">
          <button
            type="button"
            data-testid="renderer-switch-svg"
            onClick={() => handleRendererChange('svg')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-xs font-semibold transition',
              rendererType === 'svg'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            📄 SVG Office
          </button>
          <button
            type="button"
            data-testid="renderer-switch-pixi"
            onClick={() => handleRendererChange('pixi')}
            className={cn(
              'rounded-xl px-2.5 py-1 text-xs font-semibold transition',
              rendererType === 'pixi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            🎮 Game Office (Pixi)
          </button>
        </div>

        {rendererType === 'pixi' ? (
          <PixiOfficeRenderer
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
            onFallbackToSvg={() => handleRendererChange('svg')}
          />
        ) : (
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
        )}
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
          {scene.agents.map((agent) => {
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
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      📍 {zoneLabel}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--theme-muted)]">
                    {agent.currentTaskTitle || agent.roleTitle}
                  </p>
                  {agent.movementReason && agent.movementReason !== 'return_home' && (
                    <p className="text-[10px] text-sky-400 font-medium mt-0.5">
                      {agent.movementReason === 'approval_required'
                        ? '⚠️ Approval Required'
                        : agent.movementReason === 'mission_collaboration'
                          ? '⚡ Active Mission Session'
                          : agent.movementReason === 'needs_input'
                            ? '💬 Needs Input'
                            : agent.movementReason === 'paused'
                              ? '☕ Paused'
                              : agent.movementReason}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
