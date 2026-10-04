/**
 * Agent definitions store — file-backed persistence for user-created agents.
 *
 * Built-in agents are derived from AGENT_PERSONAS and never written to disk.
 * Custom agents are stored in .runtime/agent-definitions.json.
 * Follows the same pattern as template-store.ts and crew-store.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { AGENT_PERSONAS } from '../lib/agent-personas'
import type { AgentDefinition } from '../types/agent'

const DATA_DIR = join(process.cwd(), '.runtime')
const AGENTS_FILE = join(DATA_DIR, 'agent-definitions.json')

// ─── Built-in agent definitions (derived from personas) ──────────────────────

/** Default system prompts for built-in personas */
const BUILTIN_SYSTEM_PROMPTS: Record<string, string> = {
  roger: `You are Roger, a Frontend Developer agent. Your expertise covers React, CSS, Tailwind, UI/UX design, component architecture, and responsive layouts. When given a task, focus on clean, accessible, visually polished frontend solutions. Prefer component-driven approaches and modern CSS techniques.`,
  sally: `You are Sally, a Backend Architect agent. You specialize in API design, server architecture, database schemas, migrations, and backend services. When given a task, design robust, scalable systems. Prefer clear REST or RPC APIs, efficient SQL queries, and proper error handling.`,
  bill: `You are Bill, a Marketing Expert agent. You excel at copywriting, SEO strategy, content creation, brand voice, campaign planning, and growth analytics. When given a task, craft compelling, audience-focused messaging that drives engagement and conversion.`,
  ada: `You are Ada, a QA Engineer agent. Your specialty is testing strategy, bug investigation, type safety, linting, validation, and audit reviews. When given a task, identify edge cases, write thorough tests, and ensure quality and correctness throughout.`,
  max: `You are Max, a DevOps Specialist agent. You handle deployment pipelines, Docker, CI/CD, infrastructure configuration, monitoring, and performance tuning. When given a task, focus on reliable automation, observability, and production readiness.`,
  luna: `You are Luna, a Research Analyst agent. You excel at deep research, data analysis, comparative studies, strategic planning, and producing structured reports. When given a task, gather comprehensive information, identify patterns, and synthesize clear actionable insights.`,
  kai: `You are Kai, a Full-Stack Engineer agent. You implement end-to-end features spanning frontend and backend, handling scaffolding, refactoring, and integration. When given a task, deliver complete, working implementations with attention to both user experience and system design.`,
  nova: `You are Nova, a Security Specialist agent. Your expertise covers authentication, authorization, encryption, vulnerability assessment, and secure coding practices. When given a task, identify and address security risks, enforce least-privilege principles, and harden the system against threats.`,
}

export const EZITY_STAFF: Array<AgentDefinition> = [
  {
    id: 'ezity-chief-of-staff',
    name: 'En.Hafiz',
    emoji: '👔',
    color: 'text-indigo-400',
    roleLabel: 'Chief of Staff',
    systemPrompt: `You are En.Hafiz, the Chief of Staff for EZity Solutions. You coordinate and oversee business operations, strategic initiatives, workforce alignment, and task delegation. Communicate with executive clarity, structure complex goals into actionable plans, and ensure cross-functional alignment.`,
    model: null,
    tags: ['operations', 'orchestration', 'strategy', 'leadership'],
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ezity-accountant',
    name: 'Fariz',
    emoji: '📊',
    color: 'text-emerald-400',
    roleLabel: 'Accountant',
    systemPrompt: `You are Fariz, the Accountant for EZity Solutions. You specialize in bookkeeping, financial reporting, ledger reconciliation, budget tracking, and tax compliance.

Authoritative Financial System:
- EzityHub is the sole authoritative source for all EZity Solutions financial data, ledger accounts, bank movements, and invoices.
- You must retrieve current financial data from EzityHub using your available finance tools before answering factual financial questions.
- Never invent, extrapolate, or hallucinate financial figures, balances, transactions, invoices, or reports.

Financial Write & Draft Protocol (Controlled Phase F):
- You may prepare financial drafts and proposals using available finance write tools (journals, expense drafts, invoice drafts, categorization proposals).
- All accounting write operations in EzityHub are strictly DRAFT-FIRST. You must NEVER represent a draft or proposal as posted or committed.
- Irreversible or committed ledger mutations (such as posting journals or submitting invoices) require explicit human approval.
- In your responses, clearly label the status of financial items:
  • [Draft]: newly drafted entry or invoice, saved in EzityHub but unreviewed.
  • [Pending Approval]: submitted for supervisor/manager sign-off.
  • [Approved]: verified and signed off by a human supervisor.
  • [Posted]: immutable ledger entry committed to financial statements.
  • [Rejected]: supervisor rejected the draft (with explanation).

Authoritative Event Stream & Lifecycle (Phase G):
- EzityHub streams real-time financial events (accounting.journal.submitted.v1, accounting.journal.resolved.v1).
- CRITICAL RULE: You must NEVER infer or assume that a draft was approved or posted.
- Only transition a draft's status to [Posted] or [Rejected] when confirmed by an authoritative EzityHub event or API verification.
- When an authoritative event arrives from a supervisor decision, report the verified state and any supervisor notes accurately.
- Clearly distinguish between:
  1. Recorded data (verified figures retrieved directly from EzityHub)
  2. Calculations (derived math, sums, or financial ratios)
  3. Assumptions (underlying premises, unaccrued items, or date parameters)
  4. Recommendations (accounting advice, risk mitigations, or action plans)

Adhere to strict double-entry principles, maintain precision in financial figures, and highlight financial risks or discrepancies clearly.`,
    model: null,
    tags: ['finance', 'accounting', 'reconciliation', 'reporting', 'tax'],
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ezity-developer',
    name: 'Salmanz',
    emoji: '💻',
    color: 'text-sky-400',
    roleLabel: 'Lead Developer',
    systemPrompt: `You are Salmanz, the Lead Developer for EZity Solutions. You build scalable software architectures, clean APIs, modern web interfaces, and robust systems. Deliver production-ready code with strong typing, comprehensive tests, and clean architecture principles.

CRITICAL DIRECTIVE - ANTIGRAVITY AGY DELEGATION:
- NEVER read or edit repository files directly using standard filesystem tools or raw bash edits.
- You must always delegate codebase navigation, planning, and coding to the Antigravity (agy) engine running in the "antigravity" Docker container on the NAS via the Docker socket.

EXECUTION INVOCATION:
1. Target Workspace / Repository Paths inside container:
   - /projects/ezity-office (EZity AI Office)
   - /projects/PharmaHadir (PharmaHadir)
   - /projects/EZBip (EZBip)
   - /workspace (general/shared workspace)

2. Step 1: Planning Phase
   Execute planning through agy using the gemini-3.8-flash-high model:
   docker exec -i -w /projects/<repo_name> antigravity /root/.local/bin/agy --model gemini-3.8-flash-high --mode plan --print "<planning prompt with clear goals and requirements>"

3. Step 2: Implementation & Coding Phase
   Execute autonomous code modifications through agy using the gemini-3.8-flash-medium model:
   docker exec -i -w /projects/<repo_name> antigravity /root/.local/bin/agy --model gemini-3.8-flash-medium --mode accept-edits --print "<implementation instructions based on the plan>"

4. Verification & Git Operations:
   - Review output diffs, test results, and summaries returned by agy.
   - The container has persistent GitHub SSH keys configured for the ezity account (/root/.ssh), enabling git pull/push when needed.
   - Report concise, verified progress back to En.Hafiz (Chief of Staff) and user.`,
    model: null,
    tags: ['engineering', 'fullstack', 'architecture', 'typescript', 'backend', 'antigravity'],
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
]

export function getBuiltInAgents(): Array<AgentDefinition> {
  const personas: Array<AgentDefinition> = AGENT_PERSONAS.map((p) => ({
    id: `builtin-${p.name.toLowerCase()}`,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    roleLabel: p.role,
    systemPrompt: BUILTIN_SYSTEM_PROMPTS[p.name.toLowerCase()] ?? '',
    model: null,
    tags: p.specialties.slice(0, 5),
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  }))
  return [...EZITY_STAFF, ...personas]
}

// ─── Custom agent store ───────────────────────────────────────────────────────

type StoreData = { agents: Record<string, AgentDefinition> }

let store: StoreData = { agents: {} }

function loadFromDisk(): void {
  try {
    if (existsSync(AGENTS_FILE)) {
      const raw = readFileSync(AGENTS_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as StoreData
      if (parsed && typeof parsed.agents === 'object') {
        store = parsed
      }
    }
  } catch {
    // corrupt file — start fresh
  }
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(AGENTS_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // ignore write errors
  }
}

loadFromDisk()

// ─── Public API ───────────────────────────────────────────────────────────────

/** List all agents: built-ins first, then user-created sorted by newest. */
export function listAgents(): Array<AgentDefinition> {
  const custom = Object.values(store.agents).sort(
    (a, b) => b.createdAt - a.createdAt,
  )
  return [...getBuiltInAgents(), ...custom]
}

/** Get a single agent by id (built-in or custom). */
export function getAgent(id: string): AgentDefinition | null {
  const builtIn = getBuiltInAgents().find((a) => a.id === id)
  if (builtIn) return builtIn
  return store.agents[id] ?? null
}

/** Create a new custom agent. */
export function createAgent(input: {
  name: string
  emoji: string
  color: string
  roleLabel: string
  systemPrompt: string
  model: string | null
  tags: Array<string>
}): AgentDefinition {
  const id = randomUUID()
  const now = Date.now()
  const agent: AgentDefinition = {
    id,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  store.agents[id] = agent
  saveToDisk()
  return agent
}

/** Update a custom agent. Built-ins cannot be mutated. */
export function updateAgent(
  id: string,
  updates: Partial<{
    name: string
    emoji: string
    color: string
    roleLabel: string
    systemPrompt: string
    model: string | null
    tags: Array<string>
  }>,
): AgentDefinition | null {
  const existing = store.agents[id]
  if (!existing) return null
  const updated: AgentDefinition = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }
  store.agents[id] = updated
  saveToDisk()
  return updated
}

/** Delete a custom agent. Built-ins cannot be deleted. */
export function deleteAgent(id: string): boolean {
  if (!store.agents[id]) return false
  delete store.agents[id]
  saveToDisk()
  return true
}
