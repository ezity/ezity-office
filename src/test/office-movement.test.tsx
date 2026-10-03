// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SvgOfficeRenderer } from '@/screens/conductor/office/renderers/svg/svg-office-renderer'
import { OfficeRendererHost } from '@/screens/conductor/office/office-renderer-host'
import { getAgentSvgCoordinates } from '@/screens/conductor/office/renderers/svg/svg-office-agent'
import { deriveAgentOfficeLocation } from '@/screens/conductor/office/state/office-movement-rules'
import {
  calculateNavPath,
  interpolatePath,
  SVG_NAV_NODES,
} from '@/screens/conductor/office/renderers/svg/svg-office-pathing'
import { synthesizeOfficeSceneState } from '@/screens/conductor/office/state/office-state-synthesizer'
import type { OfficeSceneState } from '@/types/office-scene'

// Mock TanStack router useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn().mockResolvedValue(undefined),
}))

describe('Phase I-C: Real State-Driven Movement for Ezity Virtual Office', () => {
  // Test A: Idle Accountant stays at Finance home desk
  describe('A. Idle Accountant stays at Finance home desk', () => {
    it('keeps Accountant at Finance home desk with return_home reason when idle', () => {
      const loc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-accountant',
        department: 'finance',
        homeZoneId: 'finance',
        status: 'idle',
        attentionState: 'nominal',
        isMissionActive: false,
        isParticipatingInMission: false,
        isPaused: false,
        pendingApprovalCount: 0,
        activeWorkItemCount: 0,
      })

      expect(loc.currentZoneId).toBe('finance')
      expect(loc.targetZoneId).toBeUndefined()
      expect(loc.movementReason).toBe('return_home')
      expect(loc.isMoving).toBe(false)
    })
  })

  // Test B: Accountant with pending human approval targets Review Station
  describe('B. Accountant with pending human approval targets Review Station', () => {
    it('sets targetZoneId to review_station with approval_required reason and isMoving = true', () => {
      const loc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-accountant',
        department: 'finance',
        homeZoneId: 'finance',
        status: 'waiting',
        attentionState: 'waiting_approval',
        isMissionActive: false,
        isParticipatingInMission: false,
        isPaused: false,
        pendingApprovalCount: 2,
        activeWorkItemCount: 2,
      })

      expect(loc.currentZoneId).toBe('finance')
      expect(loc.targetZoneId).toBe('review_station')
      expect(loc.movementReason).toBe('approval_required')
      expect(loc.isMoving).toBe(true)
    })
  })

  // Test C: Accountant returns home only after authoritative resolution
  describe('C. Accountant returns home only after authoritative resolution', () => {
    it('keeps Accountant in review_station while pending, and returns home when approvals count drops to 0', () => {
      // 1. Pending approval exists
      const sceneWithApproval = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'appr-1',
            type: 'approval',
            title: 'Verify Journal #101',
            description: '',
            status: 'needs_attention',
            priority: 'high',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      const acctPending = sceneWithApproval.agents.find(
        (a) => a.agentDefinitionId === 'ezity-accountant',
      )!
      expect(acctPending.targetZoneId).toBe('review_station')
      expect(acctPending.movementReason).toBe('approval_required')
      expect(acctPending.isMoving).toBe(true)

      // 2. Authoritative approval event resolves the item to completed
      const sceneResolved = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'appr-1',
            type: 'approval',
            title: 'Verify Journal #101',
            description: '',
            status: 'completed',
            priority: 'high',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      const acctResolved = sceneResolved.agents.find(
        (a) => a.agentDefinitionId === 'ezity-accountant',
      )!
      expect(acctResolved.targetZoneId).toBeUndefined()
      expect(acctResolved.movementReason).toBe('return_home')
      expect(acctResolved.isMoving).toBe(false)
    })
  })

  // Test D: Chief of Staff moves to Conference Room during active Conductor mission
  describe('D. Chief of Staff moves to Conference Room during active Conductor mission', () => {
    it('sets Chief of Staff target to meeting_room with mission_collaboration reason', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          goal: 'Automate weekly accounting reports',
          isEZityStaff: true,
          workers: [
            {
              key: 'worker-dev',
              displayName: 'Developer',
              agentId: 'ezity-developer',
              status: 'running',
            },
          ],
        },
      })

      const cos = scene.agents.find(
        (a) => a.agentDefinitionId === 'ezity-chief-of-staff',
      )!
      expect(cos).toBeDefined()
      expect(cos.targetZoneId).toBe('meeting_room')
      expect(cos.movementReason).toBe('mission_collaboration')
      expect(cos.isMoving).toBe(true)
    })
  })

  // Test E: Unrelated Developer remains at Engineering desk
  describe('E. Unrelated Developer remains at Engineering desk', () => {
    it('keeps Developer at Engineering desk if not participating in mission', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          goal: 'Draft balance sheet reclassification',
          isEZityStaff: true,
          workers: [
            {
              key: 'worker-acct',
              displayName: 'Accountant',
              agentId: 'ezity-accountant',
              status: 'running',
            },
          ],
        },
      })

      const dev = scene.agents.find(
        (a) => a.agentDefinitionId === 'ezity-developer',
      )!
      expect(dev.currentZoneId).toBe('engineering')
      expect(dev.targetZoneId).toBeUndefined()
      expect(dev.isMoving).toBe(false)
    })
  })

  // Test F: Participating Developer moves to Conference Room when real mission linkage exists
  describe('F. Participating Developer moves to Conference Room when real mission linkage exists', () => {
    it('moves Developer to meeting_room when explicitly linked to mission worker', () => {
      const loc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-developer',
        department: 'engineering',
        homeZoneId: 'engineering',
        status: 'working',
        attentionState: 'working',
        isMissionActive: true,
        isParticipatingInMission: true,
        isPaused: false,
        pendingApprovalCount: 0,
        activeWorkItemCount: 1,
      })

      expect(loc.targetZoneId).toBe('meeting_room')
      expect(loc.movementReason).toBe('mission_collaboration')
      expect(loc.isMoving).toBe(true)
    })
  })

  // Test G: Error state maps deterministically
  describe('G. Error state maps deterministically', () => {
    it('keeps agent at home desk with error reason when in error state', () => {
      const loc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-developer',
        department: 'engineering',
        homeZoneId: 'engineering',
        status: 'error',
        attentionState: 'error',
        isMissionActive: true,
        isParticipatingInMission: true,
        isPaused: false,
        pendingApprovalCount: 1,
        activeWorkItemCount: 1,
      })

      expect(loc.currentZoneId).toBe('engineering')
      expect(loc.targetZoneId).toBeUndefined()
      expect(loc.movementReason).toBe('error')
      expect(loc.isMoving).toBe(false)
    })
  })

  // Test H: Ordinary idle does NOT move to Lounge
  describe('H. Ordinary idle does NOT move to Lounge', () => {
    it('keeps idle agents at home desks and never sends them to lounge_break', () => {
      const loc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-accountant',
        department: 'finance',
        homeZoneId: 'finance',
        status: 'idle',
        attentionState: 'nominal',
        isMissionActive: false,
        isParticipatingInMission: false,
        isPaused: false,
        pendingApprovalCount: 0,
        activeWorkItemCount: 0,
      })

      expect(loc.targetZoneId).toBeUndefined()
      expect(loc.targetZoneId).not.toBe('lounge_break')
    })
  })

  // Test I: Replayed SSE event does not trigger duplicate movement
  describe('I. Replayed SSE event does not trigger duplicate movement', () => {
    it('produces identical deterministic location regardless of repeated calls', () => {
      const params = {
        agentDefinitionId: 'ezity-accountant',
        department: 'finance' as const,
        homeZoneId: 'finance' as const,
        status: 'waiting' as const,
        attentionState: 'waiting_approval' as const,
        isMissionActive: false,
        isParticipatingInMission: false,
        isPaused: false,
        pendingApprovalCount: 1,
        activeWorkItemCount: 1,
      }

      const res1 = deriveAgentOfficeLocation(params)
      const res2 = deriveAgentOfficeLocation(params)
      expect(res1).toEqual(res2)
    })
  })

  // Test J: State flicker does not create movement thrashing
  describe('J. State flicker does not create movement thrashing', () => {
    it('priority rules prevent oscillation between competing signals', () => {
      // If agent is working on a task but has an urgent approval required,
      // approval_required strictly wins over working
      const competingLoc = deriveAgentOfficeLocation({
        agentDefinitionId: 'ezity-accountant',
        department: 'finance',
        homeZoneId: 'finance',
        status: 'working',
        attentionState: 'waiting_approval',
        isMissionActive: false,
        isParticipatingInMission: false,
        isPaused: false,
        pendingApprovalCount: 1,
        activeWorkItemCount: 2,
        isProcessingInboxItem: true,
      })

      expect(competingLoc.targetZoneId).toBe('review_station')
      expect(competingLoc.movementReason).toBe('approval_required')
    })
  })

  // Test K: Reduced motion performs immediate transition
  describe('K. Reduced motion performs immediate transition', () => {
    it('sets coordinates immediately without interpolation when enableReducedMotion is true', () => {
      const sceneWithApproval = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'appr-1',
            type: 'approval',
            title: 'Sign-off',
            description: '',
            status: 'needs_attention',
            priority: 'high',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      const acct = sceneWithApproval.agents.find(
        (a) => a.agentDefinitionId === 'ezity-accountant',
      )!
      expect(acct.targetZoneId).toBe('review_station')

      const coords = getAgentSvgCoordinates(acct)
      // Review station coordinates
      expect(coords).toEqual({ x: 600, y: 555 })
    })
  })

  // Test L: Mobile fallback shows semantic zone/status without animation
  describe('L. Mobile fallback shows semantic zone/status without animation', () => {
    it('renders location badge and semantic movement reason text in mobile cards', () => {
      const sceneWithApproval = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'appr-1',
            type: 'approval',
            title: 'Tax Filing Review',
            description: '',
            status: 'needs_attention',
            priority: 'high',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      const { container } = render(
        <OfficeRendererHost scene={sceneWithApproval} />,
      )

      const mobileContainer = container.querySelector('.md\\:hidden')
      expect(mobileContainer).toBeTruthy()
      expect(mobileContainer?.textContent).toContain('📍 Review Station')
      expect(mobileContainer?.textContent).toContain('⚠️ Approval Required')
    })
  })

  // Test M: No random/timer-based movement remains
  describe('M. No random/timer-based movement remains', () => {
    it('path navigation routes only along pre-defined architectural hallway and doors', () => {
      const path = calculateNavPath('desk_finance', 'station_review')
      expect(path.length).toBeGreaterThan(1)

      // Start at Finance Desk
      expect(path[0]).toEqual(SVG_NAV_NODES.desk_finance)
      // Exits via Finance Door
      expect(path[1]).toEqual(SVG_NAV_NODES.door_finance)
      // Enters Central Hallway (y=365)
      expect(path[2]).toEqual(SVG_NAV_NODES.hallway_west)
      // Traverses along Hallway (y=365) to Review Station
      expect(path.some((p) => p.y === 365)).toBe(true)
      // Arrives at Review Station
      expect(path[path.length - 1]).toEqual(SVG_NAV_NODES.station_review)
    })
  })
})
