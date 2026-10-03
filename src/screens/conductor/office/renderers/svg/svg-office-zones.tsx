/**
 * SVG Isometric Office Zones & Department Rooms
 * Phase I-C.2 — Game-Style Isometric Art Pass
 *
 * Renders physical room areas using floor rugs, low partition walls
 * with isometric depth, open doorways, and wall-mounted signage.
 * Replaces dashboard-card room containers with actual game-like
 * architectural spaces. All 7 zone IDs and accessible labels preserved.
 */

import React from 'react'
import type { OfficeZoneId } from '@/types/office-scene'

export interface SvgOfficeZonesProps {
  missionRunning?: boolean
  pendingApprovalCount?: number
  onZoneClick?: (zoneId: OfficeZoneId) => void
  selectedZoneId?: OfficeZoneId
}

/**
 * Renders a low isometric partition wall segment.
 */
function IsoPartition({
  x1,
  y1,
  x2,
  y2,
  wallHeight = 18,
  color = '#d8d2c8',
  sideColor = '#c8c0b4',
}: {
  x1: number; y1: number; x2: number; y2: number
  wallHeight?: number
  color?: string
  sideColor?: string
}) {
  // Wall face
  const isHorizontal = Math.abs(y2 - y1) < 2
  return (
    <g>
      {/* Wall front face */}
      <polygon
        points={`${x1},${y1} ${x2},${y2} ${x2},${y2 - wallHeight} ${x1},${y1 - wallHeight}`}
        fill={color}
        stroke={sideColor}
        strokeWidth="0.5"
      />
      {/* Wall top cap */}
      {isHorizontal && (
        <polygon
          points={`${x1},${y1 - wallHeight} ${x2},${y2 - wallHeight} ${x2 - 3},${y2 - wallHeight - 4} ${x1 - 3},${y1 - wallHeight - 4}`}
          fill={sideColor}
          opacity="0.6"
        />
      )}
    </g>
  )
}

/**
 * Renders a wall-mounted room sign plaque.
 */
function RoomSign({
  x, y, label, color, textColor,
}: {
  x: number; y: number; label: string; color: string; textColor: string
}) {
  const w = Math.min(label.length * 7.5 + 20, 200)
  return (
    <g>
      {/* Sign backing plate */}
      <rect
        x={x}
        y={y}
        width={w}
        height="20"
        rx="3"
        fill={color}
        stroke={textColor}
        strokeWidth="0.8"
        strokeOpacity="0.4"
        filter="url(#badge-soft-shadow)"
      />
      <text
        x={x + w / 2}
        y={y + 14}
        fill={textColor}
        fontSize="10"
        fontWeight="700"
        textAnchor="middle"
        letterSpacing="0.06em"
      >
        {label}
      </text>
    </g>
  )
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
      {/* ═══════════════════════════════════════════════════
          1. EXECUTIVE SUITE (Upper Left: 30–370, 50–325)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-executive"
        role="button"
        tabIndex={0}
        aria-label="Executive Suite"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('executive')}
        onKeyDown={(e) => handleKeyDown(e, 'executive')}
      >
        {/* Floor rug (soft lavender) */}
        <polygon
          points="40,70 360,70 370,320 30,320"
          fill="url(#grad-room-executive-light)"
          fillOpacity="0.65"
          stroke={selectedZoneId === 'executive' ? '#7c3aed' : 'none'}
          strokeWidth="2"
        />

        {/* East partition wall with glass section */}
        <IsoPartition x1={370} y1={320} x2={370} y2={70} wallHeight={22} />
        {/* Glass section in wall */}
        <rect x="368" y="100" width="4" height="80" fill="#c8e6f8" fillOpacity="0.5" rx="1" />

        {/* South partition wall with doorway gap (160–250) */}
        <IsoPartition x1={30} y1={325} x2={155} y2={325} wallHeight={16} />
        <IsoPartition x1={255} y1={325} x2={370} y2={325} wallHeight={16} />

        {/* Room sign */}
        <RoomSign x={48} y={58} label="EXECUTIVE" color="#f0eaff" textColor="#6d28d9" />
      </g>

      {/* ═══════════════════════════════════════════════════
          2. STRATEGIC CONFERENCE ROOM (Upper Center: 390–790, 50–325)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-meeting_room"
        role="button"
        tabIndex={0}
        aria-label="Strategic Conference Room"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('meeting_room')}
        onKeyDown={(e) => handleKeyDown(e, 'meeting_room')}
      >
        {/* Floor treatment (subtle periwinkle) */}
        <polygon
          points="390,70 790,70 800,320 380,320"
          fill="url(#grad-room-conference-light)"
          fillOpacity="0.55"
          stroke={
            selectedZoneId === 'meeting_room'
              ? '#6366f1'
              : missionRunning
                ? '#6366f1'
                : 'none'
          }
          strokeWidth="2"
        />

        {/* Left glass partition */}
        <rect x="386" y="80" width="4" height="230" fill="#c8e6f8" fillOpacity="0.35" rx="1" />

        {/* Right glass partition */}
        <rect x="794" y="80" width="4" height="230" fill="#c8e6f8" fillOpacity="0.35" rx="1" />

        {/* South partition with doorway (545–655) */}
        <IsoPartition x1={380} y1={325} x2={540} y2={325} wallHeight={16} />
        <IsoPartition x1={660} y1={325} x2={800} y2={325} wallHeight={16} />

        {/* Room sign */}
        <RoomSign
          x={470}
          y={58}
          label={missionRunning ? '● CONFERENCE' : 'CONFERENCE'}
          color={missionRunning ? '#e0e7ff' : '#f0eef8'}
          textColor={missionRunning ? '#4338ca' : '#4338ca'}
        />
      </g>

      {/* ═══════════════════════════════════════════════════
          3. WORK INBOX & OPERATIONS (Upper Right: 810–1170, 50–325)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-inbox_board"
        role="button"
        tabIndex={0}
        aria-label="Work Inbox and Operations Board"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('inbox_board')}
        onKeyDown={(e) => handleKeyDown(e, 'inbox_board')}
      >
        {/* Floor rug (mint/teal) */}
        <polygon
          points="810,70 1170,70 1170,320 810,320"
          fill="url(#grad-room-inbox-light)"
          fillOpacity="0.55"
          stroke={selectedZoneId === 'inbox_board' ? '#0d9488' : 'none'}
          strokeWidth="2"
        />

        {/* Left partition wall */}
        <IsoPartition x1={810} y1={320} x2={810} y2={70} wallHeight={22} />
        {/* Glass section */}
        <rect x="808" y="100" width="4" height="80" fill="#c8e6f8" fillOpacity="0.5" rx="1" />

        {/* South partition with doorway (935–1055) */}
        <IsoPartition x1={810} y1={325} x2={930} y2={325} wallHeight={16} />
        <IsoPartition x1={1060} y1={325} x2={1170} y2={325} wallHeight={16} />

        {/* Room sign */}
        <RoomSign x={860} y={58} label="OPERATIONS" color="#e8f8f2" textColor="#0f766e" />
      </g>

      {/* ═══════════════════════════════════════════════════
          4. FINANCE & ACCOUNTING (Lower Left: 30–370, 405–685)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-finance"
        role="button"
        tabIndex={0}
        aria-label="Finance and Accounting Wing"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('finance')}
        onKeyDown={(e) => handleKeyDown(e, 'finance')}
      >
        {/* Floor rug (sage green) */}
        <polygon
          points="30,410 370,410 360,680 40,680"
          fill="url(#grad-room-finance-light)"
          fillOpacity="0.6"
          stroke={selectedZoneId === 'finance' ? '#059669' : 'none'}
          strokeWidth="2"
        />

        {/* East partition wall */}
        <IsoPartition x1={370} y1={680} x2={370} y2={410} wallHeight={22} />
        <rect x="368" y="480" width="4" height="80" fill="#c8e6f8" fillOpacity="0.5" rx="1" />

        {/* North partition with doorway (155–255) */}
        <IsoPartition x1={30} y1={405} x2={155} y2={405} wallHeight={16} />
        <IsoPartition x1={255} y1={405} x2={370} y2={405} wallHeight={16} />

        {/* Room sign */}
        <RoomSign x={48} y={418} label="FINANCE" color="#e6f7ef" textColor="#047857" />
      </g>

      {/* ═══════════════════════════════════════════════════
          5. REVIEW & APPROVAL STATION (Lower Center: 390–790, 405–685)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-review_station"
        role="button"
        tabIndex={0}
        aria-label="Review and Approval Station"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('review_station')}
        onKeyDown={(e) => handleKeyDown(e, 'review_station')}
      >
        {/* Floor rug (warm amber) */}
        <polygon
          points="390,410 800,410 790,680 380,680"
          fill="url(#grad-room-review-light)"
          fillOpacity="0.55"
          stroke={
            pendingApprovalCount > 0
              ? '#d97706'
              : selectedZoneId === 'review_station'
                ? '#f59e0b'
                : 'none'
          }
          strokeWidth="2"
        />

        {/* Left partition */}
        <rect x="386" y="420" width="4" height="250" fill="#c8e6f8" fillOpacity="0.3" rx="1" />

        {/* Right partition */}
        <rect x="794" y="420" width="4" height="250" fill="#c8e6f8" fillOpacity="0.3" rx="1" />

        {/* North partition with doorway (540–660) */}
        <IsoPartition x1={380} y1={405} x2={540} y2={405} wallHeight={16} />
        <IsoPartition x1={660} y1={405} x2={800} y2={405} wallHeight={16} />

        {/* Room sign */}
        <RoomSign
          x={470}
          y={418}
          label={pendingApprovalCount > 0 ? `⚖ REVIEW (${pendingApprovalCount})` : 'REVIEW'}
          color={pendingApprovalCount > 0 ? '#fef8e8' : '#fef8e8'}
          textColor="#b45309"
        />
      </g>

      {/* ═══════════════════════════════════════════════════
          6. ENGINEERING BAY (Lower Right: 810–1170, 405–685)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-engineering"
        role="button"
        tabIndex={0}
        aria-label="Engineering Bay"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('engineering')}
        onKeyDown={(e) => handleKeyDown(e, 'engineering')}
      >
        {/* Floor rug (sky blue) */}
        <polygon
          points="810,410 1170,410 1170,680 810,680"
          fill="url(#grad-room-engineering-light)"
          fillOpacity="0.55"
          stroke={selectedZoneId === 'engineering' ? '#0284c7' : 'none'}
          strokeWidth="2"
        />

        {/* Left partition wall */}
        <IsoPartition x1={810} y1={680} x2={810} y2={410} wallHeight={22} />
        <rect x="808" y="480" width="4" height="80" fill="#c8e6f8" fillOpacity="0.5" rx="1" />

        {/* North partition with doorway (930–1060) */}
        <IsoPartition x1={810} y1={405} x2={930} y2={405} wallHeight={16} />
        <IsoPartition x1={1060} y1={405} x2={1170} y2={405} wallHeight={16} />

        {/* Room sign */}
        <RoomSign x={860} y={418} label="ENGINEERING" color="#e6f2fd" textColor="#0369a1" />
      </g>

      {/* ═══════════════════════════════════════════════════
          7. STAFF LOUNGE & COFFEE (Upper Right Corner nook)
      ═══════════════════════════════════════════════════ */}
      <g
        id="zone-lounge_break"
        role="button"
        tabIndex={0}
        aria-label="Staff Lounge and Coffee Bar"
        className="office-interactive-focus cursor-pointer"
        onClick={() => onZoneClick?.('lounge_break')}
        onKeyDown={(e) => handleKeyDown(e, 'lounge_break')}
      >
        {/* Small accent rug (warm rose) */}
        <rect
          x="850"
          y="240"
          width="300"
          height="70"
          rx="4"
          fill="#fce4ec"
          fillOpacity="0.4"
        />
        <RoomSign x={860} y={248} label="☕ LOUNGE" color="#fce4ec" textColor="#9f1239" />
      </g>
    </g>
  )
}
