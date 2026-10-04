/**
 * Agent Activity Store
 *
 * Real-time client store tracking live agent chat streaming activity
 * (thinking, typing/answering, idle).
 *
 * Connects directly to server-sent events (/api/events) and supports
 * local synchronous triggers for sub-millisecond reaction.
 */

import { create } from 'zustand'

export type AgentLiveActivity =
  | 'listening'
  | 'thinking'
  | 'tool_calling'
  | 'typing'
  | 'waiting_approval'
  | 'error'
  | null

export interface AgentActivityInfo {
  activity: AgentLiveActivity
  text: string
  toolName?: string
  sessionKey: string
  updatedAt: number
}

interface AgentActivityStore {
  activities: Record<string, AgentActivityInfo>
  setActivity: (
    agentId: string,
    activity: AgentLiveActivity,
    text?: string,
    sessionKey?: string,
    toolName?: string,
  ) => void
  clearActivity: (agentId: string) => void
  getActivity: (agentId: string) => AgentActivityInfo | undefined
}

// Map alias names to canonical agent definition IDs
function normalizeAgentId(rawId: string): string {
  const id = rawId.toLowerCase()
  if (id.includes('accountant') || id.includes('fariz')) return 'ezity-accountant'
  if (id.includes('developer') || id.includes('salmanz')) return 'ezity-developer'
  if (
    id.includes('chief-of-staff') ||
    id.includes('hafiz') ||
    id.includes('cos') ||
    id.includes('orchestrator')
  ) {
    return 'ezity-chief-of-staff'
  }
  return rawId
}

export const useAgentActivityStore = create<AgentActivityStore>((set, get) => ({
  activities: {},

  setActivity: (agentId, activity, text = '', sessionKey = '', toolName = '') => {
    const canonicalId = normalizeAgentId(agentId)
    if (!activity) {
      get().clearActivity(canonicalId)
      return
    }

    set((state) => ({
      activities: {
        ...state.activities,
        [canonicalId]: {
          activity,
          text:
            text ||
            (activity === 'thinking'
              ? 'Thinking...'
              : activity === 'typing'
                ? 'Answering in chat...'
                : activity === 'tool_calling'
                  ? `Running ${toolName || 'tool'}...`
                  : activity === 'waiting_approval'
                    ? 'Needs your approval'
                    : activity === 'listening'
                      ? 'Listening...'
                      : activity === 'error'
                        ? 'Error occurred'
                        : ''),
          toolName: toolName || undefined,
          sessionKey,
          updatedAt: Date.now(),
        },
      },
    }))
  },

  clearActivity: (agentId) => {
    const canonicalId = normalizeAgentId(agentId)
    set((state) => {
      if (!state.activities[canonicalId]) return state
      const next = { ...state.activities }
      delete next[canonicalId]
      return { activities: next }
    })
  },

  getActivity: (agentId) => {
    const canonicalId = normalizeAgentId(agentId)
    return get().activities[canonicalId]
  },
}))

// Auto-cleanup stale activities (timeout safety after 45s)
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const state = useAgentActivityStore.getState()
    const now = Date.now()
    let hasStale = false
    const next = { ...state.activities }

    for (const [id, info] of Object.entries(next)) {
      if (now - info.updatedAt > 45_000) {
        delete next[id]
        hasStale = true
      }
    }

    if (hasStale) {
      useAgentActivityStore.setState({ activities: next })
    }
  }, 5_000)

  // Listen to SSE /api/events for agent.activity broadcasts
  let eventSource: EventSource | null = null

  function connectAgentEventSource() {
    try {
      if (eventSource) {
        eventSource.close()
      }

      eventSource = new EventSource('/api/events')

      eventSource.addEventListener('agent.activity', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as {
            agentId?: string
            sessionKey?: string
            activityState?:
              | 'listening'
              | 'thinking'
              | 'tool_calling'
              | 'typing'
              | 'waiting_approval'
              | 'error'
              | 'idle'
            text?: string
            toolName?: string
          }

          if (!data.agentId || !data.activityState) return

          if (data.activityState === 'idle') {
            useAgentActivityStore.getState().clearActivity(data.agentId)
          } else {
            useAgentActivityStore.getState().setActivity(
              data.agentId,
              data.activityState,
              data.text,
              data.sessionKey,
              data.toolName,
            )
          }
        } catch {
          // ignore parse errors
        }
      })

      eventSource.onerror = () => {
        // Will auto-reconnect via EventSource
      }
    } catch {
      // Non-fatal if browser blocks or during SSR
    }
  }

  // Connect on client load
  connectAgentEventSource()
}
