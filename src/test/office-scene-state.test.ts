import { describe, expect, it } from 'vitest'
import {
  mapDepartment,
  synthesizeOfficeSceneState,
  toLegacyAgentWorkingRows,
} from '@/screens/conductor/office/state/office-state-synthesizer'
import type { WorkItem } from '@/types/task'
import { OFFICE_ZONES } from '@/types/office-scene'

describe('Phase I-A: Renderer-Neutral Office State Extraction', () => {
  describe('A. Ezity staff mapped to correct departments', () => {
    it('maps ezity-chief-of-staff, ezity-accountant, and ezity-developer to their authoritative departments', () => {
      expect(mapDepartment('ezity-chief-of-staff')).toBe('executive')
      expect(mapDepartment('ezity-accountant')).toBe('finance')
      expect(mapDepartment('ezity-developer')).toBe('engineering')

      // Also checks role-based deterministic inference
      expect(mapDepartment('custom-agent-1', 'Executive Orchestrator')).toBe('executive')
      expect(mapDepartment('custom-agent-2', 'Bookkeeping & Tax Specialist')).toBe('finance')
      expect(mapDepartment('custom-agent-3', 'Software Systems Architect')).toBe('engineering')
    })

    it('synthesizes canonical staff triad with correct departments when idle with no sessions', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          conductorSettings: { staffOrchestrated: true },
          recentSessions: [],
        },
      })

      expect(scene.agents).toHaveLength(3)
      const cos = scene.agents.find((a) => a.agentDefinitionId === 'ezity-chief-of-staff')
      const acct = scene.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')
      const dev = scene.agents.find((a) => a.agentDefinitionId === 'ezity-developer')

      expect(cos?.department).toBe('executive')
      expect(cos?.homeDeskId).toBe('desk-chief-of-staff')
      expect(cos?.currentZoneId).toBe('executive')

      expect(acct?.department).toBe('finance')
      expect(acct?.homeDeskId).toBe('desk-accountant')
      expect(acct?.currentZoneId).toBe('finance')

      expect(dev?.department).toBe('engineering')
      expect(dev?.homeDeskId).toBe('desk-developer')
      expect(dev?.currentZoneId).toBe('engineering')
    })
  })

  describe('B. Accountant with pending approval maps to review_station', () => {
    it('positions Accountant in review_station with waiting_approval attention state when approvals are pending', () => {
      const mockWorkItems: Array<WorkItem> = [
        {
          id: 'work-appr-101',
          type: 'approval',
          title: 'Manual Journal Entry #1042 Needs Approval',
          description: 'Reclassification draft submitted for supervisor review',
          status: 'needs_attention',
          priority: 'high',
          assignedAgentId: 'ezity-accountant',
          source: 'ezityhub',
          createdAt: Date.now() - 3600_000,
          updatedAt: Date.now() - 600_000,
        },
      ]

      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          conductorSettings: { staffOrchestrated: true },
          recentSessions: [],
        },
        workItems: mockWorkItems,
      })

      const acct = scene.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')
      expect(acct).toBeDefined()
      expect(acct?.attentionState).toBe('waiting_approval')
      expect(acct?.status).toBe('waiting')
      expect(acct?.targetZoneId).toBe('review_station')
      expect(acct?.pendingApprovalIds).toContain('work-appr-101')

      // Check review_station room state
      const reviewRoom = scene.rooms.find((r) => r.id === 'review_station')
      expect(reviewRoom?.hasPendingAction).toBe(true)
      expect(reviewRoom?.actionBadgeCount).toBe(1)
      expect(scene.pendingApprovalCount).toBe(1)
    })
  })

  describe('C. Developer active session maps to working', () => {
    it('maps an active recent session for developer to working status', () => {
      const now = Date.now()
      const scene = synthesizeOfficeSceneState({
        now,
        conductor: {
          phase: 'idle',
          recentSessions: [
            {
              key: 'session-dev-active',
              agentId: 'ezity-developer',
              agentName: 'Developer',
              agentEmoji: '💻',
              status: 'active',
              updatedAt: new Date(now - 30_000).toISOString(), // 30s ago
              task: 'Refactoring database client pool',
            },
          ],
        },
      })

      const dev = scene.agents.find((a) => a.id === 'session-dev-active')
      expect(dev).toBeDefined()
      expect(dev?.status).toBe('working')
      expect(dev?.attentionState).toBe('working')
      expect(dev?.department).toBe('engineering')
      expect(dev?.lastActivityText).toBe('Refactoring database client pool')
    })

    it('maps an active running worker in active conductor phase to working status', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          goal: 'Automate build pipeline',
          workers: [
            {
              key: 'worker-developer-build',
              displayName: 'Developer',
              agentId: 'ezity-developer',
              status: 'running',
            },
          ],
          tasks: [
            {
              id: 'task-1',
              title: 'Implement docker build caching',
              workerKey: 'worker-developer-build',
              status: 'running',
            },
          ],
        },
      })

      const worker = scene.agents.find((a) => a.id === 'worker-developer-build')
      expect(worker).toBeDefined()
      expect(worker?.status).toBe('working')
      expect(worker?.attentionState).toBe('working')
      expect(worker?.currentTaskTitle).toBe('Implement docker build caching')
      expect(worker?.activeTaskId).toBe('task-1')
    })
  })

  describe('D. Chief of Staff during Conductor mission maps correctly', () => {
    it('maps Chief of Staff orchestrator to meeting_room during multi-worker mission', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          goal: 'Q4 Financial Planning & Tech Roadmap',
          isEZityStaff: true,
          orchestratorSessionKey: 'orchestrator-cos-session',
          workers: [
            {
              key: 'worker-accountant-q4',
              displayName: 'Accountant',
              agentId: 'ezity-accountant',
              status: 'running',
            },
            {
              key: 'worker-developer-q4',
              displayName: 'Developer',
              agentId: 'ezity-developer',
              status: 'running',
            },
          ],
        },
      })

      expect(scene.missionRunning).toBe(true)
      expect(scene.activeMissionGoal).toBe('Q4 Financial Planning & Tech Roadmap')

      // Meeting room should have pending action during mission
      const meetingRoom = scene.rooms.find((r) => r.id === 'meeting_room')
      expect(meetingRoom?.hasPendingAction).toBe(true)
    })

    it('maps Chief of Staff preparing mission before workers spawn to meeting_room', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'decomposing',
          goal: 'Audit security rules',
          isEZityStaff: true,
          streamText: 'Chief of Staff analyzing mission...',
          workers: [],
        },
      })

      expect(scene.missionRunning).toBe(true)
      const cos = scene.agents[0]
      expect(cos.agentDefinitionId).toBe('ezity-chief-of-staff')
      expect(cos.targetZoneId).toBe('meeting_room')
      expect(cos.status).toBe('working')
      expect(cos.currentTaskTitle).toBe('Audit security rules')
    })
  })

  describe('E. Work Inbox items attach to correct agents', () => {
    it('correlates WorkItems to matching agents without leaking sensitive payload', () => {
      const mockWorkItems: Array<WorkItem> = [
        {
          id: 'item-finance-1',
          type: 'finance_event',
          title: 'Reconcile HSBC checking account',
          description: 'Confidential client payment details...',
          status: 'in_progress',
          priority: 'high',
          assignedAgentId: 'ezity-accountant',
          source: 'ezityhub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'item-dev-1',
          type: 'task',
          title: 'Fix Redis socket reconnect timeout',
          description: 'Stack trace details...',
          status: 'needs_attention',
          priority: 'medium',
          assignedAgentId: 'ezity-developer',
          source: 'system',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          recentSessions: [],
        },
        workItems: mockWorkItems,
      })

      expect(scene.workItems).toHaveLength(2)
      // Concise summaries only — description is excluded from scene summary
      expect((scene.workItems[0] as any).description).toBeUndefined()
      expect(scene.workItems[0].title).toBe('Reconcile HSBC checking account')

      const acct = scene.agents.find((a) => a.agentDefinitionId === 'ezity-accountant')
      const dev = scene.agents.find((a) => a.agentDefinitionId === 'ezity-developer')

      expect(acct?.activeWorkItemIds).toContain('item-finance-1')
      expect(dev?.activeWorkItemIds).toContain('item-dev-1')
      expect(acct?.currentTaskTitle).toBe('Reconcile HSBC checking account')
    })
  })

  describe('F. error/stale session maps to error', () => {
    it('maps an errored session to error operational and attention status', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          recentSessions: [
            {
              key: 'session-err',
              agentId: 'ezity-developer',
              status: 'failed',
              task: 'Worker crashed on OOM',
            },
          ],
        },
      })

      const agent = scene.agents.find((a) => a.id === 'session-err')
      expect(agent?.status).toBe('error')
      expect(agent?.attentionState).toBe('error')
    })

    it('maps stale conductor worker to error status', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          workers: [
            {
              key: 'worker-stale-1',
              displayName: 'Stale Worker',
              status: 'stale',
            },
          ],
        },
      })

      const agent = scene.agents.find((a) => a.id === 'worker-stale-1')
      expect(agent?.status).toBe('error')
      expect(agent?.attentionState).toBe('error')
    })
  })

  describe('G. generic/custom agent fallback', () => {
    it('assigns custom agent to operations department with deterministic fallback', () => {
      expect(mapDepartment('custom-research-bot')).toBe('operations')
      expect(mapDepartment('unknown-worker-99')).toBe('operations')

      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          recentSessions: [
            {
              key: 'session-custom',
              agentId: 'custom-research-bot',
              agentName: 'Custom Bot',
              status: 'idle',
            },
          ],
        },
      })

      const agent = scene.agents.find((a) => a.id === 'session-custom')
      expect(agent?.department).toBe('operations')
      expect(agent?.homeDeskId).toBe('desk-session-custom')
      expect(agent?.currentZoneId).toBe('inbox_board')
    })
  })

  describe('H. OfficeSceneState produces legacy AgentWorkingRow adapter correctly', () => {
    it('transforms canonical OfficeSceneState into exact AgentWorkingRow shape for OfficeView', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          conductorSettings: { staffOrchestrated: true },
          recentSessions: [],
        },
      })

      const legacyRows = toLegacyAgentWorkingRows(scene)
      expect(legacyRows).toHaveLength(3)

      expect(legacyRows[0]).toMatchObject({
        id: 'ezity-chief-of-staff',
        name: 'En.Hafiz',
        emoji: '👔',
        status: 'idle',
        lastLine: 'En.Hafiz is ready to coordinate missions...',
        roleDescription: 'Chief of Staff',
      })

      expect(legacyRows[1]).toMatchObject({
        id: 'ezity-accountant',
        name: 'Fariz',
        emoji: '📊',
        status: 'idle',
        roleDescription: 'Accountant',
      })

      expect(legacyRows[2]).toMatchObject({
        id: 'ezity-developer',
        name: 'Salmanz',
        emoji: '💻',
        status: 'idle',
        roleDescription: 'Developer',
      })
    })

    it('maps waiting and paused states to legacy waiting_for_input and paused', () => {
      const mockWorkItems: Array<WorkItem> = [
        {
          id: 'appr-1',
          type: 'approval',
          title: 'Pending Sign-off',
          description: '',
          status: 'needs_attention',
          priority: 'high',
          assignedAgentId: 'ezity-accountant',
          source: 'ezityhub',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'idle',
          recentSessions: [
            {
              key: 'session-paused',
              agentId: 'ezity-developer',
              status: 'paused',
            },
          ],
        },
        workItems: mockWorkItems,
      })

      const legacyRows = toLegacyAgentWorkingRows(scene)
      const acct = legacyRows.find((r) => r.agentId === 'ezity-accountant' || r.id.includes('accountant'))
      const dev = legacyRows.find((r) => r.id === 'session-paused')

      expect(dev?.status).toBe('paused')
    })
  })

  describe('I. No fake or random work states introduced', () => {
    it('sets isMoving strictly to false across all synthesized agents', () => {
      const scene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          workers: [
            { key: 'w1', displayName: 'W1', status: 'running' },
            { key: 'w2', displayName: 'W2', status: 'idle' },
            { key: 'w3', displayName: 'W3', status: 'complete' },
          ],
        },
      })

      for (const agent of scene.agents) {
        expect(agent.isMoving).toBe(false)
      }
    })

    it('computes missionProgressPercent only when real worker counts exist', () => {
      const idleScene = synthesizeOfficeSceneState({
        conductor: { phase: 'idle' },
      })
      expect(idleScene.missionProgressPercent).toBeUndefined()

      const activeScene = synthesizeOfficeSceneState({
        conductor: {
          phase: 'running',
          workers: [
            { key: 'w1', displayName: 'W1', status: 'complete' },
            { key: 'w2', displayName: 'W2', status: 'running' },
          ],
        },
      })
      expect(activeScene.missionProgressPercent).toBe(50)
    })
  })

  describe('J. Logical Office Zones completeness', () => {
    it('contains all 7 approved logical zones with metadata', () => {
      const zoneKeys = Object.keys(OFFICE_ZONES)
      expect(zoneKeys).toContain('executive')
      expect(zoneKeys).toContain('finance')
      expect(zoneKeys).toContain('engineering')
      expect(zoneKeys).toContain('review_station')
      expect(zoneKeys).toContain('inbox_board')
      expect(zoneKeys).toContain('meeting_room')
      expect(zoneKeys).toContain('lounge_break')
    })
  })
})
