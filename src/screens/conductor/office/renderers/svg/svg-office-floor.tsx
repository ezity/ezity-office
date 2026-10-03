/**
 * SVG Office Floor & Architectural Base
 *
 * Renders the virtual office floor tiles, hallway walkway, and subtle
 * Ezity branding watermark in the central thoroughfare.
 */

import React from 'react'

export function SvgOfficeFloor({ companyName = 'EZity Solutions' }: { companyName?: string }) {
  return (
    <g id="office-floor-layer">
      {/* Base Foundation */}
      <rect
        x="0"
        y="0"
        width="1200"
        height="720"
        fill="url(#ezity-floor-glow)"
        rx="24"
      />

      {/* Architectural Grid Lines (Subtle) */}
      <g stroke="#334155" strokeWidth="0.5" strokeOpacity="0.25">
        {/* Horizontal floor gridlines */}
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="20"
            y1={50 + i * 45}
            x2="1180"
            y2={50 + i * 45}
            strokeDasharray="4 8"
          />
        ))}
        {/* Vertical floor gridlines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={50 + i * 48}
            y1="40"
            x2={50 + i * 48}
            y2="690"
            strokeDasharray="4 8"
          />
        ))}
      </g>

      {/* Central Hallway Walkway */}
      <g id="central-hallway">
        <rect
          x="30"
          y="335"
          width="1140"
          height="60"
          fill="url(#ezity-hallway-gradient)"
          rx="8"
          stroke="#475569"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Central Hallway Walkway Guide Line */}
        <line
          x1="50"
          y1="365"
          x2="1150"
          y2="365"
          stroke="#0ea5e9"
          strokeWidth="1.5"
          strokeOpacity="0.2"
          strokeDasharray="12 16"
        />

        {/* Subtle Watermark Branding in Hallway Center */}
        <g transform="translate(600, 365)" textAnchor="middle" pointerEvents="none">
          <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.4" />
          <polygon
            points="0,-10 9,6 -9,6"
            fill="#38bdf8"
            fillOpacity="0.4"
          />
          <text
            y="4"
            fill="#94a3b8"
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.25em"
            fillOpacity="0.75"
          >
            {companyName.toUpperCase()} • VIRTUAL HQ
          </text>
        </g>
      </g>
    </g>
  )
}
