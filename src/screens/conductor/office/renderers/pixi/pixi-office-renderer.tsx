/**
 * PixiJS Game-Style Virtual Office Renderer
 *
 * Implements Phase I-D prototype:
 * - 2.5D Isometric sprite-based office renderer
 * - Real-time state-driven movement integration
 * - Direct DOM projected operational overlays (zero React re-renders on ticker)
 * - Strict SSR-safe client boundary
 */

import 'pixi.js/unsafe-eval'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { OfficeSceneState, OfficeZoneId } from '@/types/office-scene'
import type { OfficeRendererProps } from '../../types'
import { OfficeScene } from './scene/office-scene'
import type { ScreenPoint } from './movement/navigation'

export interface PixiOfficeRendererProps extends OfficeRendererProps {
  onFallbackToSvg?: () => void
}

export function PixiOfficeRenderer({
  scene,
  className = '',
  enableReducedMotion = false,
  selectedAgentId,
  selectedZoneId,
  companyName = 'EZity Solutions',
  onAgentClick,
  onZoneClick,
  onWorkItemClick,
  onApprovalClick,
  onMissionClick,
  onFallbackToSvg,
}: PixiOfficeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasMountRef = useRef<HTMLDivElement>(null)
  const overlaysContainerRef = useRef<HTMLDivElement>(null)
  const officeSceneRef = useRef<OfficeScene | null>(null)

  const [isClient, setIsClient] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // Keep latest handlers in a ref so the main Pixi initialization effect never re-runs
  const handlersRef = useRef({
    onAgentClick,
    onWorkItemClick,
    onApprovalClick,
    onMissionClick,
  })
  handlersRef.current = {
    onAgentClick,
    onWorkItemClick,
    onApprovalClick,
    onMissionClick,
  }

  // SSR Boundary Check
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Direct DOM overlay updates: ZERO React re-renders during 60 FPS animation ticker!
  const handleOverlayPositionsUpdate = useCallback((positions: Map<string, ScreenPoint>) => {
    const root = overlaysContainerRef.current
    if (!root) return

    for (const [agentId, pos] of positions.entries()) {
      const el = root.querySelector<HTMLDivElement>(`[data-agent-overlay="${agentId}"]`)
      if (el) {
        if (!pos || (pos.x === 0 && pos.y === 0)) {
          el.style.opacity = '0'
        } else {
          el.style.opacity = '1'
          el.style.transform = `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y - 74)}px, 0) translate(-50%, -100%)`
        }
      }
    }
  }, [])

  // Initialize Pixi Application ONCE on mount
  useEffect(() => {
    if (!isClient) return
    const mountEl = canvasMountRef.current
    if (!mountEl) return

    let isCancelled = false

    const width = mountEl.clientWidth || 1200
    const height = mountEl.clientHeight || 750

    OfficeScene.create({
      container: mountEl,
      width,
      height,
      enableReducedMotion,
      handlers: {
        onAgentClick: (agentId, sessionKey) => handlersRef.current.onAgentClick?.(agentId, sessionKey),
        onWorkItemClick: (id) => handlersRef.current.onWorkItemClick?.(id),
        onApprovalClick: (id) => handlersRef.current.onApprovalClick?.(id),
        onMissionClick: () => handlersRef.current.onMissionClick?.(),
      },
      onOverlayPositionsUpdate: handleOverlayPositionsUpdate,
    })
      .then((officeScene) => {
        if (isCancelled) {
          officeScene.destroy()
          return
        }
        officeSceneRef.current = officeScene
        officeScene.syncSceneState(scene, selectedAgentId, selectedZoneId, enableReducedMotion)
      })
      .catch((err: Error) => {
        console.warn('PixiJS Virtual Office initialization notice:', err.message)
        setInitError(err.message || 'WebGL not supported')
      })

    // Resize Observer (browser only)
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry && officeSceneRef.current) {
          const { width: newWidth, height: newHeight } = entry.contentRect
          if (newWidth > 100 && newHeight > 100) {
            officeSceneRef.current.resize(newWidth, newHeight)
          }
        }
      })
      resizeObserver.observe(mountEl)
    }

    return () => {
      isCancelled = true
      resizeObserver?.disconnect()
      if (officeSceneRef.current) {
        officeSceneRef.current.destroy()
        officeSceneRef.current = null
      }
    }
  }, [isClient]) // Runs once when client mounts

  // Sync state updates without rebuilding canvas
  useEffect(() => {
    if (officeSceneRef.current) {
      officeSceneRef.current.syncSceneState(
        scene,
        selectedAgentId,
        selectedZoneId,
        enableReducedMotion,
      )
    }
  }, [scene, selectedAgentId, selectedZoneId, enableReducedMotion])

  // Update handlers without rebuilding scene
  useEffect(() => {
    if (officeSceneRef.current) {
      officeSceneRef.current.updateHandlers({
        onAgentClick: (agentId, sessionKey) => handlersRef.current.onAgentClick?.(agentId, sessionKey),
        onWorkItemClick: (id) => handlersRef.current.onWorkItemClick?.(id),
        onApprovalClick: (id) => handlersRef.current.onApprovalClick?.(id),
        onMissionClick: () => handlersRef.current.onMissionClick?.(),
      })
    }
  }, [onAgentClick, onWorkItemClick, onApprovalClick, onMissionClick])

  if (!isClient) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fdfbf7] p-8 text-amber-900">
        <span className="text-sm font-medium">Loading Ezity Office...</span>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#fdfbf7] p-6 text-center">
        <div className="mb-3 text-3xl">🎮</div>
        <h3 className="text-base font-bold text-amber-950">Game Renderer Notice</h3>
        <p className="mt-1 max-w-md text-xs text-amber-800">
          WebGL acceleration is not available in this environment ({initError}).
        </p>
        <button
          onClick={onFallbackToSvg}
          className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          Switch to SVG Office
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overflow-hidden bg-[#4d5c69] ${className}`}
    >
      {/* Pixi Canvas Mount Target */}
      <div ref={canvasMountRef} className="absolute inset-0 block h-full w-full" />

      {/* ─────────────────────────────────────────────────────────────
          HTML OPERATIONAL OVERLAYS (Section 15)
          Direct DOM translation with ZERO React re-renders on ticker
      ───────────────────────────────────────────────────────────── */}
      <div ref={overlaysContainerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {scene.agents.map((agent) => {
          const isThinking = agent.liveActivity === 'thinking'
          const isTyping = agent.liveActivity === 'typing'
          const isToolCalling = agent.liveActivity === 'tool_calling'
          const isWaitingApproval = agent.liveActivity === 'waiting_approval'
          const isListening = agent.liveActivity === 'listening'
          const isError = agent.liveActivity === 'error'
          const isLiveStreaming = Boolean(agent.liveActivity)

          const statusText =
            isThinking
              ? agent.liveActivityText || 'Thinking...'
              : isTyping
                ? agent.liveActivityText || 'Answering in chat...'
                : isToolCalling
                  ? agent.liveActivityText || 'Executing tool...'
                  : isWaitingApproval
                    ? agent.liveActivityText || 'Needs your approval'
                    : isListening
                      ? agent.liveActivityText || 'Listening...'
                      : isError
                        ? agent.liveActivityText || 'Error responding'
                        : agent.movementReason === 'approval_required'
                          ? '⚠️ Reviewing Approval'
                          : agent.movementReason === 'mission_collaboration'
                            ? '⚡ Active Mission'
                            : agent.movementReason === 'needs_input'
                              ? '💬 Needs Input'
                              : agent.movementReason === 'paused'
                                ? '☕ Coffee Break'
                                : agent.currentTaskTitle || agent.roleTitle

          const bubbleBorderClass = isThinking
            ? 'border-indigo-400 bg-indigo-50/95 ring-2 ring-indigo-400/40 shadow-[0_4px_20px_rgba(99,102,241,0.25)]'
            : isTyping
              ? 'border-emerald-400 bg-emerald-50/95 ring-2 ring-emerald-400/40 shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
              : isToolCalling
                ? 'border-cyan-400 bg-cyan-50/95 ring-2 ring-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.25)]'
                : isWaitingApproval
                  ? 'border-amber-500 bg-amber-50/95 ring-2 ring-amber-400/50 shadow-[0_4px_20px_rgba(245,158,11,0.3)] animate-pulse'
                  : isListening
                    ? 'border-sky-400 bg-sky-50/95 ring-2 ring-sky-400/30 shadow-[0_4px_16px_rgba(56,189,248,0.2)]'
                    : isError
                      ? 'border-rose-400 bg-rose-50/95 ring-2 ring-rose-400/40 shadow-[0_4px_16px_rgba(244,63,94,0.2)]'
                      : 'border-amber-900/15 bg-white/95 shadow-[0_4px_16px_rgba(92,74,46,0.18)] hover:border-amber-500/50'

          const tailClass = isThinking
            ? 'border-indigo-400 bg-indigo-50'
            : isTyping
              ? 'border-emerald-400 bg-emerald-50'
              : isToolCalling
                ? 'border-cyan-400 bg-cyan-50'
                : isWaitingApproval
                  ? 'border-amber-500 bg-amber-50'
                  : isListening
                    ? 'border-sky-400 bg-sky-50'
                    : isError
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-amber-900/15 bg-white'

          const emoji = isThinking
            ? '💭'
            : isTyping
              ? '💬'
              : isToolCalling
                ? '🔧'
                : isWaitingApproval
                  ? '⚠️'
                  : isListening
                    ? '👂'
                    : isError
                      ? '❌'
                      : agent.emoji || '🤖'

          return (
            <div
              key={agent.id}
              data-agent-overlay={agent.id}
              className="absolute top-0 left-0 transition-opacity duration-150 will-change-transform"
              style={{ opacity: 0 }}
            >
              {/* Game-style speech bubble overlay */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  onAgentClick?.(
                    agent.agentDefinitionId || agent.id,
                    agent.sessionKey,
                  )
                }
                className="pointer-events-auto group relative flex cursor-pointer flex-col items-center"
              >
                {/* Status bubble */}
                <div
                  className={`relative mb-1 flex max-w-[220px] items-center gap-1.5 rounded-2xl border px-2.5 py-1 backdrop-blur-md transition hover:scale-105 ${bubbleBorderClass}`}
                >
                  <span className="text-xs">{emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[11px] font-bold text-slate-800">
                        {agent.name}
                      </span>
                      {isTyping && (
                        <span className="flex items-center gap-0.5">
                          <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                          <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                          <span className="size-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                      {isThinking && (
                        <span className="size-1.5 rounded-full bg-indigo-500 animate-ping" />
                      )}
                      {isToolCalling && (
                        <span className="inline-block animate-spin text-[10px] leading-none">⚙️</span>
                      )}
                      {isWaitingApproval && (
                        <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                      {isListening && (
                        <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                      )}
                      {isError && (
                        <span className="size-1.5 rounded-full bg-rose-500" />
                      )}
                      {!isLiveStreaming && agent.status === 'working' && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <p
                      className={`truncate text-[9px] font-medium ${
                        isThinking
                          ? 'text-indigo-600 font-semibold'
                          : isTyping
                            ? 'text-emerald-700 font-semibold'
                            : isToolCalling
                              ? 'text-cyan-700 font-semibold'
                              : isWaitingApproval
                                ? 'text-amber-800 font-bold'
                                : isListening
                                  ? 'text-sky-700 font-semibold'
                                  : isError
                                    ? 'text-rose-700 font-semibold'
                                    : 'text-slate-500'
                      }`}
                    >
                      {statusText}
                    </p>
                  </div>
                </div>

                {/* Speech bubble tail pointer */}
                <div
                  className={`size-2 -translate-y-1.5 rotate-45 border-r border-b ${tailClass}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACCESSIBLE DOM CONTROLS FOR SCREEN READERS (Section 16)
      ───────────────────────────────────────────────────────────── */}
      <div className="sr-only">
        <h2>{companyName} Virtual Office - Game Simulation View</h2>
        <div>
          <h3>Active Operational Zones</h3>
          <button onClick={() => onZoneClick?.('executive')}>Executive Suite</button>
          <button onClick={() => onZoneClick?.('finance')}>Finance Wing</button>
          <button onClick={() => onZoneClick?.('engineering')}>Engineering Bay</button>
          <button onClick={() => onZoneClick?.('review_station')}>
            Review Station ({scene.pendingApprovalCount} pending)
          </button>
          <button onClick={() => onZoneClick?.('inbox_board')}>
            Operations Board ({scene.workItems.length} items)
          </button>
          <button onClick={() => onZoneClick?.('meeting_room')}>
            Conference Room {scene.missionRunning ? '(Mission Running)' : ''}
          </button>
          <button onClick={() => onZoneClick?.('lounge_break')}>Staff Lounge</button>
        </div>
        <div>
          <h3>Staff Directory</h3>
          <ul>
            {scene.agents.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() =>
                    onAgentClick?.(a.agentDefinitionId || a.id, a.sessionKey)
                  }
                >
                  {a.name} ({a.roleTitle}) - Zone: {a.targetZoneId || a.currentZoneId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
