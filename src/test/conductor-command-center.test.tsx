// @vitest-environment jsdom
/**
 * Conductor Option A Command Center HUD Tests
 *
 * Tests the persistent Virtual Office Command Center layout and its HUD components:
 * - ConductorTopHud
 * - ConductorCommandBar
 * - ConductorAgentInspector
 * - ConductorMissionDrawer
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ConductorTopHud } from '@/screens/conductor/components/conductor-top-hud'
import { ConductorCommandBar } from '@/screens/conductor/components/conductor-command-bar'
import { ConductorAgentInspector } from '@/screens/conductor/components/conductor-agent-inspector'
import { ConductorInboxDrawer } from '@/screens/conductor/components/conductor-inbox-drawer'
import { OfficeRendererHost } from '@/screens/conductor/office/office-renderer-host'
import type { OfficeSceneState, OfficeAgentSceneNode } from '@/types/office-scene'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn().mockResolvedValue(undefined),
}))

const mockScene: OfficeSceneState = {
  companyName: 'EZity AI Office',
  missionRunning: false,
  pendingApprovalCount: 1,
  lastSyncAt: Date.now(),
  agents: [
    {
      id: 'agent-1',
      agentDefinitionId: 'agent-1',
      name: 'Nova',
      roleTitle: 'Chief of Staff',
      department: 'executive',
      emoji: '🤖',
      colorHex: '#a855f7',
      modelId: 'opus',
      status: 'idle',
      attentionState: 'nominal',
      homeDeskId: 'desk-exec-1',
      currentZoneId: 'executive',
      isMoving: false,
      pendingApprovalIds: [],
      activeWorkItemIds: [],
    },
    {
      id: 'agent-2',
      agentDefinitionId: 'agent-2',
      name: 'Sage',
      roleTitle: 'Accountant',
      department: 'finance',
      emoji: '📊',
      colorHex: '#10b981',
      modelId: 'sonnet',
      status: 'working',
      attentionState: 'working',
      homeDeskId: 'desk-fin-1',
      currentZoneId: 'finance',
      currentTaskTitle: 'Reconciling Q3 ledger',
      isMoving: false,
      pendingApprovalIds: [],
      activeWorkItemIds: ['item-1'],
    },
  ],
  rooms: [],
  workItems: [
    {
      id: 'item-1',
      type: 'approval',
      title: 'Approve invoice #INV-2024-001 ($4,250.00)',
      assignedAgentId: 'agent-2',
      status: 'needs_attention',
      priority: 'high',
    },
    {
      id: 'item-2',
      type: 'task',
      title: 'Process vendor batch #992',
      assignedAgentId: 'agent-2',
      status: 'in_progress',
      priority: 'medium',
    },
  ],
}

const mockConductor = {
  phase: 'idle' as const,
  goal: '',
  workers: [],
  tasks: [],
  missionStartedAt: null,
  isPaused: false,
  pausedAtMs: null,
  orchestratorSessionKey: null,
  isPausing: false,
  timeoutWarning: false,
  streamText: '',
  workerOutputs: {},
  conductorSettings: {
    orchestratorModel: 'claude-3-7-sonnet',
    workerModel: 'gemini-2.5-flash',
    projectsDir: '/tmp',
    maxParallel: 4,
    supervised: false,
  },
  missionHistory: [],
  selectedHistoryEntry: null,
  hasPersistedMission: false,
  dismissTimeoutWarning: vi.fn(),
  pauseAgent: vi.fn(),
  stopMission: vi.fn(),
  retryMission: vi.fn(),
  sendMission: vi.fn(),
  resetMission: vi.fn(),
  setSelectedHistoryEntry: vi.fn(),
}

describe('Conductor Command Center HUD Components', () => {
  it('renders ConductorTopHud with company title, agent counts, and renderer switcher', () => {
    const onRendererChange = vi.fn()
    const onHistoryOpen = vi.fn()
    const onSettingsOpen = vi.fn()
    const onToggleMissionDrawer = vi.fn()

    render(
      <ConductorTopHud
        companyName="EZity Solutions"
        officeScene={mockScene}
        conductor={mockConductor as any}
        rendererType="svg"
        onRendererChange={onRendererChange}
        onHistoryOpen={onHistoryOpen}
        onSettingsOpen={onSettingsOpen}
        missionDrawerOpen={false}
        onToggleMissionDrawer={onToggleMissionDrawer}
      />,
    )

    expect(screen.getByText('EZity Solutions')).toBeDefined()
    expect(screen.getByText('1 working · 2 agents')).toBeDefined()

    // Test renderer switcher buttons
    const gameBtn = screen.getByTitle('Switch to Pixi Interactive Game Office')
    fireEvent.click(gameBtn)
    expect(onRendererChange).toHaveBeenCalledWith('pixi')

    // Test settings button
    const settingsBtn = screen.getByLabelText('Conductor Settings')
    fireEvent.click(settingsBtn)
    expect(onSettingsOpen).toHaveBeenCalled()
  })

  it('renders ConductorCommandBar with prompt input and quick action chips', () => {
    const setGoalDraft = vi.fn()
    const onSubmit = vi.fn()

    render(
      <ConductorCommandBar
        goalDraft=""
        setGoalDraft={setGoalDraft}
        onSubmit={onSubmit}
        isSending={false}
      />,
    )

    expect(screen.getByPlaceholderText(/Assign a mission to your agent team/i)).toBeDefined()
    expect(screen.getByText('Research')).toBeDefined()
    expect(screen.getByText('Build')).toBeDefined()
    expect(screen.getByText('Review')).toBeDefined()
    expect(screen.getByText('Deploy')).toBeDefined()

    // Click Research quick chip
    fireEvent.click(screen.getByText('Research'))
    expect(setGoalDraft).toHaveBeenCalledWith(
      expect.stringContaining('Research the problem space'),
    )
  })

  it('renders ConductorAgentInspector when an agent is selected and supports chat action', () => {
    const onClose = vi.fn()
    const onOpenChat = vi.fn()
    const agent: OfficeAgentSceneNode = mockScene.agents[1]

    render(
      <ConductorAgentInspector
        agent={agent}
        onClose={onClose}
        onOpenChat={onOpenChat}
      />,
    )

    expect(screen.getByText('Sage')).toBeDefined()
    expect(screen.getByText('Accountant')).toBeDefined()
    expect(screen.getByText('📍 Finance Wing')).toBeDefined()
    expect(screen.getByText('Reconciling Q3 ledger')).toBeDefined()

    // Test Chat button
    const chatBtn = screen.getByText('Chat with Sage')
    expect(chatBtn).toBeDefined()
    fireEvent.click(chatBtn)
    expect(onOpenChat).toHaveBeenCalledWith(agent)
  })

  it('supports interactive zoom in, zoom out, and reset on the canvas', () => {
    render(<OfficeRendererHost scene={mockScene} officeRenderer="svg" />)

    // Initial zoom is 100%
    expect(screen.getByTestId('zoom-reset-btn').textContent).toBe('100%')

    // Click Zoom In
    fireEvent.click(screen.getByTestId('zoom-in-btn'))
    expect(screen.getByTestId('zoom-reset-btn').textContent).toBe('115%')

    // Click Zoom Out twice
    fireEvent.click(screen.getByTestId('zoom-out-btn'))
    fireEvent.click(screen.getByTestId('zoom-out-btn'))
    expect(screen.getByTestId('zoom-reset-btn').textContent).toBe('85%')

    // Reset zoom back to 100%
    fireEvent.click(screen.getByTestId('zoom-reset-btn'))
    expect(screen.getByTestId('zoom-reset-btn').textContent).toBe('100%')
  })

  it('renders ConductorTopHud with Inbox trigger button showing pending count', () => {
    const onInboxOpen = vi.fn()

    render(
      <ConductorTopHud
        companyName="EZity Solutions"
        officeScene={mockScene}
        conductor={mockConductor as any}
        rendererType="svg"
        onRendererChange={vi.fn()}
        onHistoryOpen={vi.fn()}
        onSettingsOpen={vi.fn()}
        missionDrawerOpen={false}
        onToggleMissionDrawer={vi.fn()}
        inboxOpen={false}
        onInboxOpen={onInboxOpen}
      />,
    )

    const inboxBtn = screen.getByLabelText(/Operations Inbox/i)
    expect(inboxBtn).toBeDefined()
    // Should show count badge (2 items)
    expect(screen.getByText('2')).toBeDefined()

    fireEvent.click(inboxBtn)
    expect(onInboxOpen).toHaveBeenCalled()
  })

  it('renders ConductorInboxDrawer with work items, filtering tabs, and agent locator', () => {
    const onClose = vi.fn()
    const onLocateAgent = vi.fn()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <ConductorInboxDrawer
          open={true}
          onClose={onClose}
          scene={mockScene}
          onLocateAgent={onLocateAgent}
        />
      </QueryClientProvider>,
    )

    // Verify title and item count
    expect(screen.getByText('Operations Board & Inbox')).toBeDefined()
    expect(screen.getByText('Approve invoice #INV-2024-001 ($4,250.00)')).toBeDefined()
    expect(screen.getByText('Process vendor batch #992')).toBeDefined()

    // Test filter tabs: Click "Attention" tab
    fireEvent.click(screen.getByRole('button', { name: /Attention/i }))
    expect(screen.getByText('Approve invoice #INV-2024-001 ($4,250.00)')).toBeDefined()
    expect(screen.queryByText('Process vendor batch #992')).toBeNull()

    // Test locate agent button
    const locateBtn = screen.getAllByTitle('Locate agent at their desk')[0]
    fireEvent.click(locateBtn)
    expect(onLocateAgent).toHaveBeenCalledWith('agent-2')

    // Test close button
    const closeBtn = screen.getByLabelText('Close operations board')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('triggers onWorkItemClick when Operations Board is clicked on SVG canvas', () => {
    const onWorkItemClick = vi.fn()

    render(
      <OfficeRendererHost
        scene={mockScene}
        officeRenderer="svg"
        onWorkItemClick={onWorkItemClick}
      />,
    )

    // The SVG Operations Board has role="button" with aria-label starting with "Work Inbox Board"
    const board = screen.getByRole('button', { name: /Work Inbox Board/i })
    expect(board).toBeDefined()

    fireEvent.click(board)
    expect(onWorkItemClick).toHaveBeenCalledWith('inbox-root')
  })

  it('opens floating chat and invokes onAgentClick when an agent is clicked in OfficeRendererHost', async () => {
    const onAgentClick = vi.fn()
    window.innerWidth = 1200
    useWorkspaceStore.setState({ chatPanelOpen: false })

    render(
      <OfficeRendererHost
        scene={mockScene}
        officeRenderer="svg"
        onAgentClick={onAgentClick}
      />,
    )

    // Find Sage's button on the SVG canvas (by role or title or label)
    const agentBtn = screen.getAllByRole('button', { name: /Sage/i })[0]
    expect(agentBtn).toBeDefined()

    fireEvent.click(agentBtn)

    // Verified onAgentClick was called
    expect(onAgentClick).toHaveBeenCalledWith('agent-2', undefined)

    // Verified floating chat panel was opened in workspace store
    await vi.waitFor(() => {
      expect(useWorkspaceStore.getState().chatPanelOpen).toBe(true)
    })
  })

  it('triggers onCanvasClick when clicking on the canvas floor/background to dismiss modals', () => {
    const onCanvasClick = vi.fn()

    const { container } = render(
      <OfficeRendererHost
        scene={mockScene}
        officeRenderer="svg"
        onCanvasClick={onCanvasClick}
      />,
    )

    // The desktop viewport container wraps the SVG floor
    const viewport = container.querySelector('.cursor-grab')
    expect(viewport).toBeDefined()

    // Click on the SVG floor/background
    fireEvent.click(viewport!)
    expect(onCanvasClick).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger onCanvasClick when dragging/panning the canvas', () => {
    const onCanvasClick = vi.fn()

    const { container } = render(
      <OfficeRendererHost
        scene={mockScene}
        officeRenderer="svg"
        onCanvasClick={onCanvasClick}
      />,
    )

    const viewport = container.querySelector('.cursor-grab')
    expect(viewport).toBeDefined()

    // Simulate drag gesture (mousedown -> mousemove > 4px -> mouseup -> click)
    fireEvent.mouseDown(viewport!, { clientX: 100, clientY: 100, button: 0 })
    fireEvent.mouseMove(viewport!, { clientX: 150, clientY: 150 })
    fireEvent.mouseUp(viewport!)
    fireEvent.click(viewport!)

    expect(onCanvasClick).not.toHaveBeenCalled()
  })

  it('does NOT trigger onCanvasClick when clicking an agent button', () => {
    const onCanvasClick = vi.fn()
    const onAgentClick = vi.fn()

    render(
      <OfficeRendererHost
        scene={mockScene}
        officeRenderer="svg"
        onCanvasClick={onCanvasClick}
        onAgentClick={onAgentClick}
      />,
    )

    const agentBtn = screen.getAllByRole('button', { name: /Sage/i })[0]
    fireEvent.click(agentBtn)

    expect(onAgentClick).toHaveBeenCalled()
    expect(onCanvasClick).not.toHaveBeenCalled()
  })
})
