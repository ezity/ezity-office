import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tmpDir: string

async function makeRequest(
  body: unknown,
  options?: {
    auth?: boolean
    contentType?: string
    token?: string
  },
): Promise<Request> {
  const { storeSessionToken } = await import('@/server/auth-middleware')
  const headers: Record<string, string> = {}
  if (options?.contentType !== undefined) {
    if (options.contentType) headers['Content-Type'] = options.contentType
  } else {
    headers['Content-Type'] = 'application/json'
  }
  if (options?.auth !== false) {
    const token = options?.token || 'test-session-delegate'
    storeSessionToken(token)
    headers.cookie = `hermes-auth=${token}`
  }
  return new Request('http://localhost/api/agent-delegate', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'agent-delegate-test-'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('POST /api/agent-delegate', () => {
  it('fails closed when password protection is not configured', async () => {
    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-fariz-1',
      title: 'Ledger Audit',
      description: 'Check discrepancies',
    })
    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(503)
  })

  it('rejects unauthenticated requests with 401', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest(
      {
        sourceSessionKey: 'session-fariz-1',
        title: 'Ledger Audit',
        description: 'Check discrepancies',
      },
      { auth: false },
    )
    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(401)
  })

  it('rejects non-JSON requests with 415', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest('plain text', { contentType: 'text/plain' })
    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(415)
  })

  it('rejects invalid payload with 400', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-fariz-1',
      title: 'ab', // too short (< 3)
      description: 'desc',
    })
    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(400)
  })

  it('rejects source session when not Fariz with 403', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { setSessionAgent } = await import('@/server/session-agent-store')
    setSessionAgent('session-cos-1', 'ezity-chief-of-staff')

    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-cos-1',
      title: 'Valid task title',
      description: 'Valid task description with enough characters',
    })
    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(403)
  })

  it('creates a new Salmanz session and maps it when none exists', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { setSessionAgent, getSessionAgent } = await import(
      '@/server/session-agent-store'
    )
    const { getTask } = await import('@/server/task-store')
    const { getLocalMessages } = await import('@/server/local-session-store')

    setSessionAgent('session-fariz-1', 'ezity-accountant')

    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-fariz-1',
      title: 'Automate Reconciliation Script',
      description: 'Please build a python script for reconciliation.',
      repo: 'ezity-office',
      reuseSession: false,
    })

    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(200)

    const data = (await response.json()) as any
    expect(data.ok).toBe(true)
    expect(data.isNewSession).toBe(true)
    expect(data.sessionKey).toContain('worker-salmanz-')
    expect(data.navigationUrl).toBe(`/chat/${data.sessionKey}`)

    // Check session agent binding
    expect(getSessionAgent(data.sessionKey)).toBe('ezity-developer')

    // Check task record in task-store
    const task = getTask(data.taskId)
    expect(task).toBeDefined()
    expect(task?.title).toBe('[From Fariz] Automate Reconciliation Script')
    expect(task?.assignee).toBe('ezity-developer')
    expect(task?.sourceType).toBe('delegation')
    expect(task?.sourceSessionKey).toBe('session-fariz-1')

    // Check message in Salmanz session
    const messages = getLocalMessages(data.sessionKey)
    expect(messages.length).toBeGreaterThan(0)
    expect(messages[0].content).toContain(
      'CRITICAL DIRECTIVE - ANTIGRAVITY AGY DELEGATION',
    )
    expect(messages[0].content).toContain(
      'You are Salmanz, the Lead Developer',
    )
    expect(messages[0].content).toContain('/api/antigravity-dispatch')
  })

  it('reuses existing active Salmanz session when available', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { setSessionAgent } = await import('@/server/session-agent-store')
    const { ensureLocalSession } = await import('@/server/local-session-store')

    // Setup Fariz session and existing Salmanz session
    setSessionAgent('session-fariz-1', 'ezity-accountant')
    const existingSalmanz = ensureLocalSession('session-salmanz-existing')
    setSessionAgent(existingSalmanz.id, 'ezity-developer')

    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-fariz-1',
      title: 'Fix Payroll rounding error',
      description: 'Round to 2 decimal places in calculations.',
      reuseSession: true,
    })

    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(200)

    const data = (await response.json()) as any
    expect(data.ok).toBe(true)
    expect(data.isNewSession).toBe(false)
    expect(data.sessionKey).toBe('session-salmanz-existing')
  })

  it('invokes Antigravity bridge pre-planning when requested', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'test-password')
    const { setSessionAgent } = await import('@/server/session-agent-store')
    setSessionAgent('session-fariz-1', 'ezity-accountant')

    const bridge = await import('@/server/antigravity-bridge')
    const dispatchSpy = vi
      .spyOn(bridge, 'dispatchAntigravity')
      .mockResolvedValue({
        ok: true,
        mode: 'plan',
        output: 'Step 1: Inspect payroll model\nStep 2: Add decimal precision',
        exitCode: 0,
      })

    const { Route } = await import('@/routes/api/agent-delegate')
    const handler = (Route.options.server?.handlers as any)?.POST
    const req = await makeRequest({
      sourceSessionKey: 'session-fariz-1',
      title: 'Fix Payroll rounding error',
      description: 'Round to 2 decimal places in calculations.',
      prePlanWithBridge: true,
    })

    const response = (await handler({ request: req } as any)) as Response
    expect(response.status).toBe(200)

    const data = (await response.json()) as any
    expect(data.ok).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith('plan', expect.stringContaining('Fix Payroll rounding error'))
    expect(data.prePlanResult?.ok).toBe(true)
    expect(data.prePlanResult?.output).toContain('Step 1: Inspect payroll model')
    expect(data.initialPrompt).toContain('Architectural Plan (Generated via Antigravity Bridge)')
  })
})
