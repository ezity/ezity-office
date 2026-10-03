/**
 * SVG Office Furniture & Workstations
 *
 * Renders department-specific workstations, desks, conference table,
 * chairs, and lounge equipment.
 */

import React from 'react'
import type { OfficeSceneState } from '@/types/office-scene'

export function SvgOfficeFurniture({ scene }: { scene?: OfficeSceneState }) {
  // Check if home staff are away from desk
  const cos = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-chief-of-staff')
  const isCosAway = Boolean(cos?.targetZoneId && cos.targetZoneId !== 'executive')

  const acct = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')
  const isAcctAway = Boolean(acct?.targetZoneId && acct.targetZoneId !== 'finance')

  const dev = scene?.agents.find((a) => a.agentDefinitionId === 'ezity-developer')
  const isDevAway = Boolean(dev?.targetZoneId && dev.targetZoneId !== 'engineering')
  return (
    <g id="office-furniture-layer" pointerEvents="none">
      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE SUITE DESK & CHAIR
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-executive">
        {/* Executive Desk Base Shadow */}
        <rect x="95" y="150" width="180" height="95" rx="14" fill="#000" fillOpacity="0.4" />
        {/* Desk Surface */}
        <rect
          x="95"
          y="146"
          width="180"
          height="95"
          rx="14"
          fill="url(#grad-desk-executive)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* Desk Inlay Leather Pad */}
        <rect x="135" y="160" width="100" height="50" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        {/* Executive Laptop / Screen */}
        <rect x="155" y="170" width="60" height="32" rx="3" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.2" />
        <rect x="160" y="174" width="50" height="4" rx="2" fill="#38bdf8" fillOpacity="0.8" />
        <line x1="160" y1="184" x2="195" y2="184" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="160" y1="190" x2="205" y2="190" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.6" />
        {/* Executive Chair (behind desk) */}
        <rect x="160" y="122" width="50" height="18" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
        {/* Decorative Desk Plant */}
        <circle cx="115" cy="168" r="8" fill="#065f46" stroke="#10b981" strokeWidth="1" />
        <circle cx="115" cy="168" r="4" fill="#34d399" />
        {/* Away at Meeting Badge */}
        {isCosAway && (
          <g transform="translate(185, 236)" textAnchor="middle">
            <rect x="-42" y="-9" width="84" height="18" rx="9" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1" />
            <text x="0" y="3" fill="#e9d5ff" fontSize="9" fontWeight="600">
              In Meeting ↗
            </text>
          </g>
        )}
      </g>

      {/* ─────────────────────────────────────────────────────────────
          2. STRATEGIC CONFERENCE TABLE & CHAIRS
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-conference">
        {/* Table Shadow */}
        <ellipse cx="600" cy="195" rx="125" ry="55" fill="#000" fillOpacity="0.35" />
        {/* Table Surface */}
        <ellipse
          cx="600"
          cy="190"
          rx="125"
          ry="55"
          fill="url(#grad-conference-table)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* Centerpiece Smart Console */}
        <ellipse cx="600" cy="190" rx="55" ry="20" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.2" strokeOpacity="0.6" />
        <circle cx="600" cy="190" r="6" fill="#0284c7" />

        {/* 6 Conference Chairs */}
        {/* Top 3 chairs */}
        <rect x="520" y="125" width="36" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="582" y="122" width="36" height="14" rx="6" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.2" />
        <rect x="644" y="125" width="36" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        {/* Bottom 3 chairs */}
        <rect x="520" y="242" width="36" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="582" y="244" width="36" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <rect x="644" y="242" width="36" height="14" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          3. FINANCE & ACCOUNTING WORKSTATION
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-finance">
        {/* Desk Shadow */}
        <rect x="95" y="505" width="180" height="95" rx="14" fill="#000" fillOpacity="0.4" />
        {/* Desk Surface */}
        <rect
          x="95"
          y="501"
          width="180"
          height="95"
          rx="14"
          fill="url(#grad-desk-workstation)"
          stroke="#059669"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        {/* Ultrawide Finance Monitor */}
        <rect x="135" y="520" width="100" height="34" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
        {/* Stock/Chart Sparkline Graphic */}
        <polyline
          points="145,542 160,536 175,540 190,530 205,535 220,527"
          fill="none"
          stroke="#34d399"
          strokeWidth="1.5"
        />
        {/* Ledger Notebook */}
        <rect x="105" y="535" width="22" height="30" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
        <line x1="110" y1="542" x2="122" y2="542" stroke="#6ee7b7" strokeWidth="1" />
        <line x1="110" y1="548" x2="122" y2="548" stroke="#6ee7b7" strokeWidth="1" />
        {/* Accountant Chair */}
        <rect x="160" y="605" width="50" height="16" rx="7" fill="#1e293b" stroke="#059669" strokeWidth="1.2" />
        {/* Away at Review Station Badge */}
        {isAcctAway && (
          <g transform="translate(185, 595)" textAnchor="middle">
            <rect x="-44" y="-9" width="88" height="18" rx="9" fill="#451a03" stroke="#f59e0b" strokeWidth="1" />
            <text x="0" y="3" fill="#fef3c7" fontSize="9" fontWeight="600">
              In Review ↗
            </text>
          </g>
        )}
      </g>

      {/* ─────────────────────────────────────────────────────────────
          4. REVIEW & APPROVAL STATION
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-review">
        {/* Review Desk Shadow */}
        <rect x="500" y="505" width="200" height="95" rx="14" fill="#000" fillOpacity="0.4" />
        {/* Review Desk Surface */}
        <rect
          x="500"
          y="501"
          width="200"
          height="95"
          rx="14"
          fill="url(#grad-desk-workstation)"
          stroke="#d97706"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        {/* Supervisor Dual-Control Terminal */}
        <rect x="550" y="520" width="100" height="36" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1.5" />
        {/* Sign-off Stamps Tray */}
        <rect x="515" y="535" width="26" height="24" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1" />
        <text x="528" y="552" fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="bold">
          ✓
        </text>
        {/* Review Chair */}
        <rect x="575" y="605" width="50" height="16" rx="7" fill="#1e293b" stroke="#d97706" strokeWidth="1.2" />
      </g>

      {/* ─────────────────────────────────────────────────────────────
          5. ENGINEERING BAY WORKSTATION
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-engineering">
        {/* Desk Shadow */}
        <rect x="905" y="505" width="180" height="95" rx="14" fill="#000" fillOpacity="0.4" />
        {/* Desk Surface */}
        <rect
          x="905"
          y="501"
          width="180"
          height="95"
          rx="14"
          fill="url(#grad-desk-workstation)"
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        {/* Dual Curved Displays */}
        {/* Main Display */}
        <rect x="935" y="518" width="70" height="36" rx="3" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="942" y1="528" x2="975" y2="528" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="948" y1="534" x2="990" y2="534" stroke="#7dd3fc" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="948" y1="540" x2="980" y2="540" stroke="#7dd3fc" strokeWidth="1.2" strokeOpacity="0.7" />
        {/* Vertical Aux Display */}
        <rect x="1010" y="515" width="30" height="42" rx="3" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="1015" y1="524" x2="1035" y2="524" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8" />
        <line x1="1015" y1="530" x2="1032" y2="530" stroke="#7dd3fc" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="1015" y1="536" x2="1035" y2="536" stroke="#7dd3fc" strokeWidth="1" strokeOpacity="0.6" />
        {/* Developer Ergonomic Chair */}
        <rect x="970" y="605" width="50" height="16" rx="7" fill="#1e293b" stroke="#0284c7" strokeWidth="1.2" />
        {/* Away Badge */}
        {isDevAway && (
          <g transform="translate(995, 595)" textAnchor="middle">
            <rect x="-48" y="-9" width="96" height="18" rx="9" fill="#082f49" stroke="#38bdf8" strokeWidth="1" />
            <text x="0" y="3" fill="#e0f2fe" fontSize="9" fontWeight="600">
              Working Away ↗
            </text>
          </g>
        )}
      </g>

      {/* ─────────────────────────────────────────────────────────────
          6. STAFF LOUNGE COFFEE BAR & SEATING
      ───────────────────────────────────────────────────────────── */}
      <g id="furniture-lounge">
        {/* Espresso Bar Counter */}
        <rect x="855" y="260" width="120" height="38" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
        {/* Espresso Machine */}
        <rect x="865" y="266" width="30" height="24" rx="4" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="880" cy="275" r="3" fill="#38bdf8" />
        <rect x="905" y="272" width="10" height="12" rx="2" fill="#e2e8f0" />
        {/* Lounge Seating Couches */}
        <rect x="1000" y="260" width="70" height="38" rx="8" fill="#334155" stroke="#475569" strokeWidth="1" />
        <rect x="1080" y="260" width="55" height="38" rx="8" fill="#334155" stroke="#475569" strokeWidth="1" />
      </g>
    </g>
  )
}
