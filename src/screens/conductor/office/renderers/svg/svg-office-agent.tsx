/**
 * SVG Office Agent Node
 *
 * Renders an autonomous AI coworker inside the SVG coordinate space.
 * Eliminates coordinate drift bugs and random fake speech loops.
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
  // If moving or targeted to a specific utility zone
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
    // If multiple developers/workers, space them across the engineering bay
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

  // Track position for smooth waypoint path traversal
  const [pos, setPos] = useState<SvgPoint>(targetCoords)
  const currentZoneRef = useRef(agent.targetZoneId || agent.currentZoneId)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const destinationZone = agent.targetZoneId || agent.currentZoneId
    if (destinationZone === currentZoneRef.current) {
      setPos(targetCoords)
      return
    }

    // When reduced motion is preferred, jump instantly without animation
    if (enableReducedMotion) {
      currentZoneRef.current = destinationZone
      setPos(targetCoords)
      return
    }

    // Compute navigation path through doorways and central hallway
    const fromKey = getNavNodeKeyForZone(currentZoneRef.current, agent.department)
    const toKey = getNavNodeKeyForZone(destinationZone, agent.department)
    const path = calculateNavPath(fromKey, toKey)

    currentZoneRef.current = destinationZone

    if (path.length <= 1) {
      setPos(targetCoords)
      return
    }

    const startTime = performance.now()
    // Proportional speed: 1.2ms per SVG coordinate unit (min 500ms, max 1600ms)
    let totalDist = 0
    for (let i = 0; i < path.length - 1; i++) {
      totalDist += getDistance(path[i], path[i + 1])
    }
    const duration = Math.min(1600, Math.max(500, totalDist * 1.2))

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Smooth cubic ease-in-out
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(agent.id, agent.sessionKey)
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
      onClick={() => onClick?.(agent.id, agent.sessionKey)}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Desk Monitor Status Display */}
      <g transform="translate(-85, -78)">
        {/* Monitor Screen Frame */}
        <rect
          x="0"
          y="0"
          width="170"
          height="28"
          rx="6"
          fill={isWorking ? 'url(#grad-monitor-active)' : 'url(#grad-monitor-idle)'}
          stroke={isAwaitingApproval ? '#f59e0b' : isWorking ? '#38bdf8' : '#475569'}
          strokeWidth={isWorking || isAwaitingApproval ? '1.5' : '1'}
          filter="url(#desk-shadow)"
        />
        {/* Activity Indicator Dot */}
        <circle
          cx="12"
          cy="14"
          r="4"
          fill={statusColor}
          className={isWorking ? 'office-pulse-working' : ''}
        />
        {/* Real Task or Neutral Text */}
        <text
          x="22"
          y="18"
          fill={isWorking ? '#f0f9ff' : '#94a3b8'}
          fontSize="10"
          fontWeight="600"
        >
          {monitorText}
        </text>
      </g>

      {/* 2. Agent Avatar Disc */}
      <g transform="translate(0, 0)">
        {/* Selection Ring */}
        {isSelected && (
          <circle
            cx="0"
            cy="0"
            r="32"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Outer Glow on Working/Alert */}
        {isWorking && (
          <circle
            cx="0"
            cy="0"
            r="28"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            className="office-pulse-working"
          />
        )}

        {/* Main Avatar Circle */}
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="#0f172a"
          stroke={agent.colorHex || statusColor}
          strokeWidth="2.5"
          filter="url(#desk-shadow)"
        />

        {/* Agent Emoji Icon */}
        <text
          x="0"
          y="7"
          fontSize="22"
          textAnchor="middle"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {agent.emoji || '🤖'}
        </text>

        {/* Status Dot Pill on bottom-right of avatar */}
        <circle
          cx="16"
          cy="16"
          r="5"
          fill={statusColor}
          stroke="#0f172a"
          strokeWidth="1.5"
        />
      </g>

      {/* 3. Name & Role Plate */}
      <g transform="translate(0, 36)" textAnchor="middle">
        <rect
          x="-65"
          y="-2"
          width="130"
          height="32"
          rx="6"
          fill="#091b2c"
          fillOpacity="0.85"
          stroke="#334155"
          strokeWidth="1"
        />
        <text x="0" y="11" fill="#f8fafc" fontSize="11" fontWeight="700">
          {agent.name}
        </text>
        <text
          x="0"
          y="23"
          fill="#94a3b8"
          fontSize="9"
          fontWeight="500"
          letterSpacing="0.02em"
        >
          {agent.roleTitle.length > 20
            ? `${agent.roleTitle.slice(0, 19)}…`
            : agent.roleTitle}
        </text>
      </g>

      {/* 4. Attention Alert Badge (e.g. Awaiting Sign-off) */}
      {attentionBadge && (
        <g transform="translate(0, -96)" textAnchor="middle">
          <rect
            x="-70"
            y="-4"
            width="140"
            height="20"
            rx="10"
            fill={attentionBadge.bg}
            stroke={attentionBadge.border}
            strokeWidth="1.2"
            filter="url(#alert-glow)"
            className="office-pulse-alert"
          />
          <text
            x="0"
            y="10"
            fill={attentionBadge.text}
            fontSize="10"
            fontWeight="700"
          >
            {attentionBadge.icon} {attentionBadge.label}
          </text>
        </g>
      )}
    </g>
  )
}
