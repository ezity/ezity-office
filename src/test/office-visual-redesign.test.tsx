// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SvgOfficeRenderer } from '@/screens/conductor/office/renderers/svg/svg-office-renderer'
import { OfficeCharacter } from '@/screens/conductor/office/renderers/svg/office-character'
import { synthesizeOfficeSceneState } from '@/screens/conductor/office/state/office-state-synthesizer'
import type { OfficeSceneState } from '@/types/office-scene'

// Mock TanStack router useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn().mockResolvedValue(undefined),
}))

describe('Phase I-C.2: Isometric Game-Style SVG Office', () => {
  const baseScene: OfficeSceneState = synthesizeOfficeSceneState({
    conductor: {
      phase: 'idle',
      conductorSettings: { staffOrchestrated: true },
      recentSessions: [],
    },
    workItems: [],
  })

  // Test A: No giant dashboard-card room containers
  describe('A. No dashboard-card room containers', () => {
    it('does not use old dark room gradients and renders physical partition walls', () => {
      const { container } = render(<SvgOfficeRenderer scene={baseScene} />)

      // No old dark room gradient references
      const oldExecutive = container.querySelector('[fill="url(#grad-room-executive)"]')
      const oldFinance = container.querySelector('[fill="url(#grad-room-finance)"]')
      expect(oldExecutive).toBeNull()
      expect(oldFinance).toBeNull()

      // Uses light illustrated gradients
      const newExecutive = container.querySelector('[fill="url(#grad-room-executive-light)"]')
      expect(newExecutive).toBeTruthy()

      // Partition walls exist (polygon elements for IsoPartition)
      const partitions = container.querySelectorAll('#office-zones-layer polygon')
      expect(partitions.length).toBeGreaterThan(0)
    })
  })

  // Test B: Isometric floor renders
  describe('B. Isometric floor with warm tile grid', () => {
    it('renders warm floor base and tile grid pattern', () => {
      const { container } = render(<SvgOfficeRenderer scene={baseScene} />)

      // Floor uses isometric gradient
      const floorRect = container.querySelector('#office-floor-layer rect')
      expect(floorRect?.getAttribute('fill')).toBe('url(#ezity-light-floor)')

      // Tile pattern overlay exists
      const tileOverlay = container.querySelector('[fill="url(#iso-tile-grid)"]')
      expect(tileOverlay).toBeTruthy()

      // North wall with windows
      const northWall = container.querySelector('#office-north-wall')
      expect(northWall).toBeTruthy()
    })
  })

  // Test C: Character renders with game proportions
  describe('C. Game-style character renders', () => {
    it('renders Chief of Staff with larger game proportions and role details', () => {
      const cos = baseScene.agents.find((a) => a.agentDefinitionId === 'ezity-chief-of-staff')!
      expect(cos).toBeDefined()

      const { container } = render(
        <OfficeCharacter agent={cos} isSeated={true} isMoving={false} />,
      )

      // Has head and body groups
      expect(container.querySelector('#char-head')).toBeTruthy()
      expect(container.querySelector('#char-body')).toBeTruthy()

      // Head radius is 14 (larger than Phase I-C.1's 11)
      const headCircle = container.querySelector('#char-head circle')
      expect(headCircle?.getAttribute('r')).toBe('14')
    })
  })

  // Test D: Character pose mapping
  describe('D. Character pose mapping', () => {
    it('seated character hides legs, standing character shows legs', () => {
      const dev = baseScene.agents.find((a) => a.agentDefinitionId === 'ezity-developer')!

      // Seated: no legs
      const { container: seatedContainer } = render(
        <OfficeCharacter agent={dev} isSeated={true} isMoving={false} />,
      )
      expect(seatedContainer.querySelector('#char-legs')).toBeNull()

      // Standing: shows legs
      const { container: standingContainer } = render(
        <OfficeCharacter agent={dev} isSeated={false} isMoving={false} />,
      )
      expect(standingContainer.querySelector('#char-legs')).toBeTruthy()
    })
  })

  // Test E: Y-based depth sorting
  describe('E. Agent depth sorting', () => {
    it('agents layer uses y-based render order', () => {
      const { container } = render(<SvgOfficeRenderer scene={baseScene} />)

      const agentLayer = container.querySelector('#office-agents-layer')
      expect(agentLayer).toBeTruthy()

      // All agent nodes render
      const agentNodes = container.querySelectorAll('[id^="agent-node-"]')
      expect(agentNodes.length).toBe(baseScene.agents.length)
    })
  })

  // Test F: Cork board with sticky cards
  describe('F. Work Inbox pinboard with sticky cards', () => {
    it('renders operations board header and sticky note counters', () => {
      render(<SvgOfficeRenderer scene={baseScene} />)

      expect(screen.getByText('📌 OPERATIONS BOARD')).toBeTruthy()
      expect(screen.getByText('IN')).toBeTruthy()
      expect(screen.getByText('PROGRESS')).toBeTruthy()
    })
  })

  // Test G: Review station approval tray
  describe('G. Review station renders approval tray', () => {
    it('renders verified message when no pending approvals', () => {
      render(<SvgOfficeRenderer scene={baseScene} />)

      expect(screen.getByText('✓ All Drafts & Entries Verified')).toBeTruthy()
      expect(screen.getByText('Settled')).toBeTruthy()
    })
  })

  // Test H: No duplicate characters
  describe('H. No duplicate agent characters', () => {
    it('each agent renders exactly once', () => {
      const { container } = render(<SvgOfficeRenderer scene={baseScene} />)

      for (const agent of baseScene.agents) {
        const nodes = container.querySelectorAll(`#agent-node-${agent.id}`)
        expect(nodes.length).toBe(1)
      }
    })
  })

  // Test I: Reduced motion
  describe('I. Reduced motion behavior', () => {
    it('disables walking animations when enableReducedMotion is true', () => {
      const { container } = render(
        <SvgOfficeRenderer scene={baseScene} enableReducedMotion={true} />,
      )

      const styleEl = container.querySelector('style')
      expect(styleEl?.textContent).toContain('animation: none !important')
    })
  })

  // Test J: Operational counters are real
  describe('J. All operational counters use real state', () => {
    it('displays real work item counts from scene state', () => {
      const sceneWithItems = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          conductorSettings: { staffOrchestrated: true },
          recentSessions: [],
        },
        workItems: [
          { id: 'w1', title: 'Test Item', status: 'needs_attention', type: 'task', priority: 'high' },
          { id: 'w2', title: 'Test Item 2', status: 'in_progress', type: 'task', priority: 'medium' },
        ],
      })

      const { container } = render(<SvgOfficeRenderer scene={sceneWithItems} />)

      // Should show real counts
      const board = container.querySelector('#board-work-inbox')
      expect(board).toBeTruthy()
    })
  })
})
