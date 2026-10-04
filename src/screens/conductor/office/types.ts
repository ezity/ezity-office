/**
 * Office Renderer Types & Interaction Contracts
 */

import type { OfficeSceneState, OfficeZoneId } from '@/types/office-scene'

export type OfficeLayoutTemplate = 'ezity_hq' | 'grid' | 'roundtable' | 'warroom'
export type OfficeRendererType = 'svg' | 'pixi'

export interface OfficeInteractionHandlers {
  onAgentClick?: (agentId: string, sessionKey?: string) => void
  onDeskClick?: (deskId: string, occupantAgentId?: string) => void
  onZoneClick?: (zoneId: OfficeZoneId) => void
  onWorkItemClick?: (workItemId: string) => void
  onApprovalClick?: (approvalId?: string) => void
  onMissionClick?: () => void
  onViewOutput?: (agentId: string) => void
  onCanvasClick?: () => void
}

export interface OfficeRendererProps extends OfficeInteractionHandlers {
  scene: OfficeSceneState
  className?: string
  height?: number | string
  containerHeight?: number | string
  enableReducedMotion?: boolean
  selectedAgentId?: string
  selectedZoneId?: OfficeZoneId
  layoutTemplate?: OfficeLayoutTemplate
  onLayoutChange?: (layout: OfficeLayoutTemplate) => void
  officeRenderer?: OfficeRendererType
  onRendererChange?: (renderer: OfficeRendererType) => void
  hideHeader?: boolean
  companyName?: string
}
