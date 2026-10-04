import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import {
  isAuthenticated,
  isPasswordProtectionEnabled,
} from '../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '../../server/rate-limit'
import { getAgent } from '../../server/agent-definitions-store'
import {
  getSessionAgent,
  setSessionAgent,
} from '../../server/session-agent-store'
import {
  createSession,
  ensureGatewayProbed,
  getGatewayCapabilities,
  listSessions,
} from '../../server/hermes-api'
import {
  appendLocalMessage,
  ensureLocalSession,
  listLocalSessions,
} from '../../server/local-session-store'
import { upsertWorkItem } from '../../server/task-store'
import { dispatchAntigravity } from '../../server/antigravity-bridge'
import { publishChatEvent } from '../../server/chat-event-bus'

export const DelegateSchema = z.object({
  sourceSessionKey: z.string().trim().min(1),
  fromAgentId: z.literal('ezity-accountant').default('ezity-accountant'),
  toAgentId: z.literal('ezity-developer').default('ezity-developer'),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(10_000),
  repo: z
    .enum(['ezity-office', 'PharmaHadir', 'EZBip', 'workspace'])
    .default('ezity-office'),
  reuseSession: z.boolean().default(true),
  prePlanWithBridge: z.boolean().default(false),
})

export type DelegateRequest = z.infer<typeof DelegateSchema>

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'task'
  )
}

export const Route = createFileRoute('/api/agent-delegate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Controlled delegation modifies repo-linked developer work, so fail closed on unconfigured password protection
        if (!isPasswordProtectionEnabled()) {
          return json(
            { ok: false, error: 'Password authentication must be configured' },
            { status: 503 },
          )
        }
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        if (!rateLimit(`agent-delegate:${getClientIp(request)}`, 10, 60_000)) {
          return rateLimitResponse()
        }

        const rawBody = (await request.json().catch(() => null)) as unknown
        const parsed = DelegateSchema.safeParse(rawBody)
        if (!parsed.success) {
          return json(
            {
              ok: false,
              error: 'Invalid delegation payload',
              details: parsed.error.format(),
            },
            { status: 400 },
          )
        }

        const {
          sourceSessionKey,
          title,
          description,
          repo,
          reuseSession,
          prePlanWithBridge,
        } = parsed.data

        // Role authorization: Ensure source session belongs to Fariz (ezity-accountant)
        const sourceAgentId = getSessionAgent(sourceSessionKey)
        const normalizedSourceKey = sourceSessionKey.toLowerCase()
        const isFarizConvention =
          normalizedSourceKey.includes('accountant') ||
          normalizedSourceKey.includes('fariz')

        if (sourceAgentId) {
          if (sourceAgentId !== 'ezity-accountant') {
            return json(
              {
                ok: false,
                error:
                  'Forbidden: Source session is not bound to Fariz (ezity-accountant)',
              },
              { status: 403 },
            )
          }
        } else if (!isFarizConvention) {
          return json(
            {
              ok: false,
              error:
                'Forbidden: Source session is not recognized as Fariz (ezity-accountant)',
            },
            { status: 403 },
          )
        }

        await ensureGatewayProbed()
        const hasGatewaySessions = Boolean(getGatewayCapabilities().sessions)

        // Session resolution for Salmanz (ezity-developer)
        let salmanzSessionKey: string | null = null
        let isNewSession = false

        if (reuseSession) {
          if (hasGatewaySessions) {
            try {
              const res = await listSessions(50, 0)
              const raw = res as any
              const sessionList: Array<any> = Array.isArray(raw)
                ? raw
                : (raw?.items ?? raw?.data ?? raw?.sessions ?? [])

              const match = sessionList.find((s) => {
                const key = s.id || s.key || s.friendlyId
                const agent = getSessionAgent(key)
                if (agent === 'ezity-developer') return true
                const titleStr = `${s.title ?? ''} ${s.label ?? ''}`.toLowerCase()
                return (
                  titleStr.includes('salmanz') || titleStr.includes('developer')
                )
              })
              if (match) {
                salmanzSessionKey = match.id || match.key || match.friendlyId
              }
            } catch {
              // fallback to local sessions or create
            }
          }

          if (!salmanzSessionKey) {
            const localSessions = listLocalSessions()
            const match = localSessions.find((s) => {
              const agent = getSessionAgent(s.id)
              if (agent === 'ezity-developer') return true
              const titleStr = `${s.title ?? ''} ${s.id}`.toLowerCase()
              return (
                titleStr.includes('salmanz') || titleStr.includes('developer')
              )
            })
            if (match) {
              salmanzSessionKey = match.id
            }
          }
        }

        // If no existing session found or reuseSession is false, create a fresh Salmanz session
        if (!salmanzSessionKey) {
          isNewSession = true
          const friendlyId = `worker-salmanz-${slugify(title)}-${randomUUID().slice(0, 6)}`
          const sessionTitle = `💻 Salmanz — [Fariz Task] ${title}`
          const devAgent = getAgent('ezity-developer')
          const devModel = devAgent?.model?.trim() || undefined

          if (hasGatewaySessions) {
            try {
              const created = await createSession({
                id: friendlyId,
                title: sessionTitle,
                model: devModel,
              })
              salmanzSessionKey = created.id
            } catch {
              // Gateway session creation fallback to local session
              const createdLocal = ensureLocalSession(friendlyId, devModel)
              salmanzSessionKey = createdLocal.id
            }
          } else {
            const created = ensureLocalSession(friendlyId, devModel)
            salmanzSessionKey = created.id
          }

          // Register in session agent store
          setSessionAgent(salmanzSessionKey, 'ezity-developer')
          if (friendlyId !== salmanzSessionKey) {
            setSessionAgent(friendlyId, 'ezity-developer')
          }
        }

        // Optional pre-planning through Antigravity Bridge
        let prePlanResult: {
          ok: boolean
          output?: string
          error?: string
        } | null = null

        if (prePlanWithBridge) {
          try {
            const planPrompt = `Target Repository: /projects/${repo}\nTask Goal: ${title}\nAccounting & Technical Context:\n${description}\n\nProduce a precise, robust implementation plan adhering strictly to repository architecture.`
            prePlanResult = await dispatchAntigravity('plan', planPrompt)
          } catch (err) {
            prePlanResult = {
              ok: false,
              error:
                err instanceof Error ? err.message : 'Bridge call failed',
            }
          }
        }

        // Persist delegation record in task-store
        const taskId = `task-del-${randomUUID().slice(0, 8)}`
        const workItem = upsertWorkItem({
          id: taskId,
          title: `[From Fariz] ${title}`,
          description: `${description}\n\nTarget Repo: ${repo}\nSource: Fariz Accountant (Session ${sourceSessionKey})`,
          status: 'needs_attention',
          priority: 'high',
          assignee: 'ezity-developer',
          sourceType: 'delegation',
          sourceId: sourceSessionKey,
          sourceSessionKey,
          workItemType: 'task',
          metadata: {
            sourceAgentId: 'ezity-accountant',
            targetAgentId: 'ezity-developer',
            sourceSessionKey,
            targetSessionKey: salmanzSessionKey,
            repo,
            prePlanOk: prePlanResult?.ok ?? null,
            delegatedAt: Date.now(),
          },
        })

        // Compose initial context message for Salmanz reinforcing the mandatory Antigravity bridge directive
        const initialPrompt = [
          `[TASK DELEGATION FROM FARIZ (ACCOUNTANT)]`,
          `Task ID: ${taskId}`,
          `Target Repo: /projects/${repo}`,
          `Title: ${title}`,
          '',
          `Requirements & Accounting Context:`,
          description,
          ...(prePlanResult?.ok && prePlanResult.output
            ? [
                '',
                `Architectural Plan (Generated via Antigravity Bridge):`,
                prePlanResult.output,
              ]
            : []),
          '',
          `CRITICAL DIRECTIVE - ANTIGRAVITY AGY DELEGATION:`,
          `You are Salmanz, the Lead Developer for EZity Solutions.`,
          `You must NEVER read or edit repository files directly using standard filesystem tools or raw bash edits.`,
          `All planning and code modifications must be delegated to the Antigravity engine via the Antigravity bridge (/api/antigravity-dispatch).`,
        ].join('\n')

        // Append initial handoff message into Salmanz's local session history so it is immediately visible
        appendLocalMessage(salmanzSessionKey, {
          id: `msg-del-${randomUUID().slice(0, 8)}`,
          role: 'user',
          content: initialPrompt,
          timestamp: Date.now(),
        })

        // Notify office chat event bus
        publishChatEvent('task.created', {
          sessionKey: salmanzSessionKey,
          taskId,
          title: workItem.title,
          sourceType: 'delegation',
        })

        return json({
          ok: true,
          taskId,
          sessionKey: salmanzSessionKey,
          friendlyId: salmanzSessionKey,
          isNewSession,
          navigationUrl: `/chat/${salmanzSessionKey}`,
          initialPrompt,
          prePlanResult,
        })
      },
    },
  },
})
