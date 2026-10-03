/**
 * SVG Office Agent Node
 *
 * Renders an autonomous AI coworker inside the SVG coordinate space.
 * Eliminates coordinate drift bugs and random fake speech loops.
 */

import React from 'react'
import type { OfficeAgentSceneNode } from '@/types/office-scene'
import {
  getAttentionBadgeMeta,
  getCleanMonitorText,
  getStatusColorHex,
} from './svg-office-status'

export interface SvgOfficeAgentProps {
  agent: OfficeAgentSceneNode
  index?: number
  isSelected?: boolean
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
  onClick,
}: SvgOfficeAgentProps) {
  const { x, y } = getAgentSvgCoordinates(agent, index)
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
