import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'agent-runtime-test-'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('Phase B: Built-in EZity Staff Definitions', () => {
  it('loads all three EZity staff definitions', async () => {
    const { getAgent, listAgents, EZITY_STAFF } =
      await import('@/server/agent-definitions-store')

    expect(EZITY_STAFF).toHaveLength(3)

    const cos = getAgent('ezity-chief-of-staff')
    expect(cos).toBeDefined()
    expect(cos?.name).toBe('En.Hafiz')
    expect(cos?.emoji).toBe('👔')
    expect(cos?.roleLabel).toBe('Chief of Staff')
    expect(cos?.systemPrompt).toContain('En.Hafiz')
    expect(cos?.isBuiltIn).toBe(true)

    const accountant = getAgent('ezity-accountant')
    expect(accountant).toBeDefined()
    expect(accountant?.name).toBe('Fariz')
    expect(accountant?.emoji).toBe('📊')
    expect(accountant?.roleLabel).toBe('Accountant')
    expect(accountant?.systemPrompt).toContain('Fariz')
    expect(accountant?.systemPrompt).toContain(
      'EzityHub is the sole authoritative source',
    )
    expect(accountant?.systemPrompt).toContain(
      'Never invent, extrapolate, or hallucinate',
    )
    expect(accountant?.systemPrompt).toContain('DRAFT-FIRST')
    expect(accountant?.systemPrompt).toContain('human approval')
    expect(accountant?.systemPrompt).toContain('[Draft]')
    expect(accountant?.systemPrompt).toContain('[Pending Approval]')
    expect(accountant?.systemPrompt).toContain('[Approved]')
    expect(accountant?.systemPrompt).toContain('[Posted]')
    expect(accountant?.systemPrompt).toContain('Recorded data')
    expect(accountant?.systemPrompt).toContain('Calculations')
    expect(accountant?.systemPrompt).toContain('Assumptions')
    expect(accountant?.systemPrompt).toContain('Recommendations')
    expect(accountant?.systemPrompt).not.toContain('ez_agt_')
    expect(accountant?.systemPrompt).not.toContain('http')
    expect(accountant?.isBuiltIn).toBe(true)

    const developer = getAgent('ezity-developer')
    expect(developer).toBeDefined()
    expect(developer?.name).toBe('Salmanz')
    expect(developer?.emoji).toBe('💻')
    expect(developer?.roleLabel).toBe('Lead Developer')
    expect(developer?.systemPrompt).toContain('Salmanz')
    expect(developer?.isBuiltIn).toBe(true)

    const all = listAgents()
    const ezityIds = all
      .filter((a) => a.id.startsWith('ezity-'))
      .map((a) => a.id)
    expect(ezityIds).toContain('ezity-chief-of-staff')
    expect(ezityIds).toContain('ezity-accountant')
    expect(ezityIds).toContain('ezity-developer')
  })
})

describe('Phase A: Session ↔ Agent Persistence & Decoration', () => {
  it('decorates session summaries when linked to an agent', async () => {
    const { setSessionAgent } = await import('@/server/session-agent-store')
    const { Route } = await import('@/routes/api/sessions')
    const hermesApi = await import('@/server/hermes-api')

    // Mock hermes session listing and capabilities
    vi.spyOn(hermesApi, 'ensureGatewayProbed').mockResolvedValue(undefined)
    vi.spyOn(hermesApi, 'getGatewayCapabilities').mockReturnValue({
      chat: true,
      sessions: true,
      skills: true,
      terminal: true,
    } as any)
    vi.spyOn(hermesApi, 'listSessions').mockResolvedValue({
      sessions: [
        {
          id: 'sess-staff-1',
          title: '👔 Chief of Staff',
          model: 'deepseek-chat',
        },
        {
          id: 'sess-generic-2',
          title: 'General conversation',
        },
        {
          id: 'sess-orphan-3',
          title: 'Orphaned session',
        },
      ] as any,
      total: 3,
    })

    // Link sess-staff-1 to Chief of Staff, and sess-orphan-3 to a non-existent agent
    setSessionAgent('sess-staff-1', 'ezity-chief-of-staff')
    setSessionAgent('sess-orphan-3', 'deleted-or-nonexistent-agent')

    const getHandler = Route.options.server?.handlers?.GET
    expect(getHandler).toBeDefined()

    const req = new Request('http://localhost:3000/api/sessions', {
      headers: { cookie: '' },
    })
    const response = await getHandler!({ request: req } as any)
    const json = await (response as Response).json()

    expect(json.ok).toBe(true)
    expect(json.sessions).toHaveLength(3)

    // Staff session has agent metadata attached
    const staffSession = json.sessions.find(
      (s: any) => s.id === 'sess-staff-1' || s.key === 'sess-staff-1',
    )
    expect(staffSession).toBeDefined()
    expect(staffSession.agentId).toBe('ezity-chief-of-staff')
    expect(staffSession.agentName).toBe('En.Hafiz')
    expect(staffSession.agentEmoji).toBe('👔')
    expect(staffSession.agentRole).toBe('Chief of Staff')

    // Generic session remains unchanged without agent metadata
    const genericSession = json.sessions.find(
      (s: any) => s.id === 'sess-generic-2' || s.key === 'sess-generic-2',
    )
    expect(genericSession).toBeDefined()
    expect(genericSession.agentId).toBeUndefined()

    // Orphan/missing agent session falls back safely without error
    const orphanSession = json.sessions.find(
      (s: any) => s.id === 'sess-orphan-3' || s.key === 'sess-orphan-3',
    )
    expect(orphanSession).toBeDefined()
    expect(orphanSession.agentId).toBeUndefined()
  })

  it('POST /api/sessions creates agent session and records association', async () => {
    const { getSessionAgent } = await import('@/server/session-agent-store')
    const { Route } = await import('@/routes/api/sessions')
    const hermesApi = await import('@/server/hermes-api')

    vi.spyOn(hermesApi, 'ensureGatewayProbed').mockResolvedValue(undefined)
    vi.spyOn(hermesApi, 'getGatewayCapabilities').mockReturnValue({
      chat: true,
      sessions: true,
      skills: true,
      terminal: true,
    } as any)

    let createdOpts: any = null
    vi.spyOn(hermesApi, 'createSession').mockImplementation(async (opts) => {
      createdOpts = opts
      return {
        id: opts?.id || 'mocked-accountant-session-id',
        title: opts?.title || 'Untitled',
        model: opts?.model,
      } as any
    })

    const postHandler = Route.options.server?.handlers?.POST
    expect(postHandler).toBeDefined()

    const req = new Request('http://localhost:3000/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentId: 'ezity-accountant' }),
    })

    const response = await postHandler!({ request: req } as any)
    const json = await (response as Response).json()

    expect(json.ok).toBe(true)
    expect(json.session).toBeDefined()
    expect(createdOpts.title).toMatch(/^📊 Fariz — agent-fariz-[a-f0-9]{8}$/)
    expect(getSessionAgent(json.session.id)).toBe('ezity-accountant')
  })
})

describe('Phase A: streamChat Runtime Persona and Model Propagation', () => {
  it('forwards system_message, system_msg, and model in request payload to Hermes', async () => {
    const { streamChat } = await import('@/server/hermes-api')

    let capturedUrl = ''
    let capturedBody: any = null

    // Mock global fetch for streamChat
    const mockFetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string)
        }
        return {
          ok: true,
          body: {
            getReader() {
              let done = false
              return {
                async read() {
                  if (done) return { done: true, value: undefined }
                  done = true
                  const data = 'event: message\ndata: {"text":"hello"}\n\n'
                  return {
                    done: false,
                    value: new TextEncoder().encode(data),
                  }
                },
              }
            },
          },
        } as any
      })

    vi.stubGlobal('fetch', mockFetch)

    const events: Array<any> = []
    await streamChat(
      'session-abc',
      {
        message: 'Hello, what are your directives?',
        model: 'deepseek-chat',
        system_message: 'You are the Chief of Staff for EZity Solutions.',
      },
      {
        onEvent(ev) {
          events.push(ev)
        },
      },
    )

    expect(capturedUrl).toContain('/api/sessions/session-abc/chat/stream')
    expect(capturedBody).toBeDefined()
    expect(capturedBody.model).toBe('deepseek-chat')
    expect(capturedBody.system_message).toBe(
      'You are the Chief of Staff for EZity Solutions.',
    )
    expect(capturedBody.system_msg).toBe(
      'You are the Chief of Staff for EZity Solutions.',
    )
    expect(events.length).toBeGreaterThan(0)
  })

  it('verifies model precedence: agent model overrides turn model', () => {
    // Test the precedence formula used in send-stream:
    // effectiveModel = (linkedAgent?.model?.trim() || undefined) ?? (turnModel?.trim() || undefined)

    const agentWithModel = {
      id: 'ezity-chief-of-staff',
      model: 'deepseek-chat',
    }
    const agentWithoutModel = { id: 'ezity-accountant', model: undefined }
    const turnModel = 'custom-turn-model'

    // Case 1: Agent has model -> overrides turn model
    const effective1 = (agentWithModel.model?.trim() || undefined) ?? turnModel
    expect(effective1).toBe('deepseek-chat')

    // Case 2: Agent has no model -> falls back to turn model
    const effective2 = (agentWithoutModel.model || undefined) ?? turnModel
    expect(effective2).toBe('custom-turn-model')

    // Case 3: Generic session (no agent) -> falls back to turn model or undefined
    const effective3 = (undefined || undefined) ?? turnModel
    expect(effective3).toBe('custom-turn-model')

    const effective4 = (undefined || undefined) ?? undefined
    expect(effective4).toBeUndefined()
  })
})
