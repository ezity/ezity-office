/**
 * SVG Isometric Office Floor
 * Phase I-C.2 — Game-Style Isometric Art Pass
 *
 * Renders a continuous warm isometric office floor with subtle
 * diamond tile grid, architectural walls along the perimeter,
 * daylight windows, and company branding — all in a game-like
 * management-sim visual style.
 */

import React from 'react'

export function SvgOfficeFloor({ companyName = 'EZity Solutions' }: { companyName?: string }) {
  return (
    <g id="office-floor-layer">
      {/* ═══ 1. Main Office Floor (Warm cream/beige continuous surface) ═══ */}
      <rect
        x="0"
        y="0"
        width="1200"
        height="720"
        fill="url(#ezity-light-floor)"
      />

      {/* Subtle isometric diamond tile overlay */}
      <rect
        x="0"
        y="0"
        width="1200"
        height="720"
        fill="url(#iso-tile-grid)"
        opacity="0.5"
      />

      {/* ═══ 2. North Wall (Back wall with windows & depth) ═══ */}
      <g id="office-north-wall">
        {/* Wall face — the vertical surface */}
        <rect x="0" y="0" width="1200" height="48" fill="#e0dbd2" />
        {/* Wall top edge / cap */}
        <rect x="0" y="0" width="1200" height="6" fill="#d4cec4" />
        {/* Baseboard trim */}
        <rect x="0" y="42" width="1200" height="6" fill="#c8c0b4" />

        {/* 4 Daylight Windows with glass panes */}
        {[120, 380, 660, 940].map((winX) => (
          <g key={`win-${winX}`}>
            {/* Window recess */}
            <rect
              x={winX}
              y="8"
              width="140"
              height="30"
              rx="3"
              fill="#c0bab0"
            />
            {/* Glass pane */}
            <rect
              x={winX + 4}
              y="11"
              width="132"
              height="24"
              rx="2"
              fill="#c8e6f8"
              fillOpacity="0.8"
            />
            {/* Window frame mullion (center vertical) */}
            <line
              x1={winX + 70}
              y1="11"
              x2={winX + 70}
              y2="35"
              stroke="#e0dbd2"
              strokeWidth="2"
            />
            {/* Window frame mullion (horizontal) */}
            <line
              x1={winX + 4}
              y1="23"
              x2={winX + 136}
              y2="23"
              stroke="#e0dbd2"
              strokeWidth="1.2"
            />
            {/* Soft daylight cast on floor (trapezoidal light beam) */}
            <polygon
              points={`${winX + 10},48 ${winX + 130},48 ${winX + 155},110 ${winX - 15},110`}
              fill="#fffde8"
              fillOpacity="0.25"
              pointerEvents="none"
            />
          </g>
        ))}
      </g>

      {/* ═══ 3. South Wall (Bottom edge) ═══ */}
      <rect x="0" y="690" width="1200" height="30" fill="#d8d2c8" />
      <rect x="0" y="690" width="1200" height="4" fill="#c8c0b4" />

      {/* ═══ 4. Left Wall ═══ */}
      <rect x="0" y="0" width="20" height="720" fill="#ddd6c8" />
      <rect x="16" y="0" width="4" height="720" fill="#c8c0b4" />

      {/* ═══ 5. Right Wall ═══ */}
      <rect x="1180" y="0" width="20" height="720" fill="#ddd6c8" />
      <rect x="1180" y="0" width="4" height="720" fill="#c8c0b4" />

      {/* ═══ 6. Central Hallway Corridor (Warm stone runner) ═══ */}
      <g id="central-hallway">
        <rect
          x="20"
          y="330"
          width="1160"
          height="70"
          fill="url(#ezity-hallway-light)"
        />
        {/* Hallway edge strips (carpet-to-stone transition) */}
        <line x1="20" y1="330" x2="1180" y2="330" stroke="#c8c0b4" strokeWidth="1.5" />
        <line x1="20" y1="400" x2="1180" y2="400" stroke="#c8c0b4" strokeWidth="1.5" />

        {/* Center guide line (subtle) */}
        <line
          x1="60"
          y1="365"
          x2="1140"
          y2="365"
          stroke="#c8c0b4"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="12 12"
        />

        {/* Company floor emblem */}
        <g transform="translate(600, 365)" textAnchor="middle" pointerEvents="none">
          {/* Stone medallion */}
          <circle cx="0" cy="0" r="20" fill="#ede8df" stroke="#c8c0b4" strokeWidth="1.5" />
          <polygon points="0,-8 7,5 -7,5" fill="#6366f1" fillOpacity="0.7" />
          <text
            y="16"
            fill="#8b7e6a"
            fontSize="5"
            fontWeight="700"
            letterSpacing="0.15em"
          >
            {companyName.toUpperCase()}
          </text>
        </g>
      </g>
    </g>
  )
}
