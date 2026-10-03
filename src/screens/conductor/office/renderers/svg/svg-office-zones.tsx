/**
 * SVG Office Zones & Department Rooms
 *
 * Renders department boundaries, glass partitions, and accessible room labels.
 */

import React from 'react'
import type { OfficeZoneId } from '@/types/office-scene'

export interface SvgOfficeZonesProps {
  missionRunning?: boolean
  pendingApprovalCount?: number
  onZoneClick?: (zoneId: OfficeZoneId) => void
  selectedZoneId?: OfficeZoneId
}

export function SvgOfficeZones({
  missionRunning = false,
  pendingApprovalCount = 0,
  onZoneClick,
  selectedZoneId,
}: SvgOfficeZonesProps) {
  const handleKeyDown = (e: React.KeyboardEvent, zoneId: OfficeZoneId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onZoneClick?.(zoneId)
    }
  }

  return (
    <g id="office-zones-layer">
      {/* 1. Executive Suite (Upper Left) */}
      <g
        id="zone-executive"
        role="button"
        tabIndex={0}
        aria-label="Executive Suite"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('executive')}
        onKeyDown={(e) => handleKeyDown(e, 'executive')}
      >
        <rect
          x="30"
          y="45"
          width="350"
          height="280"
          rx="16"
          fill="url(#grad-room-executive)"
          stroke={selectedZoneId === 'executive' ? '#c084fc' : '#a855f7'}
          strokeWidth={selectedZoneId === 'executive' ? '2.5' : '1.5'}
          strokeOpacity={selectedZoneId === 'executive' ? '0.9' : '0.45'}
        />
        {/* Header Ribbon */}
        <path
          d="M 30,61 A 16,16 0 0 1 46,45 L 364,45 A 16,16 0 0 1 380,61 L 380,82 L 30,82 Z"
          fill="#3b0764"
          fillOpacity="0.4"
        />
        <text x="48" y="69" fill="#e9d5ff" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          👔 EXECUTIVE SUITE
        </text>
        <text x="362" y="68" fill="#c084fc" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          Orchestration HQ
        </text>
      </g>

      {/* 2. Strategic Conference Room (Upper Center) */}
      <g
        id="zone-meeting_room"
        role="button"
        tabIndex={0}
        aria-label="Strategic Conference Room"
        className={`office-interactive-focus cursor-pointer ${
          missionRunning ? 'office-pulse-mission' : ''
        }`}
        onClick={() => onZoneClick?.('meeting_room')}
        onKeyDown={(e) => handleKeyDown(e, 'meeting_room')}
      >
        <rect
          x="400"
          y="45"
          width="400"
          height="280"
          rx="16"
          fill="url(#grad-room-conference)"
          stroke={
            selectedZoneId === 'meeting_room'
              ? '#38bdf8'
              : missionRunning
                ? '#0ea5e9'
                : '#475569'
          }
          strokeWidth={missionRunning || selectedZoneId === 'meeting_room' ? '2.5' : '1.5'}
          strokeOpacity={missionRunning ? '0.85' : '0.4'}
        />
        {/* Header Ribbon */}
        <path
          d="M 400,61 A 16,16 0 0 1 416,45 L 784,45 A 16,16 0 0 1 800,61 L 800,82 L 400,82 Z"
          fill="#0c4a6e"
          fillOpacity={missionRunning ? '0.5' : '0.25'}
        />
        <text x="418" y="69" fill="#bae6fd" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          🏛️ STRATEGIC CONFERENCE ROOM
        </text>
        <text x="782" y="68" fill="#7dd3fc" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          {missionRunning ? 'Active Mission Session' : 'Ready'}
        </text>
      </g>

      {/* 3. Work Inbox & Operations (Upper Right) */}
      <g
        id="zone-inbox_board"
        role="button"
        tabIndex={0}
        aria-label="Work Inbox and Operations Board"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('inbox_board')}
        onKeyDown={(e) => handleKeyDown(e, 'inbox_board')}
      >
        <rect
          x="820"
          y="45"
          width="350"
          height="280"
          rx="16"
          fill="url(#grad-room-inbox)"
          stroke={selectedZoneId === 'inbox_board' ? '#2dd4bf' : '#14b8a6'}
          strokeWidth={selectedZoneId === 'inbox_board' ? '2.5' : '1.5'}
          strokeOpacity={selectedZoneId === 'inbox_board' ? '0.9' : '0.45'}
        />
        {/* Header Ribbon */}
        <path
          d="M 820,61 A 16,16 0 0 1 836,45 L 1154,45 A 16,16 0 0 1 1170,61 L 1170,82 L 820,82 Z"
          fill="#134e4a"
          fillOpacity="0.4"
        />
        <text x="838" y="69" fill="#ccfbf1" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          📋 WORK INBOX & OPERATIONS
        </text>
        <text x="1152" y="68" fill="#5eead4" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          Central Dispatch
        </text>
      </g>

      {/* 4. Finance & Accounting Wing (Lower Left) */}
      <g
        id="zone-finance"
        role="button"
        tabIndex={0}
        aria-label="Finance and Accounting Wing"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('finance')}
        onKeyDown={(e) => handleKeyDown(e, 'finance')}
      >
        <rect
          x="30"
          y="405"
          width="350"
          height="280"
          rx="16"
          fill="url(#grad-room-finance)"
          stroke={selectedZoneId === 'finance' ? '#34d399' : '#10b981'}
          strokeWidth={selectedZoneId === 'finance' ? '2.5' : '1.5'}
          strokeOpacity={selectedZoneId === 'finance' ? '0.9' : '0.45'}
        />
        {/* Header Ribbon */}
        <path
          d="M 30,421 A 16,16 0 0 1 46,405 L 364,405 A 16,16 0 0 1 380,421 L 380,442 L 30,442 Z"
          fill="#064e3b"
          fillOpacity="0.45"
        />
        <text x="48" y="429" fill="#d1fae5" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          📊 FINANCE & ACCOUNTING WING
        </text>
        <text x="362" y="428" fill="#6ee7b7" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          Authoritative Ledger
        </text>
      </g>

      {/* 5. Review & Approval Station (Lower Center) */}
      <g
        id="zone-review_station"
        role="button"
        tabIndex={0}
        aria-label="Review and Approval Station"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('review_station')}
        onKeyDown={(e) => handleKeyDown(e, 'review_station')}
      >
        <rect
          x="400"
          y="405"
          width="400"
          height="280"
          rx="16"
          fill="url(#grad-room-review)"
          stroke={
            pendingApprovalCount > 0
              ? '#f59e0b'
              : selectedZoneId === 'review_station'
                ? '#fbbf24'
                : '#64748b'
          }
          strokeWidth={
            pendingApprovalCount > 0 || selectedZoneId === 'review_station'
              ? '2.5'
              : '1.5'
          }
          strokeOpacity={pendingApprovalCount > 0 ? '0.85' : '0.4'}
        />
        {/* Header Ribbon */}
        <path
          d="M 400,421 A 16,16 0 0 1 416,405 L 784,405 A 16,16 0 0 1 800,421 L 800,442 L 400,442 Z"
          fill="#78350f"
          fillOpacity="0.4"
        />
        <text x="418" y="429" fill="#fef3c7" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          ⚖️ APPROVAL & REVIEW STATION
        </text>
        <text x="782" y="428" fill="#fcd34d" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          Dual-Control Sign-off
        </text>
      </g>

      {/* 6. Engineering Bay (Lower Right) */}
      <g
        id="zone-engineering"
        role="button"
        tabIndex={0}
        aria-label="Engineering Bay"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('engineering')}
        onKeyDown={(e) => handleKeyDown(e, 'engineering')}
      >
        <rect
          x="820"
          y="405"
          width="350"
          height="280"
          rx="16"
          fill="url(#grad-room-engineering)"
          stroke={selectedZoneId === 'engineering' ? '#38bdf8' : '#0284c7'}
          strokeWidth={selectedZoneId === 'engineering' ? '2.5' : '1.5'}
          strokeOpacity={selectedZoneId === 'engineering' ? '0.9' : '0.45'}
        />
        {/* Header Ribbon */}
        <path
          d="M 820,421 A 16,16 0 0 1 836,405 L 1154,405 A 16,16 0 0 1 1170,421 L 1170,442 L 820,442 Z"
          fill="#0369a1"
          fillOpacity="0.4"
        />
        <text x="838" y="429" fill="#e0f2fe" fontSize="13" fontWeight="700" letterSpacing="0.06em">
          💻 ENGINEERING BAY
        </text>
        <text x="1152" y="428" fill="#7dd3fc" fontSize="10" fontWeight="500" textAnchor="end" fillOpacity="0.8">
          Systems & Architecture
        </text>
      </g>

      {/* 7. Staff Lounge & Coffee Bar Label (Inside Operations, bottom of upper right) */}
      <g
        id="zone-lounge_break"
        role="button"
        tabIndex={0}
        aria-label="Staff Lounge and Coffee Bar"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('lounge_break')}
        onKeyDown={(e) => handleKeyDown(e, 'lounge_break')}
      >
        <rect
          x="840"
          y="235"
          width="310"
          height="75"
          rx="10"
          fill="#1e293b"
          fillOpacity="0.5"
          stroke="#475569"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 4"
        />
        <text x="855" y="254" fill="#94a3b8" fontSize="11" fontWeight="600" letterSpacing="0.04em">
          ☕ STAFF LOUNGE & RECOVERY
        </text>
      </g>
    </g>
  )
}
