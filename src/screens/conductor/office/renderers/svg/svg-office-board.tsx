/**
 * SVG Isometric Office Boards & Operational Overlays
 * Phase I-C.2 — Game-Style Art Pass
 *
 * Renders physical game-like operational boards:
 * - Cork pinboard with sticky note cards (Work Inbox)
 * - Compact whiteboard mission display (Conference)
 * - Physical review desk tray counter (Approval)
 *
 * All counters and states derive from real OfficeSceneState.
 * No giant dashboard widgets or SaaS metric panels.
 */

import React from 'react'
import type { OfficeSceneState } from '@/types/office-scene'

export interface SvgOfficeBoardProps {
  scene: OfficeSceneState
  onWorkItemClick?: (workItemId: string) => void
  onApprovalClick?: (approvalId?: string) => void
  onMissionClick?: () => void
}

export function SvgOfficeBoard({
  scene,
  onWorkItemClick,
  onApprovalClick,
  onMissionClick,
}: SvgOfficeBoardProps) {
  const needsAttentionCount = scene.workItems.filter(
    (item) => item.status === 'needs_attention',
  ).length
  const inProgressCount = scene.workItems.filter(
    (item) => item.status === 'in_progress',
  ).length
  const waitingCount = scene.workItems.filter(
    (item) => item.status === 'waiting',
  ).length

  const needsAttentionItem = scene.workItems.find((i) => i.status === 'needs_attention')
  const inProgressItem = scene.workItems.find((i) => i.status === 'in_progress')
  const waitingItem = scene.workItems.find((i) => i.status === 'waiting' || i.status === 'completed')

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <g id="office-boards-layer">
      {/* ═══════════════════════════════════════════════════════
          1. WORK INBOX CORK PINBOARD (Operations Room)
      ═══════════════════════════════════════════════════════ */}
      <g
        id="board-work-inbox"
        role="button"
        tabIndex={0}
        aria-label={`Work Inbox Board: ${needsAttentionCount} Needs Attention, ${inProgressCount} In Progress, ${waitingCount} Waiting`}
        className="office-interactive-focus office-hover-card cursor-pointer"
        onClick={() => onWorkItemClick?.('inbox-root')}
        onKeyDown={(e) => handleKeyDown(e, () => onWorkItemClick?.('inbox-root'))}
      >
        {/* Cork board backing (already rendered by furniture — this adds the sticky cards) */}
        {/* Header label on the board */}
        <rect x="864" y="90" width="262" height="20" fill="#ffffff" fillOpacity="0.85" rx="3" />
        <text x="876" y="104" fill="#78350f" fontSize="10" fontWeight="700" letterSpacing="0.05em">
          📌 OPERATIONS BOARD
        </text>
        {scene.workItems.length > 0 && (
          <text x="1030" y="104" fill="#b45309" fontSize="9" fontWeight="700">
            ({scene.workItems.length})
          </text>
        )}
        <text x="1118" y="104" fill="#b45309" fontSize="9" textAnchor="end" fontWeight="600">
          Open Inbox ↗
        </text>

        {/* 3 Sticky Note Cards pinned to the board */}
        {/* Card 1: Needs Attention (Amber) */}
        <g transform="translate(872, 116)">
          <rect
            x="0" y="0" width="78" height="72" rx="3"
            fill={needsAttentionCount > 0 ? '#fff7ed' : '#ffffff'}
            stroke={needsAttentionCount > 0 ? '#f97316' : '#e2e8f0'}
            strokeWidth="1"
            filter="url(#badge-soft-shadow)"
          />
          {/* Pushpin */}
          <circle cx="39" cy="6" r="3" fill="#ef4444" />
          <text
            x="39" y="32"
            fill={needsAttentionCount > 0 ? '#c2410c' : '#94a3b8'}
            fontSize="18" fontWeight="800" textAnchor="middle"
          >
            {needsAttentionCount}
          </text>
          <text x="39" y="44" fill="#475569" fontSize="7" fontWeight="700" textAnchor="middle">
            NEEDS
          </text>
          <text x="39" y="52" fill="#475569" fontSize="7" fontWeight="700" textAnchor="middle">
            ATTENTION
          </text>
          {needsAttentionItem && (
            <text x="39" y="64" fill="#c2410c" fontSize="6" fontWeight="600" textAnchor="middle">
              {needsAttentionItem.title.length > 13 ? `${needsAttentionItem.title.slice(0, 12)}…` : needsAttentionItem.title}
            </text>
          )}
        </g>

        {/* Card 2: In Progress (Blue) */}
        <g transform="translate(958, 116)">
          <rect
            x="0" y="0" width="78" height="72" rx="3"
            fill="#f0f9ff"
            stroke="#0284c7"
            strokeWidth="1"
            filter="url(#badge-soft-shadow)"
          />
          <circle cx="39" cy="6" r="3" fill="#0284c7" />
          <text x="39" y="32" fill="#0369a1" fontSize="18" fontWeight="800" textAnchor="middle">
            {inProgressCount}
          </text>
          <text x="39" y="44" fill="#0369a1" fontSize="7" fontWeight="700" textAnchor="middle">
            IN
          </text>
          <text x="39" y="52" fill="#0369a1" fontSize="7" fontWeight="700" textAnchor="middle">
            PROGRESS
          </text>
          {inProgressItem && (
            <text x="39" y="64" fill="#0284c7" fontSize="6" fontWeight="600" textAnchor="middle">
              {inProgressItem.title.length > 13 ? `${inProgressItem.title.slice(0, 12)}…` : inProgressItem.title}
            </text>
          )}
        </g>

        {/* Card 3: Waiting (Green) */}
        <g transform="translate(1044, 116)">
          <rect
            x="0" y="0" width="78" height="72" rx="3"
            fill="#f0fdf4"
            stroke="#10b981"
            strokeWidth="1"
            filter="url(#badge-soft-shadow)"
          />
          <circle cx="39" cy="6" r="3" fill="#10b981" />
          <text x="39" y="32" fill="#047857" fontSize="18" fontWeight="800" textAnchor="middle">
            {waitingCount}
          </text>
          <text x="39" y="44" fill="#047857" fontSize="7" fontWeight="700" textAnchor="middle">
            REVIEW /
          </text>
          <text x="39" y="52" fill="#047857" fontSize="7" fontWeight="700" textAnchor="middle">
            QUEUED
          </text>
          {waitingItem && (
            <text x="39" y="64" fill="#047857" fontSize="6" fontWeight="600" textAnchor="middle">
              {waitingItem.title.length > 13 ? `${waitingItem.title.slice(0, 12)}…` : waitingItem.title}
            </text>
          )}
        </g>
      </g>

      {/* ═══════════════════════════════════════════════════════
          2. CONFERENCE MISSION DISPLAY (Game-style whiteboard)
      ═══════════════════════════════════════════════════════ */}
      <g
        id="board-conference-mission"
        role="button"
        tabIndex={0}
        aria-label={
          scene.missionRunning
            ? `Active Mission: ${scene.activeMissionGoal || 'Running'}`
            : 'Strategic Conference Room Ready'
        }
        className="office-interactive-focus office-hover-card cursor-pointer"
        onClick={() => onMissionClick?.()}
        onKeyDown={(e) => handleKeyDown(e, () => onMissionClick?.())}
      >
        {/* Compact status bar below whiteboard */}
        <rect
          x="440"
          y="270"
          width="300"
          height="28"
          rx="6"
          fill="#ffffff"
          stroke={scene.missionRunning ? '#6366f1' : '#e2e8f0'}
          strokeWidth={scene.missionRunning ? '1.5' : '1'}
          filter="url(#badge-soft-shadow)"
        />
        {/* Status beacon */}
        <circle
          cx="456"
          cy="284"
          r="4"
          fill={scene.missionRunning ? '#22c55e' : '#94a3b8'}
          className={scene.missionRunning ? 'office-pulse-working' : ''}
        />
        {/* Mission text */}
        <text x="468" y="288" fill="#1e293b" fontSize="10" fontWeight="600">
          {scene.missionRunning
            ? scene.activeMissionGoal
              ? scene.activeMissionGoal.length > 32
                ? `${scene.activeMissionGoal.slice(0, 31)}…`
                : scene.activeMissionGoal
              : 'Active Conductor Mission'
            : 'Strategic Council • Standing by'}
        </text>
        {scene.missionProgressPercent !== undefined && (
          <text x="730" y="288" fill="#6366f1" fontSize="10" fontWeight="700" textAnchor="end">
            {scene.missionProgressPercent}%
          </text>
        )}
      </g>

      {/* ═══════════════════════════════════════════════════════
          3. REVIEW & APPROVAL TRAY COUNTER (Compact game badge)
      ═══════════════════════════════════════════════════════ */}
      <g
        id="board-approval-queue"
        role="button"
        tabIndex={0}
        aria-label={`Approval Queue: ${scene.pendingApprovalCount} pending approvals`}
        className="office-interactive-focus office-hover-card cursor-pointer"
        onClick={() => onApprovalClick?.()}
        onKeyDown={(e) => handleKeyDown(e, () => onApprovalClick?.())}
      >
        <rect
          x="460"
          y="450"
          width="260"
          height="30"
          rx="6"
          fill={scene.pendingApprovalCount > 0 ? '#fffbeb' : '#f0fdf4'}
          stroke={scene.pendingApprovalCount > 0 ? '#f59e0b' : '#10b981'}
          strokeWidth={scene.pendingApprovalCount > 0 ? '1.5' : '1'}
          filter="url(#badge-soft-shadow)"
          className={scene.pendingApprovalCount > 0 ? 'office-pulse-alert' : ''}
        />
        <text
          x="476"
          y="470"
          fill={scene.pendingApprovalCount > 0 ? '#92400e' : '#065f46'}
          fontSize="10.5"
          fontWeight="700"
        >
          {scene.pendingApprovalCount > 0
            ? `⚠️ ${scene.pendingApprovalCount} Pending Approval`
            : '✓ All Drafts & Entries Verified'}
        </text>
        <text
          x="710"
          y="470"
          fill={scene.pendingApprovalCount > 0 ? '#b45309' : '#047857'}
          fontSize="10"
          fontWeight="600"
          textAnchor="end"
        >
          {scene.pendingApprovalCount > 0 ? 'Review ↗' : 'Settled'}
        </text>
      </g>
    </g>
  )
}
