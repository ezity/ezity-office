/**
 * SVG Office Agent Node (Isometric Game-Style)
 * Phase I-C.2 — Game-Style Art Pass
 *
 * Renders a game-like illustrated office character that:
 * - Traverses the Phase I-C navigation graph
 * - Shows game-style speech-bubble status overlay
 * - Supports y-based depth sorting
 * - Maintains full click interactivity during transit
 * - Displays compact name/role badge
 */

import React, { useEffect, useRef, useState } from 'react'
import type { OfficeAgentSceneNode } from '@/types/office-scene'
import {
  getAttentionBadgeMeta,
  getCleanMonitorText,
  getStatusColorHex,
} from './svg-office-status'
import {
  calculateNavPath,
  getDistance,
  getNavNodeKeyForZone,
  interpolatePath,
  type SvgPoint,
} from './svg-office-pathing'
import { OfficeCharacter } from './office-character'

export interface SvgOfficeAgentProps {
  agent: OfficeAgentSceneNode
  index?: number
  isSelected?: boolean
  enableReducedMotion?: boolean
  onClick?: (agentId: string, sessionKey?: string) => void
}

/**
 * Resolves static SVG (x, y) coordinates for an agent based on their
 * home desk or current target operational zone.
 */
export function getAgentSvgCoordinates(
  agent: OfficeAgentSceneNode,
  index = 0,
): { x: number; y: number } {
  // Target operational zones
  if (agent.targetZoneId === 'review_station') {
    return { x: 600, y: 555 }
  }
  if (agent.targetZoneId === 'meeting_room') {
    return { x: 600, y: 195 }
  }
  if (agent.targetZoneId === 'lounge_break') {
    return { x: 1040, y: 275 }
  }
  if (agent.targetZoneId === 'inbox_board') {
    return { x: 995, y: 190 }
  }

  // Department Home Desks
  if (
    agent.agentDefinitionId === 'ezity-chief-of-staff' ||
    agent.department === 'executive'
  ) {
    return { x: 185, y: 205 }
  }
  if (
    agent.agentDefinitionId === 'ezity-accountant' ||
    agent.department === 'finance'
  ) {
    return { x: 185, y: 555 }
  }
  if (
    agent.agentDefinitionId === 'ezity-developer' ||
    agent.department === 'engineering'
  ) {
    const offsetX = (index % 3) * 60
    return { x: 995 - offsetX, y: 555 }
  }

  // Fallback for custom / operations agents
  const slotX = 900 + (index % 3) * 80
  return { x: slotX, y: 555 }
}

export function SvgOfficeAgent({
  agent,
  index = 0,
  isSelected = false,
  enableReducedMotion = false,
  onClick,
}: SvgOfficeAgentProps) {
  const targetCoords = getAgentSvgCoordinates(agent, index)

  // Track physical position for smooth waypoint path traversal
  const [pos, setPos] = useState<SvgPoint>(targetCoords)
  const [isMoving, setIsMoving] = useState(false)
  const currentZoneRef = useRef(agent.targetZoneId || agent.currentZoneId)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const destinationZone = agent.targetZoneId || agent.currentZoneId
    if (destinationZone === currentZoneRef.current) {
      setPos(targetCoords)
      setIsMoving(false)
      return
    }

    // Instant transition if reduced-motion is requested
    if (enableReducedMotion) {
      currentZoneRef.current = destinationZone
      setPos(targetCoords)
      setIsMoving(false)
      return
    }

    // Calculate waypoint path
    const fromKey = getNavNodeKeyForZone(currentZoneRef.current, agent.department)
    const toKey = getNavNodeKeyForZone(destinationZone, agent.department)
    const path = calculateNavPath(fromKey, toKey)

    currentZoneRef.current = destinationZone

    if (path.length <= 1) {
      setPos(targetCoords)
      setIsMoving(false)
      return
    }

    setIsMoving(true)
    const startTime = performance.now()
    let totalDist = 0
    for (let i = 0; i < path.length - 1; i++) {
      totalDist += getDistance(path[i], path[i + 1])
    }
    const duration = Math.min(1600, Math.max(500, totalDist * 1.2))

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const pt = interpolatePath(path, eased)
      setPos(pt)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step)
      } else {
        setPos(targetCoords)
        setIsMoving(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [agent.targetZoneId, agent.currentZoneId, agent.department, enableReducedMotion, targetCoords.x, targetCoords.y])

  const x = pos.x
  const y = pos.y
  const statusColor = getStatusColorHex(agent.status)
  const attentionBadge = getAttentionBadgeMeta(agent.attentionState)
  const monitorText = getCleanMonitorText(
    agent.currentTaskTitle,
    agent.lastActivityText,
    agent.status,
  )

  const isWorking = agent.status === 'working'
  const isAwaitingApproval = agent.attentionState === 'waiting_approval'
  // Character is considered seated when stationary at their desk
  const isSeated = !isMoving && !agent.targetZoneId

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(agent.agentDefinitionId || agent.id, agent.sessionKey)
    }
  }

  return (
    <g
      id={`agent-node-${agent.id}`}
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name} (${agent.roleTitle}) — Status: ${agent.status}. ${
        agent.currentTaskTitle ? `Task: ${agent.currentTaskTitle}` : ''
      }`}
      className="office-interactive-focus office-hover-card cursor-pointer"
      onClick={() => onClick?.(agent.agentDefinitionId || agent.id, agent.sessionKey)}
      onKeyDown={handleKeyDown}
    >
      {/* ═══ 1. Game-Style Speech-Bubble Status Overlay ═══ */}
      <g transform="translate(0, -48)">
        {/* Speech bubble body */}
        <rect
          x="-70"
          y="-14"
          width="140"
          height="22"
          rx="11"
          fill="#ffffff"
          stroke={isAwaitingApproval ? '#f59e0b' : isWorking ? '#6366f1' : '#e2e8f0'}
          strokeWidth={isWorking || isAwaitingApproval ? '1.5' : '1'}
          filter="url(#badge-soft-shadow)"
        />
        {/* Speech bubble tail */}
        <polygon
          points="-4,8 4,8 0,13"
          fill="#ffffff"
          stroke={isAwaitingApproval ? '#f59e0b' : isWorking ? '#6366f1' : '#e2e8f0'}
          strokeWidth="1"
        />
        {/* Cover the tail top stroke with fill */}
        <rect x="-5" y="5" width="10" height="4" fill="#ffffff" />

        {/* Status dot */}
        <circle
          cx="-58"
          cy="-3"
          r="3.5"
          fill={statusColor}
          className={isWorking ? 'office-pulse-working' : ''}
        />
        {/* Task text */}
        <text
          x="-48"
          y="0"
          fill={isWorking ? '#1e293b' : '#64748b'}
          fontSize="9"
          fontWeight="600"
        >
          {monitorText.length > 28 ? `${monitorText.slice(0, 27)}…` : monitorText}
        </text>
      </g>

      {/* ═══ 2. Illustrated Game Character ═══ */}
      <OfficeCharacter
        agent={agent}
        isMoving={isMoving}
        isSeated={isSeated}
        isSelected={isSelected}
      />

      {/* ═══ 3. Compact Name Badge ═══ */}
      <g transform={`translate(0, ${isSeated ? 24 : 38})`} textAnchor="middle">
        <rect
          x="-50"
          y="-2"
          width="100"
          height="22"
          rx="11"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="0.8"
          filter="url(#badge-soft-shadow)"
        />
        <text x="0" y="10" fill="#1e293b" fontSize="9.5" fontWeight="700">
          {agent.name}
        </text>
        <text
          x="0"
          y="17"
          fill="#64748b"
          fontSize="7"
          fontWeight="500"
        >
          {agent.roleTitle.length > 22
            ? `${agent.roleTitle.slice(0, 21)}…`
            : agent.roleTitle}
        </text>
      </g>

      {/* ═══ 4. Attention Alert Badge ═══ */}
      {attentionBadge && (
        <g transform="translate(0, -74)" textAnchor="middle">
          <rect
            x="-58"
            y="-2"
            width="116"
            height="16"
            rx="8"
            fill={attentionBadge.bg}
            stroke={attentionBadge.border}
            strokeWidth="1.2"
            filter="url(#badge-soft-shadow)"
            className="office-pulse-alert"
          />
          <text
            x="0"
            y="9"
            fill={attentionBadge.text}
            fontSize="8.5"
            fontWeight="700"
          >
            {attentionBadge.icon} {attentionBadge.label}
          </text>
        </g>
      )}
    </g>
  )
}
