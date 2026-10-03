/**
 * SVG Office Renderer
 *
 * Primary 2D vector renderer for the Ezity Virtual Office.
 * Coordinates all department rooms, furniture, interactive boards, and agents
 * within a unified 1200x720 SVG coordinate space.
 */

import React from 'react'
import type { OfficeRendererProps } from '../../types'
import { SvgOfficeDefs } from './svg-office-status'
import { SvgOfficeFloor } from './svg-office-floor'
import { SvgOfficeZones } from './svg-office-zones'
import { SvgOfficeFurniture } from './svg-office-furniture'
import { SvgOfficeBoard } from './svg-office-board'
import { SvgOfficeAgent } from './svg-office-agent'

export function SvgOfficeRenderer({
  scene,
  className = '',
  enableReducedMotion = false,
  selectedAgentId,
  selectedZoneId,
  onAgentClick,
  onZoneClick,
  onWorkItemClick,
  onApprovalClick,
  onMissionClick,
  companyName = 'EZity Solutions',
}: OfficeRendererProps) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ minHeight: '340px' }}
    >
      <svg
        viewBox="0 0 1200 720"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none"
        role="img"
        aria-label="EZity Virtual Office Interactive Workspace Floorplan"
      >
        {/* Visual Defs, Gradients & Filters */}
        <SvgOfficeDefs enableReducedMotion={enableReducedMotion} />

        {/* 1. Base Flooring & Watermark */}
        <SvgOfficeFloor companyName={companyName} />

        {/* 2. Department Rooms & Zones */}
        <SvgOfficeZones
          missionRunning={scene.missionRunning}
          pendingApprovalCount={scene.pendingApprovalCount}
          selectedZoneId={selectedZoneId}
          onZoneClick={onZoneClick}
        />

        {/* 3. Workstations & Furniture */}
        <SvgOfficeFurniture scene={scene} />

        {/* 4. Interactive Operations & Mission Boards */}
        <SvgOfficeBoard
          scene={scene}
          onWorkItemClick={onWorkItemClick}
          onApprovalClick={onApprovalClick}
          onMissionClick={onMissionClick}
        />

        {/* 5. Autonomous Coworker Agents */}
        <g id="office-agents-layer">
          {scene.agents.map((agent, index) => (
            <SvgOfficeAgent
              key={agent.id}
              agent={agent}
              index={index}
              isSelected={selectedAgentId === agent.id}
              enableReducedMotion={enableReducedMotion}
              onClick={onAgentClick}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
