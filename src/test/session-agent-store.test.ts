import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'session-agent-store-test-'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(tmpDir, { recursive: true, force: true })
})

async function getStore() {
  return import('@/server/session-agent-store')
}

describe('session-agent-store', () => {
  it('listSessionAgents() returns empty record initially', async () => {
    const { listSessionAgents } = await getStore()
    expect(listSessionAgents()).toEqual({})
  })

  it('setSessionAgent() stores mapping and getSessionAgent() retrieves it', async () => {
    const { setSessionAgent, getSessionAgent, listSessionAgents } =
      await getStore()
    setSessionAgent('session-123', 'ezity-chief-of-staff')

    expect(getSessionAgent('session-123')).toBe('ezity-chief-of-staff')
    expect(listSessionAgents()).toEqual({
      'session-123': 'ezity-chief-of-staff',
    })
  })

  it('deleteSessionAgent() removes mapping', async () => {
    const { setSessionAgent, deleteSessionAgent, getSessionAgent } =
      await getStore()
    setSessionAgent('session-456', 'ezity-accountant')
    expect(getSessionAgent('session-456')).toBe('ezity-accountant')

    deleteSessionAgent('session-456')
    expect(getSessionAgent('session-456')).toBeNull()
  })

  it('persists mappings to file and reloads across store imports', async () => {
    const store1 = await getStore()
    store1.setSessionAgent('s1', 'ezity-developer')
    expect(store1.getSessionAgent('s1')).toBe('ezity-developer')

    // Reset module cache and re-import
    vi.resetModules()
    const store2 = await getStore()
    expect(store2.getSessionAgent('s1')).toBe('ezity-developer')
  })

  it('trims whitespace and ignores empty keys or agent IDs', async () => {
    const { setSessionAgent, getSessionAgent } = await getStore()
    setSessionAgent('  spaced-key  ', '  ezity-developer  ')
    expect(getSessionAgent('spaced-key')).toBe('ezity-developer')

    setSessionAgent('', 'ezity-accountant')
    expect(getSessionAgent('')).toBeNull()

    setSessionAgent('valid-key', '')
    expect(getSessionAgent('valid-key')).toBeNull()
  })
})
