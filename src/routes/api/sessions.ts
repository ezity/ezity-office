import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { requireJsonContentType } from '../../server/rate-limit'
import {
  SESSIONS_API_UNAVAILABLE_MESSAGE,
  createSession,
  deleteSession,
  ensureGatewayProbed,
  getGatewayCapabilities,
  listSessions,
  toSessionSummary,
  updateSession,
} from '../../server/hermes-api'
import {
  deleteLocalSession,
  ensureLocalSession,
  listLocalSessions,
  toLocalSessionSummary,
  updateLocalSessionTitle,
} from '../../server/local-session-store'

import { getAgent } from '../../server/agent-definitions-store'
import {
  getSessionAgent,
  setSessionAgent,
} from '../../server/session-agent-store'
import { createCapabilityUnavailablePayload } from '@/lib/feature-gates'

export function decorateWithAgent(
  s: Record<string, unknown>,
): Record<string, unknown> {
  const key =
    (typeof s.key === 'string' && s.key) ||
    (typeof s.friendlyId === 'string' && s.friendlyId) ||
    (typeof s.id === 'string' && s.id) ||
    ''
  let agentId = key ? getSessionAgent(key) : null

  // If not explicitly mapped yet, inspect session metadata for EZity staff worker conventions
  if (!agentId && key) {
    const label = typeof s.label === 'string' ? s.label.toLowerCase() : ''
    const title = typeof s.title === 'string' ? s.title.toLowerCase() : ''
    const derived =
      typeof s.derivedTitle === 'string' ? s.derivedTitle.toLowerCase() : ''
    const searchTarget = `${label} ${title} ${derived}`

    if (
      label.startsWith('worker-accountant') ||
      searchTarget.includes('accountant')
    ) {
      agentId = 'ezity-accountant'
      setSessionAgent(key, 'ezity-accountant')
    } else if (
      label.startsWith('worker-developer') ||
      searchTarget.includes('developer')
    ) {
      agentId = 'ezity-developer'
      setSessionAgent(key, 'ezity-developer')
    }
  }

  const agent = agentId ? getAgent(agentId) : null
  if (!agent) return s
  return {
    ...s,
    agentId: agent.id,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    agentRole: agent.roleLabel,
    agentColor: agent.color,
  }
}

export const Route = createFileRoute('/api/sessions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Auth check
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        await ensureGatewayProbed()
        if (!getGatewayCapabilities().sessions) {
          const localSessions = listLocalSessions()
          return json({
            ok: true,
            sessions: localSessions
              .map(toLocalSessionSummary)
              .map(decorateWithAgent),
            source: 'local',
          })
        }

        try {
          const response = await listSessions(50, 0)
          const raw = response as any
          const sessionList: Array<any> = Array.isArray(raw)
            ? raw
            : (raw?.items ?? raw?.data ?? raw?.sessions ?? [])
          return json({
            ok: true,
            sessions: sessionList.map(toSessionSummary).map(decorateWithAgent),
            source: 'gateway',
          })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheckPost = requireJsonContentType(request)
        if (csrfCheckPost) return csrfCheckPost
        await ensureGatewayProbed()

        const body = (await request.json().catch(() => ({}))) as Record<
          string,
          unknown
        >

        const requestedAgentId =
          typeof body.agentId === 'string' ? body.agentId.trim() : ''
        const linkedAgent = requestedAgentId ? getAgent(requestedAgentId) : null

        const requestedLabel =
          typeof body.label === 'string' ? body.label.trim() : ''
        const label =
          requestedLabel ||
          (linkedAgent ? `${linkedAgent.emoji} ${linkedAgent.name}` : undefined)

        const requestedFriendlyId =
          typeof body.friendlyId === 'string' ? body.friendlyId.trim() : ''
        const friendlyId =
          requestedFriendlyId ||
          (linkedAgent
            ? `agent-${linkedAgent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}`
            : randomUUID())

        const requestedModel =
          typeof body.model === 'string' ? body.model.trim() : ''
        const model =
          (linkedAgent?.model?.trim() || undefined) ??
          (requestedModel || undefined)

        if (!getGatewayCapabilities().sessions) {
          const session = ensureLocalSession(friendlyId, model)
          if (linkedAgent) {
            setSessionAgent(session.id, linkedAgent.id)
            if (friendlyId !== session.id) {
              setSessionAgent(friendlyId, linkedAgent.id)
            }
          }
          const baseEntry = toLocalSessionSummary(session)
          const decorated = decorateWithAgent(baseEntry)
          return json({
            ok: true,
            sessionKey: session.id,
            friendlyId: session.id,
            entry: decorated,
            session: { id: session.id, key: session.id, ...decorated },
            persisted: true,
            source: 'local',
          })
        }
        try {
          const session = await createSession({
            id: friendlyId || randomUUID(),
            // Hermes requires globally unique titles. Keep the agent name visible
            // while binding each new agent chat to its unique friendly session ID.
            title: linkedAgent && label ? label + ' — ' + friendlyId : label,
            model,
          })

          if (linkedAgent) {
            setSessionAgent(session.id, linkedAgent.id)
            if (friendlyId !== session.id) {
              setSessionAgent(friendlyId, linkedAgent.id)
            }
          }

          const baseEntry = toSessionSummary(session)
          const decorated = decorateWithAgent(baseEntry)
          return json({
            ok: true,
            sessionKey: session.id,
            friendlyId: session.id,
            entry: decorated,
            session: { id: session.id, key: session.id, ...decorated },
            modelApplied: true,
          })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
      PATCH: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheckPatch = requireJsonContentType(request)
        if (csrfCheckPatch) return csrfCheckPatch
        await ensureGatewayProbed()
        if (!getGatewayCapabilities().sessions) {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >
          const rawSessionKey =
            typeof body.sessionKey === 'string' ? body.sessionKey.trim() : ''
          const rawFriendlyId =
            typeof body.friendlyId === 'string' ? body.friendlyId.trim() : ''
          const sessionKey = rawSessionKey || rawFriendlyId
          const label =
            typeof body.label === 'string' ? body.label.trim() : undefined
          if (sessionKey && label) {
            updateLocalSessionTitle(sessionKey, label)
          }
          return json({
            ok: true,
            sessionKey: sessionKey || rawFriendlyId,
            friendlyId: rawFriendlyId || sessionKey,
            updated: !!label,
            source: 'local',
          })
        }
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const rawSessionKey =
            typeof body.sessionKey === 'string' ? body.sessionKey.trim() : ''
          const rawFriendlyId =
            typeof body.friendlyId === 'string' ? body.friendlyId.trim() : ''
          const label =
            typeof body.label === 'string' ? body.label.trim() : undefined
          const sessionKey = rawSessionKey || rawFriendlyId

          if (!sessionKey) {
            return json(
              { ok: false, error: 'sessionKey required' },
              { status: 400 },
            )
          }

          const session = await updateSession(sessionKey, {
            title: label,
          })

          return json({
            ok: true,
            sessionKey,
            entry: toSessionSummary(session),
          })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
      DELETE: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        await ensureGatewayProbed()
        if (!getGatewayCapabilities().sessions) {
          const url = new URL(request.url)
          const rawSessionKey = url.searchParams.get('sessionKey') ?? ''
          const rawFriendlyId = url.searchParams.get('friendlyId') ?? ''
          const sessionKey = rawSessionKey.trim() || rawFriendlyId.trim()
          if (sessionKey) deleteLocalSession(sessionKey)
          return json({
            ok: true,
            sessionKey,
            deleted: !!sessionKey,
            source: 'local',
          })
        }
        try {
          const url = new URL(request.url)
          const rawSessionKey = url.searchParams.get('sessionKey') ?? ''
          const rawFriendlyId = url.searchParams.get('friendlyId') ?? ''
          const sessionKey = rawSessionKey.trim() || rawFriendlyId.trim()

          if (!sessionKey) {
            return json(
              { ok: false, error: 'sessionKey required' },
              { status: 400 },
            )
          }

          await deleteSession(sessionKey)

          return json({ ok: true, sessionKey })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
