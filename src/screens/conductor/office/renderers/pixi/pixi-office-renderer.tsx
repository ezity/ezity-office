/**
 * PixiJS Game-Style Virtual Office Renderer
 *
 * Implements Phase I-D prototype:
 * - 2.5D Isometric sprite-based office renderer
 * - Real-time state-driven movement integration
 * - DOM projected operational overlays (crisp typography, accessible badges)
 * - Strict SSR-safe client boundary
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const officeSceneRef = useRef<OfficeScene | null>(null)

  const [isClient, setIsClient] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [agentPositions, setAgentPositions] = useState<Map<string, ScreenPoint>>(new Map())

  // SSR Boundary Check
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Dynamic RAF-throttled position update from Pixi Ticker
  const handleOverlayPositionsUpdate = useCallback((positions: Map<string, ScreenPoint>) => {
    setAgentPositions(new Map(positions))
  }, [])

  // Initialize Pixi Application
  useEffect(() => {
    if (!isClient) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let isCancelled = false

    const width = container.clientWidth || 1200
    const height = container.clientHeight || 750

    OfficeScene.create({
      canvas,
      width,
      height,
      enableReducedMotion,
      handlers: {
        onAgentClick,
        onWorkItemClick,
        onApprovalClick,
        onMissionClick,
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
      resizeObserver.observe(container)
    }

    return () => {
      isCancelled = true
      resizeObserver?.disconnect()
      if (officeSceneRef.current) {
        officeSceneRef.current.destroy()
        officeSceneRef.current = null
      }
    }
  }, [isClient, enableReducedMotion, onAgentClick, onWorkItemClick, onApprovalClick, onMissionClick, handleOverlayPositionsUpdate])

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

  // Update handlers
  useEffect(() => {
    if (officeSceneRef.current) {
      officeSceneRef.current.updateHandlers({
        onAgentClick,
        onWorkItemClick,
        onApprovalClick,
        onMissionClick,
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
      className={`relative h-full w-full select-none overflow-hidden bg-[#faf7ef] ${className}`}
    >
      {/* Pixi Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* ─────────────────────────────────────────────────────────────
          HTML OPERATIONAL OVERLAYS (Section 15)
          Projected from world coordinates to crisp DOM elements
      ───────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {scene.agents.map((agent) => {
          const pos = agentPositions.get(agent.id)
          if (!pos || pos.x === 0) return null

          const isMoving = Boolean(agent.targetZoneId && agent.targetZoneId !== agent.currentZoneId)
          const statusText =
            agent.movementReason === 'approval_required'
              ? '⚠️ Reviewing Approval'
              : agent.movementReason === 'mission_collaboration'
                ? '⚡ Active Mission'
                : agent.movementReason === 'needs_input'
                  ? '💬 Needs Input'
                  : agent.movementReason === 'paused'
                    ? '☕ Coffee Break'
                    : agent.currentTaskTitle || agent.roleTitle

          return (
            <div
              key={agent.id}
              className="absolute transition-transform duration-75 ease-out"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y - 48}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {/* Game-style speech bubble overlay */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAgentClick?.(agent.id, agent.sessionKey)}
                className="pointer-events-auto group relative flex cursor-pointer flex-col items-center"
              >
                {/* Status bubble */}
                <div className="relative mb-1 flex max-w-[190px] items-center gap-1.5 rounded-2xl border border-amber-900/15 bg-white/95 px-2.5 py-1 shadow-[0_4px_16px_rgba(92,74,46,0.18)] backdrop-blur-md transition hover:scale-105 hover:border-amber-500/50">
                  <span className="text-xs">{agent.emoji || '🤖'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-[11px] font-bold text-slate-800">
                        {agent.name}
                      </span>
                      {agent.status === 'working' && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <p className="truncate text-[9px] font-medium text-slate-500">
                      {statusText}
                    </p>
                  </div>
                </div>

                {/* Speech bubble tail pointer */}
                <div className="size-2 -translate-y-1.5 rotate-45 border-r border-b border-amber-900/15 bg-white" />
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
                <button onClick={() => onAgentClick?.(a.id, a.sessionKey)}>
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
