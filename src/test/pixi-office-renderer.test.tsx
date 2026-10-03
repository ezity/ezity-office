// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { OfficeSceneState, OfficeAgentSceneState } from '@/types/office-scene'
import { OfficeRendererHost } from '@/screens/conductor/office/office-renderer-host'
import { PixiOfficeRenderer } from '@/screens/conductor/office/renderers/pixi/pixi-office-renderer'
import {
  worldToScreen,
  screenToWorld,
  calculateOfficeRoute,
  ZONE_DEFINITIONS,
  DEFAULT_CAMERA,
} from '@/screens/conductor/office/renderers/pixi/movement/navigation'
import { SpriteMovementController } from '@/screens/conductor/office/renderers/pixi/movement/sprite-movement'
import {
  OFFICE_ASSETS,
  getOfficeTexture,
} from '@/screens/conductor/office/renderers/pixi/assets/asset-manifest'

// Mock TanStack router useNavigate
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn().mockResolvedValue(undefined),
}))

const baseAgents: OfficeAgentSceneState[] = [
  {
    id: 'ezity-cos',
    name: 'Chief of Staff',
    roleTitle: 'Chief of Staff',
    department: 'executive',
    currentZoneId: 'executive',
    colorHex: '#3b82f6',
    emoji: '👔',
    status: 'idle',
    attentionState: 'nominal',
    isMoving: false,
    movementReason: 'return_home',
  },
  {
    id: 'ezity-accountant',
    name: 'Accountant',
    roleTitle: 'Senior Accountant',
    department: 'finance',
    currentZoneId: 'finance',
    colorHex: '#10b981',
    emoji: '📊',
    status: 'idle',
    attentionState: 'nominal',
    isMoving: false,
    movementReason: 'return_home',
  },
  {
    id: 'ezity-developer',
    name: 'Developer',
    roleTitle: 'Full-Stack Developer',
    department: 'engineering',
    currentZoneId: 'engineering',
    colorHex: '#06b6d4',
    emoji: '💻',
    status: 'idle',
    attentionState: 'nominal',
    isMoving: false,
    movementReason: 'return_home',
  },
]

const baseScene: OfficeSceneState = {
  agents: baseAgents,
  departments: [
    { id: 'executive', name: 'Executive Suite', colorHex: '#3b82f6' },
    { id: 'finance', name: 'Finance Wing', colorHex: '#10b981' },
    { id: 'engineering', name: 'Engineering Bay', colorHex: '#06b6d4' },
  ],
  zones: [
    { id: 'executive', name: 'Executive Office', type: 'department', occupancy: 1, maxCapacity: 2 },
    { id: 'finance', name: 'Finance Wing', type: 'department', occupancy: 1, maxCapacity: 4 },
    { id: 'engineering', name: 'Engineering Bay', type: 'department', occupancy: 1, maxCapacity: 6 },
    { id: 'review_station', name: 'Review Station', type: 'review', occupancy: 0, maxCapacity: 2 },
    { id: 'meeting_room', name: 'Conference Room', type: 'meeting', occupancy: 0, maxCapacity: 8 },
    { id: 'inbox_board', name: 'Operations Board', type: 'inbox', occupancy: 0, maxCapacity: 4 },
    { id: 'lounge_break', name: 'Staff Lounge', type: 'break', occupancy: 0, maxCapacity: 6 },
  ],
  workItems: [
    {
      id: 'wi-1',
      title: 'Review Q3 Financial Audit',
      urgency: 'high',
      status: 'pending_approval',
      stage: 'approval_stage',
      displayColumn: 'needs_attention',
      assignedAgentId: 'ezity-accountant',
    },
  ],
  pendingApprovalCount: 1,
  pendingApprovals: [
    {
      id: 'apv-1',
      title: 'Sign off Q3 Audit',
      type: 'financial_reconciliation',
      urgency: 'high',
      status: 'pending',
    },
  ],
  activeMissionCount: 0,
  activeMissions: [],
  missionRunning: false,
}

describe('Phase I-D: PixiJS Game-Style Virtual Office Renderer Prototype', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // A. Isometric Coordinate Transformations
  // ──────────────────────────────────────────────────────────────────────────
  describe('A. Isometric Coordinate System & Projections', () => {
    it('projects world coordinates into screen coordinates with 2:1 ratio', () => {
      const p1 = worldToScreen(0, 0, 0, DEFAULT_CAMERA)
      expect(p1.x).toBe(DEFAULT_CAMERA.x)
      expect(p1.y).toBe(DEFAULT_CAMERA.y)

      const p2 = worldToScreen(2, 2, 0, DEFAULT_CAMERA)
      // For (wx=2, wy=2): (wx - wy) = 0 -> screen X stays centered
      expect(p2.x).toBe(DEFAULT_CAMERA.x)
      // (wx + wy) * (32/2) = 4 * 16 = 64
      expect(p2.y).toBe(DEFAULT_CAMERA.y + 64)
    })

    it('performs round-trip worldToScreen and screenToWorld accurately', () => {
      const wx = 5.0
      const wy = 8.0
      const screenPt = worldToScreen(wx, wy, 0, DEFAULT_CAMERA)
      const worldPt = screenToWorld(screenPt.x, screenPt.y, DEFAULT_CAMERA)

      expect(worldPt.x).toBeCloseTo(wx, 2)
      expect(worldPt.y).toBeCloseTo(wy, 2)
    })

    it('defines all 7 required operational zones in layout definition', () => {
      const requiredZones = [
        'executive',
        'finance',
        'engineering',
        'review_station',
        'meeting_room',
        'inbox_board',
        'lounge_break',
      ]

      for (const zoneId of requiredZones) {
        expect(ZONE_DEFINITIONS[zoneId as keyof typeof ZONE_DEFINITIONS]).toBeDefined()
        const def = ZONE_DEFINITIONS[zoneId as keyof typeof ZONE_DEFINITIONS]
        expect(def.doorway).toBeDefined()
        expect(def.primaryAnchor).toBeDefined()
        expect(def.bounds).toBeDefined()
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // B. Connected Organic Navigation Graph & Pathing
  // ──────────────────────────────────────────────────────────────────────────
  describe('B. Navigation Graph & Waypoint Routing', () => {
    it('returns direct path when moving within the same zone', () => {
      const start = { x: 2.0, y: 4.0 }
      const path = calculateOfficeRoute(start, 'executive', 'executive', { x: 3.0, y: 4.5 })
      expect(path.length).toBe(2)
      expect(path[0]).toEqual(start)
      expect(path[1]).toEqual({ x: 3.0, y: 4.5 })
    })

    it('routes through doorways and central hall when moving between different zones', () => {
      // Accountant moving from Finance to Review Station
      const start = ZONE_DEFINITIONS.finance.primaryAnchor
      const path = calculateOfficeRoute(start, 'finance', 'review_station')

      expect(path.length).toBeGreaterThanOrEqual(3)
      // First waypoint must be origin doorway
      expect(path[1].x).toBeCloseTo(ZONE_DEFINITIONS.finance.doorway.x, 1)
      expect(path[1].y).toBeCloseTo(ZONE_DEFINITIONS.finance.doorway.y, 1)
      // Last waypoint must be destination anchor
      const lastPoint = path[path.length - 1]
      expect(lastPoint.x).toBeCloseTo(ZONE_DEFINITIONS.review_station.primaryAnchor.x, 1)
      expect(lastPoint.y).toBeCloseTo(ZONE_DEFINITIONS.review_station.primaryAnchor.y, 1)
    })

    it('routes Conference Room participants through north corridor', () => {
      // Chief of Staff moving from Executive to Conference Room
      const start = ZONE_DEFINITIONS.executive.primaryAnchor
      const path = calculateOfficeRoute(start, 'executive', 'meeting_room')

      expect(path.length).toBeGreaterThanOrEqual(4)
      const lastPoint = path[path.length - 1]
      expect(lastPoint.x).toBeCloseTo(ZONE_DEFINITIONS.meeting_room.primaryAnchor.x, 1)
      expect(lastPoint.y).toBeCloseTo(ZONE_DEFINITIONS.meeting_room.primaryAnchor.y, 1)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // C. Sprite Movement Controller
  // ──────────────────────────────────────────────────────────────────────────
  describe('C. Sprite Movement Controller & Interpolation', () => {
    it('registers initial agent state and stays idle/seated at home', () => {
      const controller = new SpriteMovementController()
      const state = controller.registerAgent('ezity-cos', { x: 2.5, y: 4.0 }, 'down-right', 'sit')

      expect(state.agentId).toBe('ezity-cos')
      expect(state.currentWorldPos).toEqual({ x: 2.5, y: 4.0, z: 0 })
      expect(state.isMoving).toBe(false)
      expect(state.animationState).toBe('sit')
      expect(state.facing).toBe('down-right')
    })

    it('interpolates along waypoints on update frames and switches to walk pose', () => {
      const controller = new SpriteMovementController()
      controller.registerAgent('ezity-accountant', { x: 2.5, y: 10.5 }, 'down-right', 'sit')

      const waypoints = [
        { x: 4.5, y: 9.5 },
        { x: 6.5, y: 9.0 },
      ]

      controller.startNavigation('ezity-accountant', waypoints, 'review', 'up-left')
      const state = controller.getAgentState('ezity-accountant')!

      expect(state.isMoving).toBe(true)
      expect(state.animationState).toBe('walk')

      // Step 0.5s of animation at 3.2 tiles/sec = ~1.6 tiles moved
      controller.update(0.5)
      expect(state.currentWorldPos.x).toBeGreaterThan(2.5)

      // Step enough time to reach destination
      let arrived = false
      state.onArrive = () => {
        arrived = true
      }

      controller.update(3.0)
      expect(state.isMoving).toBe(false)
      expect(state.currentWorldPos.x).toBeCloseTo(6.5, 1)
      expect(state.currentWorldPos.y).toBeCloseTo(9.0, 1)
      expect(state.animationState).toBe('review')
      expect(arrived).toBe(true)
    })

    it('snaps immediately to target when enableReducedMotion is active', () => {
      const controller = new SpriteMovementController()
      controller.setReducedMotion(true)
      controller.registerAgent('ezity-dev', { x: 12.5, y: 6.5 }, 'down-left', 'sit')

      let arrived = false
      controller.startNavigation(
        'ezity-dev',
        [{ x: 10.5, y: 2.5 }],
        'meeting',
        'down-left',
        () => {
          arrived = true
        },
      )

      const state = controller.getAgentState('ezity-dev')!
      expect(state.isMoving).toBe(false)
      expect(state.currentWorldPos).toEqual({ x: 10.5, y: 2.5, z: 0 })
      expect(state.animationState).toBe('meeting')
      expect(arrived).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // D. Asset Manifest Catalog
  // ──────────────────────────────────────────────────────────────────────────
  describe('D. Asset Manifest Catalog', () => {
    it('contains asset definitions for environment, furniture, and characters', () => {
      expect(OFFICE_ASSETS.floor_tile).toBeDefined()
      expect(OFFICE_ASSETS.wall_straight).toBeDefined()
      expect(OFFICE_ASSETS.desk_executive).toBeDefined()
      expect(OFFICE_ASSETS.desk_finance).toBeDefined()
      expect(OFFICE_ASSETS.desk_engineering).toBeDefined()
      expect(OFFICE_ASSETS.table_meeting).toBeDefined()
      expect(OFFICE_ASSETS.board_operations).toBeDefined()
      expect(OFFICE_ASSETS.desk_review).toBeDefined()
      expect(OFFICE_ASSETS.cos_idle).toBeDefined()
      expect(OFFICE_ASSETS.accountant_idle).toBeDefined()
      expect(OFFICE_ASSETS.developer_idle).toBeDefined()
    })

    it('provides valid URLs pointing to public/office asset files', () => {
      expect(OFFICE_ASSETS.floor_tile.url).toBe('/office/environment/floor_tile.svg')
      expect(OFFICE_ASSETS.desk_finance.url).toBe('/office/furniture/desk_finance.svg')
      expect(OFFICE_ASSETS.cos_idle.url).toBe('/office/characters/cos_idle.svg')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // E. Dual Renderer Switcher in OfficeRendererHost
  // ──────────────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  // E. Dual Renderer Switcher in OfficeRendererHost
  // ──────────────────────────────────────────────────────────────────────────
  describe('E. Dual Renderer Switcher in OfficeRendererHost', () => {
    it('defaults to SVG renderer initially', () => {
      const { container } = render(<OfficeRendererHost scene={baseScene} />)
      expect(screen.getByTestId('renderer-switch-svg')).toBeTruthy()
      expect(screen.getByTestId('renderer-switch-pixi')).toBeTruthy()
      // SVG renderer root svg is rendered
      expect(container.querySelector('svg')).not.toBeNull()
    })

    it('switches to Pixi game renderer when user clicks the toggle button', () => {
      render(<OfficeRendererHost scene={baseScene} />)

      const pixiButton = screen.getByTestId('renderer-switch-pixi')
      fireEvent.click(pixiButton)

      expect(window.localStorage.getItem('ezity-office:renderer')).toBe('pixi')
    })

    it('switches back to SVG when user clicks SVG button', () => {
      window.localStorage.setItem('ezity-office:renderer', 'pixi')
      render(<OfficeRendererHost scene={baseScene} />)

      const svgButton = screen.getByTestId('renderer-switch-svg')
      fireEvent.click(svgButton)

      expect(window.localStorage.getItem('ezity-office:renderer')).toBe('svg')
    })

    it('respects officeRenderer prop directly', () => {
      const { container } = render(
        <OfficeRendererHost scene={baseScene} officeRenderer="svg" />,
      )
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // F. PixiOfficeRenderer Component & Accessibility
  // ──────────────────────────────────────────────────────────────────────────
  describe('F. PixiOfficeRenderer Component & Accessibility', () => {
    it('renders accessible DOM controls and staff directory for screen readers', () => {
      render(<PixiOfficeRenderer scene={baseScene} />)

      // Check screen reader content
      expect(
        screen.getByText('EZity Solutions Virtual Office - Game Simulation View'),
      ).toBeTruthy()
      expect(screen.getByText('Executive Suite')).toBeTruthy()
      expect(screen.getByText('Finance Wing')).toBeTruthy()
      expect(screen.getByText('Engineering Bay')).toBeTruthy()
    })

    it('wires agent click handlers through accessible DOM buttons', () => {
      const handleAgentClick = vi.fn()
      render(
        <PixiOfficeRenderer scene={baseScene} onAgentClick={handleAgentClick} />,
      )

      const cosButton = screen.getByRole('button', { name: /Chief of Staff/i })
      fireEvent.click(cosButton)

      expect(handleAgentClick).toHaveBeenCalledWith('ezity-cos', undefined)
    })

    it('wires zone click handlers through accessible DOM buttons', () => {
      const handleZoneClick = vi.fn()
      render(
        <PixiOfficeRenderer scene={baseScene} onZoneClick={handleZoneClick} />,
      )

      const financeButton = screen.getByRole('button', { name: /Finance Wing/i })
      fireEvent.click(financeButton)

      expect(handleZoneClick).toHaveBeenCalledWith('finance')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // G. Real State Movement Mapping
  // ──────────────────────────────────────────────────────────────────────────
  describe('G. Real State Movement Mapping in Pixi Renderer', () => {
    it('maps approval waiting accountant to Review Station in screen reader view', () => {
      const sceneWithApproval: OfficeSceneState = {
        ...baseScene,
        agents: [
          baseAgents[0],
          {
            ...baseAgents[1],
            currentZoneId: 'finance',
            targetZoneId: 'review_station',
            movementReason: 'approval_required',
            isMoving: true,
          },
          baseAgents[2],
        ],
      }

      render(<PixiOfficeRenderer scene={sceneWithApproval} />)

      expect(
        screen.getByRole('button', { name: /Accountant.*Zone: review_station/i }),
      ).toBeTruthy()
    })

    it('maps mission participating agents to Conference Room', () => {
      const sceneWithMission: OfficeSceneState = {
        ...baseScene,
        missionRunning: true,
        agents: [
          {
            ...baseAgents[0],
            currentZoneId: 'executive',
            targetZoneId: 'meeting_room',
            movementReason: 'mission_collaboration',
            isMoving: true,
          },
          baseAgents[1],
          {
            ...baseAgents[2],
            currentZoneId: 'engineering',
            targetZoneId: 'meeting_room',
            movementReason: 'mission_collaboration',
            isMoving: true,
          },
        ],
      }

      render(<PixiOfficeRenderer scene={sceneWithMission} />)

      expect(
        screen.getByRole('button', { name: /Chief of Staff.*Zone: meeting_room/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: /Developer.*Zone: meeting_room/i }),
      ).toBeTruthy()
      // Accountant remains at Finance home
      expect(
        screen.getByRole('button', { name: /Accountant.*Zone: finance/i }),
      ).toBeTruthy()
    })
  })
})
