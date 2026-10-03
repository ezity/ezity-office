/**
 * SVG Office Interactive Boards
 *
 * Renders the Work Inbox Operations Board, the Dual-Control Approval Counter,
 * and the Strategic Mission Display in the Conference Room.
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
  // Compute real counts from canonical scene state
  const needsAttentionCount = scene.workItems.filter(
    (item) => item.status === 'needs_attention',
  ).length
  const inProgressCount = scene.workItems.filter(
    (item) => item.status === 'in_progress',
  ).length
  const waitingCount = scene.workItems.filter(
    (item) => item.status === 'waiting',
  ).length

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  return (
    <g id="office-boards-layer">
      {/* ─────────────────────────────────────────────────────────────
          1. WORK INBOX & OPERATIONS WALL BOARD (Upper Right)
      ───────────────────────────────────────────────────────────── */}
      <g
        id="board-work-inbox"
        role="button"
        tabIndex={0}
        aria-label={`Work Inbox Board: ${needsAttentionCount} Needs Attention, ${inProgressCount} In Progress, ${waitingCount} Waiting`}
        className="office-interactive-focus office-hover-card cursor-pointer"
        onClick={() => onWorkItemClick?.('inbox-root')}
        onKeyDown={(e) => handleKeyDown(e, () => onWorkItemClick?.('inbox-root'))}
      >
        {/* Wall Board Frame */}
        <rect
          x="840"
          y="88"
          width="310"
          height="132"
          rx="12"
          fill="#091b2c"
          stroke="#14b8a6"
          strokeWidth="1.5"
          filter="url(#desk-shadow)"
        />
        {/* Header Strip */}
        <rect x="840" y="88" width="310" height="28" rx="12" fill="#042f2e" />
        <rect x="840" y="104" width="310" height="12" fill="#042f2e" />
        <text x="855" y="107" fill="#5eead4" fontSize="11" fontWeight="700" letterSpacing="0.08em">
          WORK INBOX METRICS
        </text>
        <text x="1135" y="107" fill="#2dd4bf" fontSize="10" textAnchor="end" fontWeight="500">
          Open Inbox ↗
        </text>

        {/* Counter Columns */}
        {/* Needs Attention */}
        <g transform="translate(855, 128)">
          <rect
            x="0"
            y="0"
            width="86"
            height="76"
            rx="8"
            fill={needsAttentionCount > 0 ? '#451a03' : '#0f172a'}
            stroke={needsAttentionCount > 0 ? '#f59e0b' : '#334155'}
            strokeWidth="1"
          />
          <text
            x="43"
            y="32"
            fill={needsAttentionCount > 0 ? '#f59e0b' : '#94a3b8'}
            fontSize="22"
            fontWeight="800"
            textAnchor="middle"
          >
            {needsAttentionCount}
          </text>
          <text x="43" y="52" fill="#cbd5e1" fontSize="9" fontWeight="600" textAnchor="middle">
            NEEDS
          </text>
          <text x="43" y="63" fill="#cbd5e1" fontSize="9" fontWeight="600" textAnchor="middle">
            ATTENTION
          </text>
        </g>

        {/* In Progress */}
        <g transform="translate(952, 128)">
          <rect x="0" y="0" width="86" height="76" rx="8" fill="#0c4a6e" stroke="#0ea5e9" strokeWidth="1" />
          <text x="43" y="32" fill="#38bdf8" fontSize="22" fontWeight="800" textAnchor="middle">
            {inProgressCount}
          </text>
          <text x="43" y="52" fill="#e0f2fe" fontSize="9" fontWeight="600" textAnchor="middle">
            IN
          </text>
          <text x="43" y="63" fill="#e0f2fe" fontSize="9" fontWeight="600" textAnchor="middle">
            PROGRESS
          </text>
        </g>

        {/* Waiting */}
        <g transform="translate(1049, 128)">
          <rect x="0" y="0" width="86" height="76" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
          <text x="43" y="32" fill="#a5b4fc" fontSize="22" fontWeight="800" textAnchor="middle">
            {waitingCount}
          </text>
          <text x="43" y="52" fill="#e0e7ff" fontSize="9" fontWeight="600" textAnchor="middle">
            WAITING /
          </text>
          <text x="43" y="63" fill="#e0e7ff" fontSize="9" fontWeight="600" textAnchor="middle">
            QUEUED
          </text>
        </g>
      </g>

      {/* ─────────────────────────────────────────────────────────────
          2. STRATEGIC MISSION DISPLAY (Upper Center Conference Room)
      ───────────────────────────────────────────────────────────── */}
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
        <rect
          x="440"
          y="88"
          width="320"
          height="38"
          rx="8"
          fill={scene.missionRunning ? '#0c4a6e' : '#0f172a'}
          stroke={scene.missionRunning ? '#38bdf8' : '#334155'}
          strokeWidth="1.2"
        />
        <circle
          cx="458"
          cy="107"
          r="5"
          fill={scene.missionRunning ? '#10b981' : '#64748b'}
          className={scene.missionRunning ? 'office-pulse-working' : ''}
        />
        <text x="472" y="111" fill="#f8fafc" fontSize="11" fontWeight="600">
          {scene.missionRunning
            ? scene.activeMissionGoal
              ? scene.activeMissionGoal.length > 34
                ? `${scene.activeMissionGoal.slice(0, 33)}…`
                : scene.activeMissionGoal
              : 'Active Conductor Mission'
            : 'Strategic Council • Standing by'}
        </text>
        {scene.missionProgressPercent !== undefined && (
          <text x="748" y="111" fill="#38bdf8" fontSize="11" fontWeight="700" textAnchor="end">
            {scene.missionProgressPercent}%
          </text>
        )}
      </g>

      {/* ─────────────────────────────────────────────────────────────
          3. REVIEW & APPROVAL COUNTER (Lower Center Review Station)
      ───────────────────────────────────────────────────────────── */}
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
          x="440"
          y="445"
          width="320"
          height="42"
          rx="10"
          fill={scene.pendingApprovalCount > 0 ? '#451a03' : '#064e3b'}
          stroke={scene.pendingApprovalCount > 0 ? '#f59e0b' : '#059669'}
          strokeWidth={scene.pendingApprovalCount > 0 ? '1.8' : '1'}
          className={scene.pendingApprovalCount > 0 ? 'office-pulse-alert' : ''}
        />
        <text
          x="458"
          y="470"
          fill={scene.pendingApprovalCount > 0 ? '#fef3c7' : '#d1fae5'}
          fontSize="12"
          fontWeight="700"
        >
          {scene.pendingApprovalCount > 0
            ? `⚠️ ${scene.pendingApprovalCount} Pending Approval`
            : '✓ All Drafts & Entries Verified'}
        </text>
        <text
          x="748"
          y="470"
          fill={scene.pendingApprovalCount > 0 ? '#fbbf24' : '#6ee7b7'}
          fontSize="11"
          fontWeight="600"
          textAnchor="end"
        >
          {scene.pendingApprovalCount > 0 ? 'Review Queue ↗' : 'Settled'}
        </text>
      </g>
    </g>
  )
}
