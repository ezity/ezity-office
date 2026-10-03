import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentDefinition } from '@/types/agent'
import {
  buildEZityOrchestratorPrompt,
  buildOrchestratorPrompt,
} from '@/routes/api/conductor-spawn'
import { getAgent, listAgents } from '@/server/agent-definitions-store'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'conductor-ezity-test-'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('Phase C: Conductor EZity Staff Integration', () => {
  describe('A. EZity Conductor launches as Chief of Staff', () => {
    it('generates orchestrator prompt inheriting Chief of Staff identity and system prompt', () => {
      const cos = getAgent('ezity-chief-of-staff')
      expect(cos).toBeDefined()
      if (!cos) return

      const accountant = getAgent('ezity-accountant')!
      const developer = getAgent('ezity-developer')!
      const roster = [accountant, developer]

      const prompt = buildEZityOrchestratorPrompt(
        'Prepare Q3 corporate summary',
        'skill-dispatch-content',
        cos,
        roster,
        {
          orchestratorModel: 'anthropic/claude-3-5-sonnet',
          workerModel: 'openai/gpt-4o',
          projectsDir: '/workspace/output',
          maxParallel: 2,
          supervised: false,
        },
      )

      expect(prompt).toContain('You are Chief of Staff')
      expect(prompt).toContain(cos.systemPrompt)
      expect(prompt).toContain('Goal: Prepare Q3 corporate summary')
      expect(prompt).toContain(
        'Use model: anthropic/claude-3-5-sonnet for the Chief of Staff orchestrator',
      )
      expect(prompt).toContain('Run up to 2 workers in parallel')
      expect(prompt).toContain('/workspace/output/dispatch-<slug>')
    })

    it('maps orchestrator session and cron run prefix to ezity-chief-of-staff in session store', async () => {
      const { setSessionAgent, getSessionAgent } =
        await import('@/server/session-agent-store')

      const jobId = 'test-job-999'
      const sessionKey = `conductor-${jobId}`
      const prefix = `cron_${jobId}_`

      setSessionAgent(sessionKey, 'ezity-chief-of-staff')
      setSessionAgent(prefix, 'ezity-chief-of-staff')

      expect(getSessionAgent(sessionKey)).toBe('ezity-chief-of-staff')
      // Hermes cron sessions are named cron_<jobId>_<timestamp>
      const runtimeCronSessionKey = `cron_${jobId}_20261003_120000`
      expect(getSessionAgent(runtimeCronSessionKey)).toBe(
        'ezity-chief-of-staff',
      )
    })
  })

  describe('B. Staff roster contains Accountant and Developer', () => {
    it('injects Accountant and Developer with id, name, role, and model into orchestrator prompt', () => {
      const cos = getAgent('ezity-chief-of-staff')!
      const accountant = getAgent('ezity-accountant')!
      const developer = getAgent('ezity-developer')!
      const roster = [accountant, developer]

      const prompt = buildEZityOrchestratorPrompt(
        'Audit cloud infrastructure and budget',
        '',
        cos,
        roster,
        {
          orchestratorModel: '',
          workerModel: '',
          projectsDir: '',
          maxParallel: 1,
          supervised: true,
        },
      )

      expect(prompt).toContain('## Available Staff Roster')
      expect(prompt).toContain(
        '**Accountant** (`ezity-accountant`) — Financial & Accounting Specialist',
      )
      expect(prompt).toContain(
        '**Developer** (`ezity-developer`) — Lead Software Engineer',
      )
      expect(prompt).toContain('Supervised mode is enabled')
    })
  })

  describe('C. Worker identity maps to correct AgentDefinition', () => {
    it('auto-maps worker sessions by naming convention to AgentDefinition in decorateWithAgent', async () => {
      const { decorateWithAgent } = await import('@/routes/api/sessions')
      const { getSessionAgent } = await import('@/server/session-agent-store')

      const rawSessions = [
        { key: 'session-acct-1', label: 'worker-accountant-audit' },
        { key: 'session-dev-1', label: 'worker-developer-api-refactor' },
        { key: 'session-generic-1', label: 'worker-research-market' },
      ]

      const decorated = rawSessions.map((s) => decorateWithAgent(s))

      const acctSession = decorated.find((s) => s.key === 'session-acct-1')
      expect(acctSession?.agentId).toBe('ezity-accountant')
      expect(acctSession?.agentName).toBe('Accountant')
      expect(acctSession?.agentEmoji).toBe('📊')

      const devSession = decorated.find((s) => s.key === 'session-dev-1')
      expect(devSession?.agentId).toBe('ezity-developer')
      expect(devSession?.agentName).toBe('Developer')
      expect(devSession?.agentEmoji).toBe('💻')

      const genSession = decorated.find((s) => s.key === 'session-generic-1')
      expect(genSession?.agentId).toBeUndefined()

      // Also verifies persistent store was populated
      expect(getSessionAgent('session-acct-1')).toBe('ezity-accountant')
      expect(getSessionAgent('session-dev-1')).toBe('ezity-developer')
      expect(getSessionAgent('session-generic-1')).toBeNull()
    })
  })

  describe('D. Persona and model information propagates where supported', () => {
    it('instructs Chief of Staff to delegate explicitly to worker-accountant and worker-developer with persona and model', () => {
      const cos = getAgent('ezity-chief-of-staff')!
      const accountant = {
        ...getAgent('ezity-accountant')!,
        model: 'custom-finance-model',
      }
      const developer = getAgent('ezity-developer')!
      const roster = [accountant, developer]

      const prompt = buildEZityOrchestratorPrompt(
        'Execute financial forecast and deploy API',
        '',
        cos,
        roster,
        {
          orchestratorModel: '',
          workerModel: 'default-worker-model',
          projectsDir: '/tmp',
          maxParallel: 2,
          supervised: false,
        },
      )

      expect(prompt).toContain('worker-accountant-<task-slug>')
      expect(prompt).toContain('worker-developer-<task-slug>')
      expect(prompt).toContain('Model: custom-finance-model')
      expect(prompt).toContain(
        "**Persona & Model Propagation**: Embed the staff member's role and core responsibilities directly into each worker prompt",
      )
      expect(prompt).toContain(
        '**Final Synthesis**: As Chief of Staff, synthesize all worker findings into an executive briefing for leadership',
      )
    })
  })

  describe('E. Generic Conductor behavior remains unchanged', () => {
    it('generates generic orchestrator prompt without EZity staff persona or roster', () => {
      const prompt = buildOrchestratorPrompt(
        'Build a simple static page',
        'skill-dispatch-info',
        {
          orchestratorModel: 'generic-orch-model',
          workerModel: 'generic-worker-model',
          projectsDir: '/tmp',
          maxParallel: 1,
          supervised: false,
        },
      )

      expect(prompt).toContain(
        'You are a mission orchestrator. Execute this mission autonomously.',
      )
      expect(prompt).not.toContain('Chief of Staff')
      expect(prompt).not.toContain('Available EZity Staff Team')
      expect(prompt).not.toContain('worker-accountant-')
      expect(prompt).not.toContain('worker-developer-')
      expect(prompt).toContain('Label workers as "worker-<task-slug>"')
    })
  })

  describe('F. Missing or deleted staff definition degrades gracefully', () => {
    it('handles empty or missing staff roster gracefully without errors', () => {
      const cos = getAgent('ezity-chief-of-staff')!
      const emptyRoster: Array<AgentDefinition> = []

      const prompt = buildEZityOrchestratorPrompt(
        'Solo mission without extra staff',
        '',
        cos,
        emptyRoster,
        {
          orchestratorModel: '',
          workerModel: '',
          projectsDir: '',
          maxParallel: 1,
          supervised: false,
        },
      )

      expect(prompt).toContain('You are Chief of Staff')
      expect(prompt).toContain(
        '(No specialized staff defined; spawn general workers as needed)',
      )
    })
  })
})
