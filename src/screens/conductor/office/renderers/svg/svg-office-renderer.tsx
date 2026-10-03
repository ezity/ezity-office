/**
 * SVG Office Renderer (Isometric Game-Style)
 * Phase I-C.2 — Game-Style Art Pass
 *
 * Primary 2D vector renderer for the Ezity Virtual Office.
 * Assembles all isometric layers with correct depth ordering:
 *   1. Floor & environment
 *   2. Zones & walls
 *   3. Back-row furniture
 *   4. Agents (y-sorted for correct depth)
 *   5. Front-row overlays & boards
 */

import React, { useMemo } from 'react'
import type { OfficeRendererProps } from '../../types'
import { SvgOfficeDefs } from './svg-office-status'
import { SvgOfficeFloor } from './svg-office-floor'
import { SvgOfficeZones } from './svg-office-zones'
import { SvgOfficeFurniture } from './svg-office-furniture'
import { SvgOfficeBoard } from './svg-office-board'
import { SvgOfficeAgent, getAgentSvgCoordinates } from './svg-office-agent'

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
  // Y-based depth sort: agents lower on screen render on top
  const sortedAgents = useMemo(() => {
    return [...scene.agents].sort((a, b) => {
      const posA = getAgentSvgCoordinates(a)
      const posB = getAgentSvgCoordinates(b)
      return posA.y - posB.y
    })
  }, [scene.agents])

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

        {/* 1. Base Flooring & Environment */}
        <SvgOfficeFloor companyName={companyName} />

        {/* 2. Department Rooms, Walls & Zones */}
        <SvgOfficeZones
          missionRunning={scene.missionRunning}
          pendingApprovalCount={scene.pendingApprovalCount}
          selectedZoneId={selectedZoneId}
          onZoneClick={onZoneClick}
        />

        {/* 3. Furniture (desks, chairs, monitors, shelves, plants) */}
        <SvgOfficeFurniture scene={scene} />

        {/* 4. Interactive Operations & Mission Boards */}
        <SvgOfficeBoard
          scene={scene}
          onWorkItemClick={onWorkItemClick}
          onApprovalClick={onApprovalClick}
          onMissionClick={onMissionClick}
        />

        {/* 5. Agents (y-sorted for depth) */}
        <g id="office-agents-layer">
          {sortedAgents.map((agent, index) => (
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
