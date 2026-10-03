/**
 * Session Agent Store — file-backed persistence for mapping chat sessions to AgentDefinitions.
 *
 * Persisted in .runtime/session-agents.json.
 * Follows the established synchronous in-memory cache + deferred disk write pattern
 * seen in crew-store.ts, task-store.ts, and agent-definitions-store.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), '.runtime')
const FILE_PATH = join(DATA_DIR, 'session-agents.json')

type StoreData = {
  sessionAgents: Record<string, string> // sessionKey/friendlyId -> agentId
}

let store: StoreData = { sessionAgents: {} }

function loadFromDisk(): void {
  try {
    if (existsSync(FILE_PATH)) {
      const raw = readFileSync(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as StoreData
      if (parsed?.sessionAgents && typeof parsed.sessionAgents === 'object') {
        store = parsed
      }
    }
  } catch {
    // start fresh if corrupt
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // non-fatal disk write error
  }
}

export function flushSessionAgentStore(): void {
  saveToDisk()
}

loadFromDisk()

export function setSessionAgent(
  sessionKey?: string | null,
  agentId?: string | null,
): void {
  if (typeof sessionKey !== 'string' || typeof agentId !== 'string') return
  const trimmedKey = sessionKey.trim()
  const trimmedAgentId = agentId.trim()
  if (!trimmedKey || !trimmedAgentId) return
  store.sessionAgents[trimmedKey] = trimmedAgentId
  saveToDisk()
}

export function getSessionAgent(sessionKey?: string | null): string | null {
  if (typeof sessionKey !== 'string') return null
  const trimmedKey = sessionKey.trim()
  if (!trimmedKey) return null
  if (store.sessionAgents[trimmedKey]) {
    return store.sessionAgents[trimmedKey]
  }

  // Prefix matching for session namespaces / job prefixes (e.g. `cron_<jobId>_`)
  for (const [key, agentId] of Object.entries(store.sessionAgents)) {
    if (key.endsWith('_') || key.endsWith(':')) {
      if (trimmedKey.startsWith(key)) {
        store.sessionAgents[trimmedKey] = agentId
        saveToDisk()
        return agentId
      }
    }
  }

  // Job matching: if key is `cron_<jobId>_<runId>`, check if `jobId` or `cron_<jobId>_` is registered
  if (trimmedKey.startsWith('cron_')) {
    for (const [key, agentId] of Object.entries(store.sessionAgents)) {
      if (key && trimmedKey.includes(key)) {
        store.sessionAgents[trimmedKey] = agentId
        saveToDisk()
        return agentId
      }
    }
  }

  return null
}

export function deleteSessionAgent(sessionKey?: string | null): boolean {
  if (typeof sessionKey !== 'string') return false
  const trimmedKey = sessionKey.trim()
  if (!store.sessionAgents[trimmedKey]) return false
  delete store.sessionAgents[trimmedKey]
  saveToDisk()
  return true
}

export function listSessionAgents(): Record<string, string> {
  return { ...store.sessionAgents }
}

/** For testing purposes only */
export function _resetSessionAgentStoreForTesting(
  initial?: Record<string, string>,
): void {
  store = { sessionAgents: initial ? { ...initial } : {} }
}
