import { afterEach, describe, expect, it, vi } from 'vitest'

async function authenticatedRequest(body: unknown): Promise<Request> {
  const { storeSessionToken } = await import('@/server/auth-middleware')
  storeSessionToken('test-session')
  return new Request('http://localhost/api/antigravity-dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: 'hermes-auth=test-session' },
    body: JSON.stringify(body),
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('Antigravity bridge dispatch route', () => {
  it('fails closed when password authentication is not configured', async () => {
    const { Route } = await import('@/routes/api/antigravity-dispatch')
    const handler = Route.options.server?.handlers?.POST!
    const response = await handler({ request: new Request('http://localhost/api/antigravity-dispatch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'plan', prompt: 'test' }),
    }) } as any) as Response
    expect(response.status).toBe(503)
  })

  it('forwards only authenticated, validated plan/code requests to the internal bridge', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'protected')
    vi.stubEnv('ANTIGRAVITY_BRIDGE_TOKEN', 'bridge-secret')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, mode: 'plan', output: 'plan output', exitCode: 0 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { Route } = await import('@/routes/api/antigravity-dispatch')
    const handler = Route.options.server?.handlers?.POST!
    const response = await handler({ request: await authenticatedRequest({ mode: 'plan', prompt: 'inspect the app' }) } as any) as Response
    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith('http://antigravity-bridge:8787/v1/dispatch', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'X-Bridge-Token': 'bridge-secret' }),
      body: JSON.stringify({ mode: 'plan', prompt: 'inspect the app' }),
    }))
  })

  it('rejects unsupported modes before contacting the bridge', async () => {
    vi.stubEnv('HERMES_PASSWORD', 'protected')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { Route } = await import('@/routes/api/antigravity-dispatch')
    const handler = Route.options.server?.handlers?.POST!
    const response = await handler({ request: await authenticatedRequest({ mode: 'shell', prompt: 'id' }) } as any) as Response
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
