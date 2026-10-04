/**
 * SVG Isometric Office Furniture
 * Phase I-C.2 — Game-Style Isometric Art Pass
 *
 * Renders pseudo-isometric game-like furniture with 3-face shading
 * (top, front, side). Each asset uses simple polygon shapes with
 * cartoon lighting: bright top face, medium front, slightly darker side.
 *
 * When staff are away, their desk shows a clean empty state with
 * a compact away badge. No duplicate avatars.
 */

import React from 'react'
import type { OfficeSceneState } from '@/types/office-scene'

/* ─── Reusable Isometric Furniture Primitives ─── */

/** Isometric desk with 3-face depth (top / front / side) */
function IsoDesk({
  x, y, w = 100, d = 50, h = 12,
  topColor = '#e8c98e', frontColor = '#c4935f', sideColor = '#a67c52',
}: {
  x: number; y: number; w?: number; d?: number; h?: number
  topColor?: string; frontColor?: string; sideColor?: string
}) {
  // Top face (parallelogram tilted to the right)
  const top = `${x},${y} ${x + w},${y} ${x + w + d * 0.4},${y - d * 0.5} ${x + d * 0.4},${y - d * 0.5}`
  // Front face
  const front = `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`
  // Right side face
  const side = `${x + w},${y} ${x + w + d * 0.4},${y - d * 0.5} ${x + w + d * 0.4},${y - d * 0.5 + h} ${x + w},${y + h}`

  return (
    <g>
      <polygon points={front} fill={frontColor} stroke={sideColor} strokeWidth="0.5" />
      <polygon points={side} fill={sideColor} stroke={sideColor} strokeWidth="0.5" />
      <polygon points={top} fill={topColor} stroke={sideColor} strokeWidth="0.5" />
    </g>
  )
}

/** Isometric office chair (simple rounded block) */
function IsoChair({
  x, y, color = '#475569', seatW = 22, seatD = 16, backH = 18,
}: {
  x: number; y: number; color?: string; seatW?: number; seatD?: number; backH?: number
}) {
  const darkerColor = darken(color, 20)
  return (
    <g>
      {/* Chair back */}
      <rect x={x + 2} y={y - backH} width={seatW - 4} height={backH} rx="4" fill={color} stroke={darkerColor} strokeWidth="0.5" />
      {/* Chair seat top */}
      <ellipse cx={x + seatW / 2} cy={y} rx={seatW / 2} ry={seatD / 2.5} fill={color} stroke={darkerColor} strokeWidth="0.5" />
      {/* Chair base/pedestal */}
      <line x1={x + seatW / 2} y1={y + 4} x2={x + seatW / 2} y2={y + 10} stroke="#94a3b8" strokeWidth="2" />
      {/* Chair star base */}
      <ellipse cx={x + seatW / 2} cy={y + 11} rx={seatW / 2.5} ry={3} fill="#94a3b8" fillOpacity="0.6" />
    </g>
  )
}

/** Isometric computer monitor */
function IsoMonitor({
  x,
  y,
  w = 44,
  h = 28,
  screenColor = '#e0f2fe',
  borderColor = '#334155',
  isLive = false,
  neonColor = '#38bdf8',
  children,
}: {
  x: number
  y: number
  w?: number
  h?: number
  screenColor?: string
  borderColor?: string
  isLive?: boolean
  neonColor?: string
  children?: React.ReactNode
}) {
  return (
    <g className={isLive ? 'office-monitor-active' : ''}>
      {/* Monitor stand */}
      <rect x={x + w / 2 - 3} y={y + h} width={6} height={8} fill="#94a3b8" />
      <ellipse cx={x + w / 2} cy={y + h + 9} rx={10} ry={3} fill="#94a3b8" fillOpacity="0.5" />
      {/* Monitor bezel */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="3"
        fill={borderColor}
        stroke={isLive ? neonColor : 'none'}
        strokeWidth={isLive ? 1 : 0}
      />
      {/* Screen */}
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 6}
        rx="1.5"
        fill={isLive ? '#090d16' : screenColor}
      />
      {/* Animated neon code / data lines when agent is live in chat */}
      {isLive ? (
        <g className="office-monitor-code-stream">
          <line x1={x + 4} y1={y + 6} x2={x + w - 7} y2={y + 6} stroke={neonColor} strokeWidth="1.2" strokeLinecap="round" />
          <line x1={x + 4} y1={y + 11} x2={x + w - 13} y2={y + 11} stroke={neonColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <line x1={x + 4} y1={y + 16} x2={x + w - 5} y2={y + 16} stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          <line x1={x + 4} y1={y + 20} x2={x + w - 11} y2={y + 20} stroke={neonColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </g>
      ) : (
        children
      )}
    </g>
  )
}

/** Isometric coffee mug with rising steam */
function IsoCoffeeMug({ x, y, hasSteam = true }: { x: number; y: number; hasSteam?: boolean }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-4" y="0" width="8" height="7" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
      <path d="M 4,1.5 C 6,1.5 6,5 4,5" fill="none" stroke="#cbd5e1" strokeWidth="0.8" />
      <ellipse cx="0" cy="0.8" rx="3" ry="1" fill="#451a03" />
      {hasSteam && (
        <g className="office-coffee-steam">
          <path d="M -1,-2 Q 1,-4 -1,-6" fill="none" stroke="#cbd5e1" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
          <path d="M 1,-3 Q -1,-5 1,-7" fill="none" stroke="#cbd5e1" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
        </g>
      )}
    </g>
  )
}

/** Small isometric bookshelf */
function IsoBookshelf({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Shelf body */}
      <rect x={x} y={y} width="32" height="48" rx="2" fill="#c4935f" stroke="#a67c52" strokeWidth="0.8" />
      {/* Side face */}
      <polygon points={`${x + 32},${y} ${x + 42},${y - 6} ${x + 42},${y + 42} ${x + 32},${y + 48}`} fill="#a67c52" />
      {/* Shelves */}
      <line x1={x + 2} y1={y + 16} x2={x + 30} y2={y + 16} stroke="#8b6843" strokeWidth="1" />
      <line x1={x + 2} y1={y + 32} x2={x + 30} y2={y + 32} stroke="#8b6843" strokeWidth="1" />
      {/* Books */}
      <rect x={x + 3} y={y + 3} width="5" height="12" rx="0.5" fill="#6366f1" />
      <rect x={x + 9} y={y + 4} width="4" height="11" rx="0.5" fill="#ef4444" />
      <rect x={x + 14} y={y + 3} width="5" height="12" rx="0.5" fill="#0284c7" />
      <rect x={x + 20} y={y + 5} width="4" height="10" rx="0.5" fill="#10b981" />
      <rect x={x + 4} y={y + 18} width="6" height="12" rx="0.5" fill="#f59e0b" />
      <rect x={x + 11} y={y + 19} width="5" height="11" rx="0.5" fill="#8b5cf6" />
      <rect x={x + 18} y={y + 18} width="4" height="12" rx="0.5" fill="#dc2626" />
      <rect x={x + 5} y={y + 34} width="5" height="12" rx="0.5" fill="#0d9488" />
      <rect x={x + 12} y={y + 35} width="6" height="11" rx="0.5" fill="#d97706" />
    </g>
  )
}

/** Small potted plant with cartoon leaves */
function IsoPlant({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${size})`}>
      {/* Ground shadow */}
      <ellipse cx="0" cy="22" rx="10" ry="4" fill="#5c4a2e" fillOpacity="0.1" />
      {/* Pot */}
      <polygon points="-8,22 8,22 6,10 -6,10" fill="#d97706" stroke="#b45309" strokeWidth="0.6" />
      <rect x="-7" y="9" width="14" height="3" rx="1" fill="#b45309" />
      {/* Foliage */}
      <circle cx="0" cy="2" r="8" fill="#22c55e" />
      <circle cx="-5" cy="-3" r="6" fill="#16a34a" />
      <circle cx="5" cy="-3" r="6" fill="#4ade80" />
      <circle cx="0" cy="-7" r="5" fill="#22c55e" />
    </g>
  )
}

/** Isometric filing cabinet */
function IsoCabinet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Front face */}
      <rect x={x} y={y} width="26" height="40" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
      {/* Side face */}
      <polygon points={`${x + 26},${y} ${x + 34},${y - 5} ${x + 34},${y + 35} ${x + 26},${y + 40}`} fill="#64748b" />
      {/* Top face */}
      <polygon points={`${x},${y} ${x + 26},${y} ${x + 34},${y - 5} ${x + 8},${y - 5}`} fill="#b0bec5" />
      {/* Drawer lines */}
      <line x1={x + 3} y1={y + 13} x2={x + 23} y2={y + 13} stroke="#475569" strokeWidth="0.6" />
      <line x1={x + 3} y1={y + 26} x2={x + 23} y2={y + 26} stroke="#475569" strokeWidth="0.6" />
      {/* Drawer handles */}
      <rect x={x + 10} y={y + 5} width="6" height="2" rx="1" fill="#475569" />
      <rect x={x + 10} y={y + 18} width="6" height="2" rx="1" fill="#475569" />
      <rect x={x + 10} y={y + 31} width="6" height="2" rx="1" fill="#475569" />
    </g>
  )
}

/** Isometric whiteboard */
function IsoWhiteboard({ x, y, w = 80, h = 50 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      {/* Board backing */}
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Tray at bottom */}
      <rect x={x + 5} y={y + h - 4} width={w - 10} height="5" rx="1" fill="#e2e8f0" />
      {/* Marker lines */}
      <line x1={x + 10} y1={y + 12} x2={x + w - 15} y2={y + 12} stroke="#6366f1" strokeWidth="1.2" />
      <line x1={x + 10} y1={y + 22} x2={x + w / 2} y2={y + 22} stroke="#ef4444" strokeWidth="1" />
      <line x1={x + 10} y1={y + 30} x2={x + w - 20} y2={y + 30} stroke="#0284c7" strokeWidth="1" />
    </g>
  )
}

/** Small isometric server rack */
function IsoServerRack({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Rack body */}
      <rect x={x} y={y} width="20" height="40" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
      {/* Side face */}
      <polygon points={`${x + 20},${y} ${x + 26},${y - 4} ${x + 26},${y + 36} ${x + 20},${y + 40}`} fill="#0f172a" />
      {/* Top */}
      <polygon points={`${x},${y} ${x + 20},${y} ${x + 26},${y - 4} ${x + 6},${y - 4}`} fill="#334155" />
      {/* Drive bays / LEDs */}
      <rect x={x + 3} y={y + 4} width="14" height="4" rx="0.5" fill="#334155" />
      <circle cx={x + 5} cy={y + 6} r="1.2" fill="#22c55e" />
      <rect x={x + 3} y={y + 10} width="14" height="4" rx="0.5" fill="#334155" />
      <circle cx={x + 5} cy={y + 12} r="1.2" fill="#22c55e" />
      <rect x={x + 3} y={y + 16} width="14" height="4" rx="0.5" fill="#334155" />
      <circle cx={x + 5} cy={y + 18} r="1.2" fill="#3b82f6" />
      <rect x={x + 3} y={y + 22} width="14" height="4" rx="0.5" fill="#334155" />
      <circle cx={x + 5} cy={y + 24} r="1.2" fill="#22c55e" />
      {/* Ventilation */}
      <line x1={x + 3} y1={y + 30} x2={x + 17} y2={y + 30} stroke="#475569" strokeWidth="0.5" />
      <line x1={x + 3} y1={y + 33} x2={x + 17} y2={y + 33} stroke="#475569" strokeWidth="0.5" />
      <line x1={x + 3} y1={y + 36} x2={x + 17} y2={y + 36} stroke="#475569" strokeWidth="0.5" />
    </g>
  )
}

/** Isometric coffee machine */
function IsoCoffeeMachine({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Machine body */}
      <rect x={x} y={y} width="24" height="28" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
      {/* Side */}
      <polygon points={`${x + 24},${y} ${x + 30},${y - 4} ${x + 30},${y + 24} ${x + 24},${y + 28}`} fill="#1e293b" />
      {/* Top */}
      <polygon points={`${x},${y} ${x + 24},${y} ${x + 30},${y - 4} ${x + 6},${y - 4}`} fill="#475569" />
      {/* Display / button */}
      <rect x={x + 4} y={y + 4} width="16" height="8" rx="1" fill="#0f172a" />
      <circle cx={x + 12} cy={y + 8} r="2" fill="#22c55e" />
      {/* Drip tray */}
      <rect x={x + 3} y={y + 18} width="18" height="4" rx="1" fill="#94a3b8" />
      {/* Cup */}
      <rect x={x + 8} y={y + 14} width="8" height="7" rx="1.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
    </g>
  )
}

/** Isometric sofa */
function IsoSofa({ x, y, w = 60 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      {/* Back rest */}
      <rect x={x} y={y - 10} width={w} height="14" rx="4" fill="#a3a3a3" stroke="#737373" strokeWidth="0.6" />
      {/* Seat cushion */}
      <rect x={x + 2} y={y + 2} width={w - 4} height="16" rx="4" fill="#d4d4d4" stroke="#a3a3a3" strokeWidth="0.5" />
      {/* Armrests */}
      <rect x={x - 4} y={y - 8} width="8" height="26" rx="4" fill="#a3a3a3" stroke="#737373" strokeWidth="0.5" />
      <rect x={x + w - 4} y={y - 8} width="8" height="26" rx="4" fill="#a3a3a3" stroke="#737373" strokeWidth="0.5" />
    </g>
  )
}

/** Isometric side table */
function IsoSideTable({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Table top */}
      <ellipse cx={x} cy={y} rx="12" ry="6" fill="#d4a373" stroke="#a67c52" strokeWidth="0.5" />
      {/* Leg */}
      <line x1={x} y1={y} x2={x} y2={y + 14} stroke="#a67c52" strokeWidth="2" />
      <ellipse cx={x} cy={y + 15} rx="8" ry="3" fill="#a67c52" fillOpacity="0.4" />
    </g>
  )
}

/** Isometric notice board */
function IsoNoticeBoard({ x, y, w = 80, h = 50 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      {/* Board */}
      <rect x={x} y={y} width={w} height={h} rx="3" fill="url(#grad-cork)" stroke="#b45309" strokeWidth="2" filter="url(#badge-soft-shadow)" />
      {/* Frame top */}
      <rect x={x - 1} y={y - 1} width={w + 2} height="4" rx="1" fill="#8b6843" />
    </g>
  )
}

// Simple darken helper
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount)
  const b = Math.max(0, (num & 0x0000ff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}


/* ═══════════════════════════════════════════════
   MAIN FURNITURE LAYER
═══════════════════════════════════════════════ */
export function SvgOfficeFurniture({ scene }: { scene?: OfficeSceneState }) {
  const cos = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-chief-of-staff')
  const isCosAway = Boolean(cos?.targetZoneId && cos.targetZoneId !== 'executive')
  const isCosLive = Boolean(cos?.liveActivity && !isCosAway)

  const acct = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')
  const isAcctAway = Boolean(acct?.targetZoneId && acct.targetZoneId !== 'finance')
  const isAcctLive = Boolean(acct?.liveActivity && !isAcctAway)

  const dev = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-developer')
  const isDevAway = Boolean(dev?.targetZoneId && dev.targetZoneId !== 'engineering')
  const isDevLive = Boolean(dev?.liveActivity && !isDevAway)

  return (
    <g id="office-furniture-layer" pointerEvents="none">
      {/* ═══ 1. EXECUTIVE SUITE ═══ */}
      <g id="furniture-executive">
        {/* Executive desk (larger, warm oak) */}
        <IsoDesk x={120} y={210} w={120} d={55} h={14} />

        {/* Chair behind desk */}
        <IsoChair x={163} y={160} color="#312e81" />

        {/* Executive monitor with live streaming neon lines */}
        <IsoMonitor
          x={155}
          y={170}
          w={50}
          h={30}
          borderColor="#1e293b"
          isLive={isCosLive}
          neonColor="#a855f7"
        >
          {/* Executive dashboard line */}
          <polyline
            points="159,185 168,180 176,188 184,176 192,182 199,178"
            fill="none" stroke="#6366f1" strokeWidth="1.2"
          />
        </IsoMonitor>

        {/* Executive coffee mug with steam */}
        <IsoCoffeeMug x={224} y={224} hasSteam={!isCosAway} />

        {/* Bookshelf against back wall */}
        <IsoBookshelf x={60} y={80} />

        {/* Plant in corner */}
        <IsoPlant x={320} y={90} size={1.1} />

        {/* Ezity logo on wall */}
        <g transform="translate(100, 100)">
          <rect x="0" y="0" width="40" height="20" rx="3" fill="#f0eaff" stroke="#c4b5fd" strokeWidth="0.8" />
          <text x="20" y="14" fill="#6d28d9" fontSize="7" fontWeight="800" textAnchor="middle">EZity</text>
        </g>

        {/* Away badge */}
        {isCosAway && (
          <g transform="translate(185, 240)" textAnchor="middle">
            <rect x="-36" y="-8" width="72" height="16" rx="8" fill="#f0eaff" stroke="#8b5cf6" strokeWidth="1" filter="url(#badge-soft-shadow)" />
            <text x="0" y="4" fill="#6d28d9" fontSize="8.5" fontWeight="700">In Meeting ↗</text>
          </g>
        )}
      </g>

      {/* ═══ 2. CONFERENCE ROOM ═══ */}
      <g id="furniture-conference">
        {/* Large oval conference table */}
        <ellipse cx="600" cy="200" rx="110" ry="50" fill="#d4a373" stroke="#a67c52" strokeWidth="1.5" />
        <ellipse cx="600" cy="195" rx="105" ry="46" fill="#e8c98e" stroke="#c4935f" strokeWidth="0.8" />

        {/* Center table tech hub */}
        <circle cx="600" cy="195" r="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="600" cy="195" r="3" fill="#6366f1" />

        {/* 6 Conference chairs (3 top, 3 bottom) */}
        <IsoChair x={530} y={148} color="#475569" seatW={18} seatD={12} backH={14} />
        <IsoChair x={586} y={143} color="#475569" seatW={18} seatD={12} backH={14} />
        <IsoChair x={642} y={148} color="#475569" seatW={18} seatD={12} backH={14} />
        <IsoChair x={530} y={252} color="#475569" seatW={18} seatD={12} backH={0} />
        <IsoChair x={586} y={257} color="#475569" seatW={18} seatD={12} backH={0} />
        <IsoChair x={642} y={252} color="#475569" seatW={18} seatD={12} backH={0} />

        {/* Whiteboard on north wall */}
        <IsoWhiteboard x={690} y={72} w={90} h={45} />

        {/* Plant in corner */}
        <IsoPlant x={760} y={90} />
      </g>

      {/* ═══ 3. WORK INBOX / OPERATIONS ═══ */}
      <g id="furniture-inbox">
        {/* Large notice board on back wall */}
        <IsoNoticeBoard x={860} y={85} w={270} h={120} />

        {/* Small operations desk */}
        <IsoDesk x={900} y={230} w={80} d={35} h={10} />
        <IsoMonitor x={920} y={200} w={40} h={24} screenColor="#e8f8f2">
          <text x="930" y="216" fill="#0f766e" fontSize="7" fontWeight="600">INBOX</text>
        </IsoMonitor>
      </g>

      {/* ═══ 4. FINANCE WING ═══ */}
      <g id="furniture-finance">
        {/* Accountant desk */}
        <IsoDesk x={120} y={560} w={120} d={55} h={14} />

        {/* Chair */}
        <IsoChair x={163} y={510} color="#064e3b" />

        {/* Finance monitor (with chart and live streaming) */}
        <IsoMonitor
          x={150}
          y={520}
          w={55}
          h={30}
          borderColor="#064e3b"
          screenColor="#ecfdf5"
          isLive={isAcctLive}
          neonColor="#10b981"
        >
          <polyline
            points="155,538 163,533 170,536 178,528 186,532 194,526 200,530"
            fill="none" stroke="#059669" strokeWidth="1.2"
          />
        </IsoMonitor>

        {/* Finance coffee mug with steam */}
        <IsoCoffeeMug x={224} y={574} hasSteam={!isAcctAway} />

        {/* Filing cabinet */}
        <IsoCabinet x={300} y={460} />

        {/* Ledger folder on desk */}
        <rect x="135" y="535" width="14" height="18" rx="1.5" fill="#fef3c7" stroke="#d97706" strokeWidth="0.6" />
        <line x1="138" y1="540" x2="146" y2="540" stroke="#b45309" strokeWidth="0.5" />
        <line x1="138" y1="544" x2="146" y2="544" stroke="#b45309" strokeWidth="0.5" />

        {/* Plant */}
        <IsoPlant x={80} y={450} size={0.9} />

        {/* Away badge */}
        {isAcctAway && (
          <g transform="translate(185, 595)" textAnchor="middle">
            <rect x="-34" y="-8" width="68" height="16" rx="8" fill="#fef8e8" stroke="#f59e0b" strokeWidth="1" filter="url(#badge-soft-shadow)" />
            <text x="0" y="4" fill="#b45309" fontSize="8.5" fontWeight="700">In Review ↗</text>
          </g>
        )}
      </g>

      {/* ═══ 5. REVIEW & APPROVAL STATION ═══ */}
      <g id="furniture-review">
        {/* Review counter desk */}
        <IsoDesk x={510} y={560} w={160} d={50} h={14} topColor="#f5d9a0" frontColor="#d4a373" sideColor="#b45309" />

        {/* Reviewer chair */}
        <IsoChair x={575} y={510} color="#78350f" />

        {/* Review terminal */}
        <IsoMonitor x={555} y={520} w={50} h={28} borderColor="#78350f" screenColor="#fffbeb">
          <text x="568" y="538" fill="#b45309" fontSize="7" fontWeight="700">REVIEW</text>
        </IsoMonitor>

        {/* Stamp pad & document */}
        <rect x="525" y="538" width="16" height="14" rx="2" fill="#ffffff" stroke="#f59e0b" strokeWidth="0.8" />
        <text x="533" y="550" fill="#d97706" fontSize="10" textAnchor="middle" fontWeight="bold">✓</text>

        {/* Document stack */}
        <rect x="640" y="535" width="20" height="3" rx="0.5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.3" />
        <rect x="641" y="532" width="20" height="3" rx="0.5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.3" />
        <rect x="642" y="529" width="20" height="3" rx="0.5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.3" />
      </g>

      {/* ═══ 6. ENGINEERING BAY ═══ */}
      <g id="furniture-engineering">
        {/* Developer desk */}
        <IsoDesk x={920} y={560} w={120} d={55} h={14} />

        {/* Chair */}
        <IsoChair x={963} y={510} color="#0369a1" />

        {/* Dual monitors with code lines and live streaming */}
        <IsoMonitor
          x={940}
          y={518}
          w={48}
          h={30}
          borderColor="#0369a1"
          screenColor="#f0f9ff"
          isLive={isDevLive}
          neonColor="#38bdf8"
        >
          {/* Code lines */}
          <line x1="945" y1="528" x2="972" y2="528" stroke="#0284c7" strokeWidth="1" />
          <line x1="948" y1="533" x2="980" y2="533" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="948" y1="538" x2="970" y2="538" stroke="#38bdf8" strokeWidth="0.8" />
        </IsoMonitor>
        {/* Vertical second monitor */}
        <IsoMonitor
          x={995}
          y={514}
          w={28}
          h={36}
          borderColor="#0369a1"
          screenColor="#f0f9ff"
          isLive={isDevLive}
          neonColor="#38bdf8"
        >
          <line x1="999" y1="524" x2="1017" y2="524" stroke="#0284c7" strokeWidth="0.8" />
          <line x1="999" y1="530" x2="1013" y2="530" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="999" y1="536" x2="1017" y2="536" stroke="#38bdf8" strokeWidth="0.8" />
        </IsoMonitor>

        {/* Developer coffee mug with steam */}
        <IsoCoffeeMug x={930} y={574} hasSteam={!isDevAway} />

        {/* Server rack */}
        <IsoServerRack x={1100} y={450} />

        {/* Plant */}
        <IsoPlant x={870} y={450} size={0.9} />

        {/* Away badge */}
        {isDevAway && (
          <g transform="translate(995, 595)" textAnchor="middle">
            <rect x="-42" y="-8" width="84" height="16" rx="8" fill="#e6f2fd" stroke="#38bdf8" strokeWidth="1" filter="url(#badge-soft-shadow)" />
            <text x="0" y="4" fill="#0369a1" fontSize="8.5" fontWeight="700">Working Away ↗</text>
          </g>
        )}
      </g>

      {/* ═══ 7. STAFF LOUNGE ═══ */}
      <g id="furniture-lounge">
        {/* Coffee machine */}
        <IsoCoffeeMachine x={860} y={260} />

        {/* Sofa */}
        <IsoSofa x={940} y={280} w={65} />

        {/* Side table with coffee cup */}
        <IsoSideTable x={1020} y={278} />
        {/* Coffee cup on table */}
        <rect x="1016" y="270" width="8" height="6" rx="1.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.4" />

        {/* Second smaller sofa */}
        <IsoSofa x={1060} y={280} w={50} />

        {/* Plant */}
        <IsoPlant x={1130} y={252} size={0.8} />
      </g>

      {/* ═══ 8. ENVIRONMENTAL DECORATIONS ═══ */}
      <g id="environment-decor" pointerEvents="none">
        {/* Wall clock in hallway */}
        <g transform="translate(450, 345)">
          <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="-6" stroke="#334155" strokeWidth="1" />
          <line x1="0" y1="0" x2="4" y2="2" stroke="#334155" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="1" fill="#334155" />
        </g>

        {/* Hallway plant left */}
        <IsoPlant x={60} y={348} size={0.7} />

        {/* Hallway plant right */}
        <IsoPlant x={1140} y={348} size={0.7} />
      </g>
    </g>
  )
}
