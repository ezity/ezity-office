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
import { ConductorTopHud } from '@/screens/conductor/components/conductor-top-hud'
import { ConductorCommandBar } from '@/screens/conductor/components/conductor-command-bar'
import { ConductorAgentInspector } from '@/screens/conductor/components/conductor-agent-inspector'
import type { OfficeSceneState, OfficeAgentSceneNode } from '@/types/office-scene'

const mockScene: OfficeSceneState = {
  companyName: 'EZity AI Office',
  missionRunning: false,
  pendingApprovalCount: 0,
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
      activeWorkItemIds: [],
    },
  ],
  rooms: [],
  workItems: [],
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

  it('renders ConductorAgentInspector when an agent is selected', () => {
    const onClose = vi.fn()
    const agent: OfficeAgentSceneNode = mockScene.agents[1]

    render(<ConductorAgentInspector agent={agent} onClose={onClose} />)

    expect(screen.getByText('Sage')).toBeDefined()
    expect(screen.getByText('Accountant')).toBeDefined()
    expect(screen.getByText('📍 Finance Wing')).toBeDefined()
    expect(screen.getByText('Reconciling Q3 ledger')).toBeDefined()
  })
})
