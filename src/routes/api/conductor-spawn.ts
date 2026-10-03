/**
 * Conductor mission spawn — creates a one-shot Hermes job for orchestration.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { isAuthenticated } from '../../server/auth-middleware'
import { requireJsonContentType } from '../../server/rate-limit'
import {
  BEARER_TOKEN,
  HERMES_API,
  ensureGatewayProbed,
} from '../../server/gateway-capabilities'
import { getAgent } from '../../server/agent-definitions-store'
import { setSessionAgent } from '../../server/session-agent-store'
import { getWorkItemSummary, listWorkItems } from '../../server/task-store'
import type { AgentDefinition } from '../../types/agent'

let cachedSkill: string | null = null

type ConductorSpawnBody = {
  goal?: unknown
  orchestratorModel?: unknown
  workerModel?: unknown
  projectsDir?: unknown
  maxParallel?: unknown
  supervised?: unknown
  ezity?: unknown
  staffOrchestrated?: unknown
  orchestratorAgentId?: unknown
}

function repoRoot(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    return resolve(here, '..', '..', '..')
  } catch {
    return process.cwd()
  }
}

function loadDispatchSkill(): string {
  if (cachedSkill !== null) return cachedSkill
  const candidates = [
    resolve(repoRoot(), 'skills/workspace-dispatch/SKILL.md'),
    resolve(process.cwd(), 'skills/workspace-dispatch/SKILL.md'),
    resolve(
      process.env.HOME ?? '~',
      '.hermes/skills/workspace-dispatch/SKILL.md',
    ),
    resolve(
      process.env.HOME ?? '~',
      '.ocplatform/workspace/skills/workspace-dispatch/SKILL.md',
    ),
  ]
  for (const p of candidates) {
    try {
      cachedSkill = readFileSync(p, 'utf-8')
      return cachedSkill
    } catch {
      continue
    }
  }
  cachedSkill = ''
  return cachedSkill
}

function readOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readMaxParallel(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  return Math.min(5, Math.max(1, Math.round(value)))
}

export function buildOrchestratorPrompt(
  goal: string,
  skill: string,
  options: {
    orchestratorModel: string
    workerModel: string
    projectsDir: string
    maxParallel: number
    supervised: boolean
  },
): string {
  const outputBase = options.projectsDir || '/tmp'
  const outputPrefix =
    outputBase === '/tmp'
      ? '/tmp/dispatch-<slug>'
      : `${outputBase}/dispatch-<slug>`

  return [
    'You are a mission orchestrator. Execute this mission autonomously.',
    '',
    '## Dispatch Skill Instructions',
    '',
    skill ||
      '(workspace-dispatch skill not found locally; proceed using create_task to spawn workers)',
    '',
    '## Mission',
    '',
    `Goal: ${goal}`,
    ...(options.orchestratorModel
      ? ['', `Use model: ${options.orchestratorModel} for the orchestrator`]
      : []),
    ...(options.workerModel
      ? ['', `Use model: ${options.workerModel} for all workers`]
      : []),
    ...(options.maxParallel > 1
      ? [
          '',
          `Run up to ${options.maxParallel} workers in parallel when tasks are independent`,
        ]
      : [
          '',
          'Spawn workers one at a time. Do NOT wait for workers to finish — the UI handles tracking.',
        ]),
    ...(options.supervised
      ? ['', 'Supervised mode is enabled. Require approval before each task.']
      : []),
    '',
    '## Critical Rules',
    '- Use create_task / delegate_task to create worker agents for each task',
    '- Do NOT do the work yourself — spawn workers',
    '- For simple tasks (single file, quick mockup), use ONLY 1 task with 1 worker — do not over-decompose',
    '- Do NOT ask for confirmation — start immediately',
    '- Label workers as "worker-<task-slug>" so the UI can track them',
    '- Each worker gets a self-contained prompt with the task + exit criteria',
    `- Workers should write output to ${outputPrefix} directories`,
    '- After spawning all workers, report your plan summary and finish. The UI tracks worker completion automatically.',
    '- Report a summary when all tasks are done',
  ].join('\n')
}

export function buildEZityOrchestratorPrompt(
  goal: string,
  skill: string,
  chiefOfStaff: AgentDefinition,
  staffRoster: Array<AgentDefinition>,
  options: {
    orchestratorModel: string
    workerModel: string
    projectsDir: string
    maxParallel: number
    supervised: boolean
  },
): string {
  const outputBase = options.projectsDir || '/tmp'
  const outputPrefix =
    outputBase === '/tmp'
      ? '/tmp/dispatch-<slug>'
      : `${outputBase}/dispatch-<slug>`

  const rosterLines =
    staffRoster.length > 0
      ? staffRoster
          .map((member) => {
            const modelNote = member.model ? ` (Model: ${member.model})` : ''
            return [
              `- **${member.name}** (\`${member.id}\`)${modelNote} — ${member.roleLabel}`,
              `  Focus: ${member.tags.join(', ')}`,
              `  Directives: ${member.systemPrompt.slice(0, 160).trim()}...`,
            ].join('\n')
          })
          .join('\n\n')
      : '(No specialized staff defined; spawn general workers as needed)'

  return [
    `# Orchestrator Persona: ${chiefOfStaff.name}`,
    `You are ${chiefOfStaff.name}.`,
    chiefOfStaff.systemPrompt.trim(),
    '',
    '## Dispatch Skill Instructions',
    '',
    skill ||
      '(workspace-dispatch skill not found locally; proceed using create_task to spawn workers)',
    '',
    '## Available Staff Roster',
    'You lead and coordinate the following specialized EZity staff members:',
    '',
    rosterLines,
    '',
    '## Staff Delegation Directives',
    '- **Finance, Accounting, Budget, or Ledger tasks**: Delegate explicitly to **Accountant** (`ezity-accountant`).',
    '  Use worker label: `worker-accountant-<task-slug>`.',
    '  Include in the task description: `[Assigned Staff: Accountant (ezity-accountant)]` with clear bookkeeping/accounting expectations.',
    '- **Engineering, Code, Architecture, Technical, or Systems tasks**: Delegate explicitly to **Developer** (`ezity-developer`).',
    '  Use worker label: `worker-developer-<task-slug>`.',
    '  Include in the task description: `[Assigned Staff: Developer (ezity-developer)]` with clean architecture and implementation expectations.',
    '- **Authoritative Financial State Rule (Phase G)**: When missions involve financial drafts or accounting operations, Chief of Staff must never mark financial workflows as complete or posted based on assumptions. Only recognize a journal or invoice as posted when confirmed by EzityHub events or verified API status.',
    "- **Persona & Model Propagation**: Embed the staff member's role and core responsibilities directly into each worker prompt, along with any designated model requirements.",
    '- **General or Uncategorized tasks**: If a task does not fit Accountant or Developer, delegate to a general worker labeled `worker-<task-slug>`.',
    '- **Multi-domain missions**: Decompose the goal across your staff (e.g. Accountant handles financial/budget analysis while Developer handles technical implementation), collect all worker outputs, and synthesize a cohesive executive briefing.',
    '- **Final Synthesis**: As Chief of Staff, synthesize all worker findings into an executive briefing for leadership.',
    '',
    '## Mission',
    '',
    `Goal: ${goal}`,
    ...(options.orchestratorModel
      ? [
          '',
          `Use model: ${options.orchestratorModel} for the Chief of Staff orchestrator`,
        ]
      : []),
    ...(options.workerModel
      ? ['', `Use model: ${options.workerModel} for all workers`]
      : []),
    ...(options.maxParallel > 1
      ? [
          '',
          `Run up to ${options.maxParallel} workers in parallel when tasks are independent`,
        ]
      : [
          '',
          'Spawn workers one at a time. Do NOT wait for workers to finish — the UI handles tracking.',
        ]),
    ...(options.supervised
      ? ['', 'Supervised mode is enabled. Require approval before each task.']
      : []),
    '',
    '## Critical Rules',
    '- Use create_task / delegate_task to create worker agents for each task',
    '- Do NOT do the domain work yourself — delegate to your specialized staff',
    '- For simple tasks (single file, quick mockup), use ONLY 1 task with 1 worker — do not over-decompose',
    '- Do NOT ask for confirmation — start immediately',
    '- Follow worker naming conventions (`worker-accountant-<slug>`, `worker-developer-<slug>`, or `worker-<slug>`) so the office UI tracks staff identities',
    '- Each worker gets a self-contained prompt with the task + exit criteria',
    `- Workers should write output to ${outputPrefix} directories`,
    '- After spawning all workers, report your plan summary and finish. The UI tracks worker completion automatically.',
    '- Report an executive synthesis summary when all tasks are complete',
    ...formatInboxSummaryForPrompt(),
  ].join('\n')
}

function formatInboxSummaryForPrompt(): string[] {
  try {
    const summary = getWorkItemSummary()
    if (
      summary.needsAttention === 0 &&
      summary.waiting === 0 &&
      summary.inProgress === 0
    ) {
      return []
    }
    const lines = [
      '',
      '## Current Department Work Inbox Status',
      `- Needs Attention: ${summary.needsAttention} item(s)`,
      `- Waiting / Blocked: ${summary.waiting} item(s)`,
      `- In Progress: ${summary.inProgress} item(s)`,
    ]
    const attentionItems = listWorkItems({ status: 'needs_attention' }).slice(0, 3)
    if (attentionItems.length > 0) {
      lines.push('Key items requiring attention:')
      for (const item of attentionItems) {
        lines.push(`  • [${item.assignedAgentId}] ${item.title}`)
      }
    }
    return lines
  } catch {
    return []
  }
}

function authHeaders(): Record<string, string> {
  return BEARER_TOKEN ? { Authorization: `Bearer ${BEARER_TOKEN}` } : {}
}

function nowPlusSecondsIso(seconds: number): string {
  const t = new Date(Date.now() + seconds * 1000)
  return t.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

async function createHermesJob(payload: {
  name: string
  schedule: string
  prompt: string
  deliver?: string
}): Promise<{ id?: string; name?: string; error?: string }> {
  const body = JSON.stringify({
    name: payload.name,
    schedule: payload.schedule,
    prompt: payload.prompt,
    deliver: payload.deliver ?? 'local',
  })
  await ensureGatewayProbed()
  const res = await fetch(`${HERMES_API}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body,
  })
  const text = await res.text()
  let data: { job?: { id?: string; name?: string }; error?: string } = {}
  try {
    data = JSON.parse(text)
  } catch {
    return { error: text || `HTTP ${res.status}` }
  }
  if (!res.ok || data.error) {
    return { error: data.error || `HTTP ${res.status}` }
  }
  return { id: data.job?.id, name: data.job?.name }
}

export const Route = createFileRoute('/api/conductor-spawn')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        try {
          const body = (await request
            .json()
            .catch(() => ({}))) as ConductorSpawnBody
          const goal = readOptionalString(body.goal)
          const orchestratorModel = readOptionalString(body.orchestratorModel)
          const workerModel = readOptionalString(body.workerModel)
          const projectsDir = readOptionalString(body.projectsDir)
          const maxParallel = readMaxParallel(body.maxParallel)
          const supervised = body.supervised === true

          if (!goal) {
            return new Response(
              JSON.stringify({ ok: false, error: 'goal required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const skill = loadDispatchSkill()

          // Resolve EZity Chief of Staff and Staff Roster
          const isGeneric =
            body.ezity === false ||
            body.staffOrchestrated === false ||
            body.orchestratorAgentId === 'generic'
          const cosAgent = !isGeneric ? getAgent('ezity-chief-of-staff') : null
          const accountant = !isGeneric ? getAgent('ezity-accountant') : null
          const developer = !isGeneric ? getAgent('ezity-developer') : null

          let prompt: string
          let effectiveOrchestratorModel = orchestratorModel

          if (cosAgent) {
            effectiveOrchestratorModel =
              orchestratorModel || cosAgent.model || ''
            const roster = [accountant, developer].filter(
              (a): a is AgentDefinition => a !== null,
            )
            prompt = buildEZityOrchestratorPrompt(
              goal,
              skill,
              cosAgent,
              roster,
              {
                orchestratorModel: effectiveOrchestratorModel,
                workerModel,
                projectsDir,
                maxParallel,
                supervised,
              },
            )
          } else {
            prompt = buildOrchestratorPrompt(goal, skill, {
              orchestratorModel,
              workerModel,
              projectsDir,
              maxParallel,
              supervised,
            })
          }

          const jobName = `conductor-${Date.now()}`
          const result = await createHermesJob({
            name: jobName,
            schedule: nowPlusSecondsIso(5),
            prompt,
            deliver: 'local',
          })

          if (result.error) {
            return new Response(
              JSON.stringify({ ok: false, error: result.error }),
              { status: 502, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const jobId = result.id ?? jobName
          const sessionKey = `cron_${jobId}_pending`
          const sessionKeyPrefix = `cron_${jobId}_`

          // Map orchestrator job & session namespace to Chief of Staff
          if (cosAgent) {
            setSessionAgent(jobId, cosAgent.id)
            setSessionAgent(sessionKey, cosAgent.id)
            setSessionAgent(sessionKeyPrefix, cosAgent.id)
          }

          return new Response(
            JSON.stringify({
              ok: true,
              sessionKey,
              sessionKeyPrefix,
              jobId,
              jobName: result.name ?? jobName,
              runId: null,
              isEZity: Boolean(cosAgent),
              orchestrator: cosAgent
                ? {
                    id: cosAgent.id,
                    name: cosAgent.name,
                    emoji: cosAgent.emoji,
                    role: cosAgent.roleLabel,
                    model: effectiveOrchestratorModel,
                  }
                : null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
