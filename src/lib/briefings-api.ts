/**
 * Client API for Chief of Staff Daily Briefings.
 */

import type { DailyBriefing, DailyBriefSettings } from '../types/daily-brief'

export async function fetchLatestBriefing(
  autoGenerate = true,
): Promise<DailyBriefing | null> {
  const res = await fetch(`/api/briefings/latest?autoGenerate=${autoGenerate}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch latest briefing: ${res.status}`)
  }
  const data = await res.json()
  return data.briefing || null
}

export async function fetchBriefings(
  limit = 10,
): Promise<{ briefings: DailyBriefing[]; settings: DailyBriefSettings }> {
  const res = await fetch(`/api/briefings?limit=${limit}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch briefings: ${res.status}`)
  }
  const data = await res.json()
  return {
    briefings: data.briefings || [],
    settings: data.settings || {
      enabled: true,
      hour: 8,
      minute: 0,
      timezone: 'Asia/Kuala_Lumpur',
    },
  }
}

export async function generateBriefingNow(options?: {
  isManual?: boolean
  force?: boolean
  timezone?: string
}): Promise<DailyBriefing> {
  const res = await fetch('/api/briefings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isManual: options?.isManual ?? true,
      force: options?.force ?? true,
      timezone: options?.timezone,
    }),
  })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.error || `Failed to generate briefing: ${res.status}`)
  }
  const data = await res.json()
  return data.briefing
}
