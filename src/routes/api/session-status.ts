import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  ensureGatewayProbed,
  getConfig,
  getGatewayCapabilities,
  getSession,
  listSessions,
} from '../../server/hermes-api'
import { isSyntheticSessionKey } from '../../server/session-utils'
import { isAuthenticated } from '@/server/auth-middleware'

export const Route = createFileRoute('/api/session-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        await ensureGatewayProbed()
        try {
          const capabilities = getGatewayCapabilities()
          if (!capabilities.sessions) {
            return json({
              ok: true,
              payload: {
                status: 'idle',
                sessionKey: 'new',
                sessionLabel: '',
                model: '',
                modelProvider: '',
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                sessions: [],
              },
            })
          }
          const url = new URL(request.url)
          const requestedKey = url.searchParams.get('sessionKey')?.trim() || ''
          let sessionKey = requestedKey || 'new'

          if (isSyntheticSessionKey(sessionKey)) {
            const rawSessions = await listSessions(1, 0)
            const sessions = Array.isArray(rawSessions) ? rawSessions : []
            if (sessions.length === 0) {
              return json({
                ok: true,
                payload: {
                  status: 'idle',
                  sessionKey: 'new',
                  sessionLabel: '',
                  model: '',
                  modelProvider: '',
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  sessions: [],
                },
              })
            }
            sessionKey = sessions[0].id
          }

          let session: HermesSession | null = null
          try {
            session = await getSession(sessionKey)
          } catch {
            session = null
          }

          if (!session) {
            return json({
              ok: true,
              payload: {
                status: 'idle',
                sessionKey,
                sessionLabel: '',
                model: '',
                modelProvider: '',
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                sessions: [],
              },
            })
          }

          const config = capabilities.config
            ? await getConfig().catch(() => ({ model: '', provider: '' }))
            : ({ model: '', provider: '' } as const)

          const inputTokens = session.input_tokens ?? 0
          const outputTokens = session.output_tokens ?? 0

          return json({
            ok: true,
            payload: {
              status: session.ended_at ? 'ended' : 'idle',
              sessionKey: session.id,
              sessionLabel: session.title ?? '',
              model: session.model ?? config.model ?? '',
              modelProvider: config.provider ?? '',
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              sessions: [
                {
                  key: session.id,
                  agentId: session.id,
                  label: session.title ?? session.id,
                  model: session.model ?? config.model ?? '',
                  modelProvider: config.provider ?? '',
                  updatedAt: session.last_active ?? session.started_at ?? 0,
                  usage: {
                    input: inputTokens,
                    output: outputTokens,
                  },
                },
              ],
            },
          })
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
