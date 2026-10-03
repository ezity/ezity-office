// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SvgOfficeRenderer } from '@/screens/conductor/office/renderers/svg/svg-office-renderer'
import { OfficeRendererHost } from '@/screens/conductor/office/office-renderer-host'
import { getAgentSvgCoordinates } from '@/screens/conductor/office/renderers/svg/svg-office-agent'
import { synthesizeOfficeSceneState } from '@/screens/conductor/office/state/office-state-synthesizer'
import type { OfficeSceneState } from '@/types/office-scene'

// Mock TanStack router useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn().mockResolvedValue(undefined),
}))

describe('Phase I-B: Modern SVG Virtual Office with Department Rooms', () => {
  const baseScene: OfficeSceneState = synthesizeOfficeSceneState({
    conductor: {
      phase: 'idle',
      conductorSettings: { staffOrchestrated: true },
      recentSessions: [],
    },
    workItems: [],
  })

  describe('A. Ezity HQ layout renders required zones', () => {
    it('renders all required department rooms and functional zones', () => {
      render(<SvgOfficeRenderer scene={baseScene} />)

      expect(screen.getByText('👔 EXECUTIVE SUITE')).toBeTruthy()
      expect(screen.getByText('🏛️ STRATEGIC CONFERENCE ROOM')).toBeTruthy()
      expect(screen.getByText('📋 WORK INBOX & OPERATIONS')).toBeTruthy()
      expect(screen.getByText('📊 FINANCE & ACCOUNTING WING')).toBeTruthy()
      expect(screen.getByText('⚖️ APPROVAL & REVIEW STATION')).toBeTruthy()
      expect(screen.getByText('💻 ENGINEERING BAY')).toBeTruthy()
      expect(screen.getByText('☕ STAFF LOUNGE & RECOVERY')).toBeTruthy()
    })
  })

  describe('B. Chief of Staff renders in Executive Suite', () => {
    it('positions Chief of Staff at the Executive desk coordinates', () => {
      const cos = baseScene.agents.find((a) => a.agentDefinitionId === 'ezity-chief-of-staff')!
      expect(cos).toBeDefined()
      const coords = getAgentSvgCoordinates(cos)
      expect(coords).toEqual({ x: 185, y: 205 })
    })
  })

  describe('C. Accountant renders in Finance Wing', () => {
    it('positions Accountant at the Finance desk coordinates', () => {
      const acct = baseScene.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')!
      expect(acct).toBeDefined()
      const coords = getAgentSvgCoordinates(acct)
      expect(coords).toEqual({ x: 185, y: 555 })
    })
  })

  describe('D. Developer renders in Engineering Bay', () => {
    it('positions Developer at the Engineering workstation coordinates', () => {
      const dev = baseScene.agents.find((a) => a.agentDefinitionId === 'ezity-developer')!
      expect(dev).toBeDefined()
      const coords = getAgentSvgCoordinates(dev)
      expect(coords).toEqual({ x: 995, y: 555 })
    })
  })

  describe('E. Work Inbox counters use real state', () => {
    it('displays exact real counts for Needs Attention, In Progress, and Waiting', () => {
      const sceneWithItems = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'item-1',
            type: 'task',
            title: 'Audit Redis config',
            description: '',
            status: 'needs_attention',
            priority: 'high',
            assignedAgentId: 'ezity-developer',
            source: 'system',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'item-2',
            type: 'task',
            title: 'Build UI components',
            description: '',
            status: 'in_progress',
            priority: 'medium',
            assignedAgentId: 'ezity-developer',
            source: 'conductor',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'item-3',
            type: 'finance_event',
            title: 'Verify journal submission',
            description: '',
            status: 'waiting',
            priority: 'low',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      })

      render(<SvgOfficeRenderer scene={sceneWithItems} />)

      const inboxBoard = screen.getByLabelText(
        'Work Inbox Board: 1 Needs Attention, 1 In Progress, 1 Waiting',
      )
      expect(inboxBoard).toBeTruthy()
    })
  })

  describe('F. Approval badge uses real pending approval count', () => {
    it('displays pending approval counter and alert pill when count > 0', () => {
      const sceneWithApprovals = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
        workItems: [
          {
            id: 'appr-1',
            type: 'approval',
            title: 'Review Journal #101',
            description: '',
            status: 'needs_attention',
            priority: 'high',
            assignedAgentId: 'ezity-accountant',
            source: 'ezityhub',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'appr-2',
            type: 'approval',
            title: 'Review Journal #102',
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

      render(<SvgOfficeRenderer scene={sceneWithApprovals} />)

      expect(screen.getByText('⚠️ 2 Pending Approval')).toBeTruthy()
      expect(screen.getByText('⚠️ Awaiting Sign-off')).toBeTruthy()
    })

    it('displays verified message when pending approval count is 0', () => {
      render(<SvgOfficeRenderer scene={baseScene} />)
      expect(screen.getByText('✓ All Drafts & Entries Verified')).toBeTruthy()
    })
  })

  describe('G. Active mission highlights Conference Room', () => {
    it('displays active mission goal in Conference Room when missionRunning is true', () => {
      const activeMissionScene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          goal: 'Automate weekly financial dispatch',
          workers: [
            {
              key: 'worker-1',
              displayName: 'Developer',
              agentId: 'ezity-developer',
              status: 'running',
            },
          ],
        },
      })

      render(<SvgOfficeRenderer scene={activeMissionScene} />)

      const matches = screen.getAllByText('Automate weekly financial dispatch')
      expect(matches.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Active Mission Session')).toBeTruthy()
    })
  })

  describe('H. Agent click handler fires correct agent/session action', () => {
    it('invokes onAgentClick callback with agentId and sessionKey', () => {
      const onAgentClick = vi.fn()
      render(<SvgOfficeRenderer scene={baseScene} onAgentClick={onAgentClick} />)

      const acctNode = screen.getByLabelText(/Accountant/)
      fireEvent.click(acctNode)

      expect(onAgentClick).toHaveBeenCalledWith('ezity-accountant', undefined)
    })
  })

  describe('I. No synthetic/random operational messages render', () => {
    it('shows real task title or clean status instead of synthetic fake speech', () => {
      const sceneWithTasks = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          workers: [
            {
              key: 'worker-dev',
              displayName: 'Developer',
              agentId: 'ezity-developer',
              status: 'running',
            },
          ],
          tasks: [
            {
              id: 'task-dev',
              title: 'Refactoring WebSocket heartbeat',
              workerKey: 'worker-dev',
              status: 'running',
            },
          ],
        },
      })

      render(<SvgOfficeRenderer scene={sceneWithTasks} />)

      expect(screen.getByText('Refactoring WebSocket heartbeat')).toBeTruthy()
      // Ensure synthetic speech from old office-view.tsx is absent
      expect(screen.queryByText(/Grabbing coffee/i)).toBeNull()
      expect(screen.queryByText(/Checking messages/i)).toBeNull()
      expect(screen.queryByText(/Chatting with team/i)).toBeNull()
    })
  })

  describe('J. Mobile fallback renders accessible card list', () => {
    it('renders the mobile card list in OfficeRendererHost', () => {
      const { container } = render(<OfficeRendererHost scene={baseScene} />)

      // The mobile container has md:hidden class
      const mobileContainer = container.querySelector('.md\\:hidden')
      expect(mobileContainer).toBeTruthy()
      expect(mobileContainer?.textContent).toContain('Chief of Staff')
      expect(mobileContainer?.textContent).toContain('Accountant')
      expect(mobileContainer?.textContent).toContain('Developer')
    })
  })

  describe('K. Reduced-motion behavior respected', () => {
    it('disables pulse keyframe animations when enableReducedMotion is true', () => {
      const { container } = render(
        <SvgOfficeRenderer scene={baseScene} enableReducedMotion={true} />,
      )

      const styleTags = container.querySelectorAll('style')
      const styleContent = Array.from(styleTags)
        .map((s) => s.textContent)
        .join('\n')
      expect(styleContent).toContain('animation: none !important')
    })
  })
})
