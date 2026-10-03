/**
 * Daily Brief Store — File-backed persistence for Chief of Staff executive briefings.
 *
 * Persisted in .runtime/daily-briefings.json.
 * Survives Studio restart, provides deduplication per daily period,
 * and maintains audit trail of data sources queried.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { publishChatEvent } from './chat-event-bus'
import type { DailyBriefing, DailyBriefSettings } from '../types/daily-brief'

const DATA_DIR = join(process.cwd(), '.runtime')
const FILE_PATH = join(DATA_DIR, 'daily-briefings.json')

const MAX_STORED_BRIEFINGS = 100

interface StoreData {
  settings: DailyBriefSettings
  briefings: Record<string, DailyBriefing>
}

const DEFAULT_SETTINGS: DailyBriefSettings = {
  enabled: true,
  hour: 8,
  minute: 0,
  timezone: 'Asia/Kuala_Lumpur',
  hermesJobId: null,
}

let store: StoreData = {
  settings: { ...DEFAULT_SETTINGS },
  briefings: {},
}

function loadFromDisk(): void {
  try {
    if (existsSync(FILE_PATH)) {
      const raw = readFileSync(FILE_PATH, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<StoreData>
      store = {
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
        },
        briefings: parsed.briefings && typeof parsed.briefings === 'object' ? parsed.briefings : {},
      }
    }
  } catch {
    // Start clean if file corrupt
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(FILE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // Non-fatal disk write error
  }
}

// Initial load
loadFromDisk()

export function getDailyBriefSettings(): DailyBriefSettings {
  return { ...store.settings }
}

export function updateDailyBriefSettings(updates: Partial<DailyBriefSettings>): DailyBriefSettings {
  store.settings = { ...store.settings, ...updates }
  saveToDisk()
  return { ...store.settings }
}

export function saveDailyBriefing(briefing: DailyBriefing): DailyBriefing {
  store.briefings[briefing.id] = briefing

  // Enforce max bounds
  const keys = Object.keys(store.briefings)
  if (keys.length > MAX_STORED_BRIEFINGS) {
    const sorted = Object.values(store.briefings).sort(
      (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    )
    const excess = sorted.slice(0, keys.length - MAX_STORED_BRIEFINGS)
    for (const item of excess) {
      delete store.briefings[item.id]
    }
  }

  saveToDisk()
  publishChatEvent('daily_brief.created', { sessionKey: 'all', briefing })
  return briefing
}

export function getDailyBriefing(id: string): DailyBriefing | null {
  return store.briefings[id] || null
}

export function getLatestDailyBriefing(): DailyBriefing | null {
  const list = Object.values(store.briefings)
  if (list.length === 0) return null
  return list.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  )[0]
}

export function listDailyBriefings(limit = 20): DailyBriefing[] {
  return Object.values(store.briefings)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, limit)
}

export function getDailyBriefingByDate(dateKey: string, isManual = false): DailyBriefing | null {
  const list = Object.values(store.briefings).filter(
    (b) => b.periodCovered === dateKey && b.isManual === isManual,
  )
  if (list.length === 0) return null
  return list.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  )[0]
}

export function clearDailyBriefingsForTest(): void {
  store = {
    settings: { ...DEFAULT_SETTINGS },
    briefings: {},
  }
  saveToDisk()
}
