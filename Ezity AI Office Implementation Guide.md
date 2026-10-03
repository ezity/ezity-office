# Ezity AI Office

## Hermes Studio Fork + Existing Hermes + EzityHub Integration

**Target architecture:** UGREEN NAS → Docker → existing Hermes Agent → Ezity AI Office (Hermes Studio fork) → EzityHub API.

---

# 1. Objective

Kita nak jadikan Hermes Studio sebagai graphical **AI office untuk Ezity Solutions**.

Hermes akan provide:

- AI agents / staff
- multi-agent crews
- agent personas
- model selection
- task delegation
- live activity
- approvals
- agent workspace
- scheduled jobs
- virtual office / Conductor UI

EzityHub pula kekal sebagai:

- company management system
- accounting/bookkeeping system
- source of truth
- database/business rules
- audit trail
- invoices/expenses/ledger
- HR/operations data

Hubungan akhir:

```text
                       YOU
                        │
                        ▼
                EZITY AI OFFICE
              Hermes Studio Fork
                        │
                 Chief of Staff
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   Accountant       Developer       Operations
        │               │                │
        ▼               ▼                ▼
   EzityHub API      GitHub /         EzityHub API
        │            Codex
        ▼
   EzityHub DB
    Supabase
```

Hermes = **otak dan pekerja**

EzityHub = **company system dan data**

---

# 2. Important Architecture Decision

## Jangan deploy Hermes Agent kedua

Hermes Studio official Docker Compose normally launches:

```text
hermes-agent
+
hermes-studio
```

Tetapi NAS kita dah mempunyai Hermes Agent sendiri.

Jadi architecture kita:

```text
Existing Hermes Agent
        │ :8642
        ▼
Ezity AI Office
(Hermes Studio fork)
        │
        ▼
Browser
```

Hermes Studio supports connecting kepada existing Hermes gateway melalui `HERMES_API_URL`. Full features seperti sessions, memory, skills, jobs dan tools tersedia apabila ia connect kepada Hermes gateway, bukannya direct OpenAI-compatible model sahaja.

---

# 3. Target Docker Layout

NAS akhirnya lebih kurang:

```text
Docker
│
├── hermes-agent
│      └── :8642
│
├── ollama
│      └── :11434
│
├── ezity-ai-office
│      └── :3000
│
├── antigravity
│
└── other existing services
```

Optional kemudian:

```text
├── ezityhub-mcp
│      └── EzityHub API adapter
│
└── redis
       └── Hermes Studio session persistence
```

---

# 4. Phase 1 — Verify Existing Hermes Gateway

Sebelum install Studio, pastikan Hermes HTTP API enabled.

Dalam Hermes environment:

```env
API_SERVER_ENABLED=true
```

Hermes documentation/current Studio config indicates gateway HTTP API perlu enabled untuk Studio connect kepada port `8642`.

Restart Hermes container.

Kemudian test dari NAS:

```bash
curl http://localhost:8642/health
```

Expected:

```json
{
  "status": "ok"
}
```

Kalau Hermes container tidak expose port kepada host, test menggunakan Docker network:

```bash
docker exec <container-name> curl http://localhost:8642/health
```

---

# 5. Phase 2 — Fork Hermes Studio

Original project:

```text
JPeetz/Hermes-Studio
```

Hermes Studio is MIT licensed, jadi kita boleh fork dan customize sebagai Ezity AI Office.

Di GitHub:

```text
Fork
JPeetz/Hermes-Studio
```

Suggested repo name:

```text
ezity-office
```

Contoh:

```text
github.com/ezity/ezity-office
```

Kemudian clone:

```bash
git clone git@github.com:ezity/ezity-office.git
cd ezity-office
```

Add original project sebagai upstream:

```bash
git remote add upstream https://github.com/JPeetz/Hermes-Studio.git
```

Verify:

```bash
git remote -v
```

Expected:

```text
origin    <your fork>
upstream  JPeetz/Hermes-Studio
```

Ini penting supaya kita masih boleh pull future Hermes Studio updates.

Update fork nanti:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

# 6. Phase 3 — Create Ezity Development Branch

Jangan customize terus atas `main`.

Create branch:

```bash
git checkout -b ezity
```

Recommended structure:

```text
main
│
└── mostly sync dengan Hermes Studio upstream

ezity
│
└── Ezity customizations
```

Bila upstream ada feature baru:

```text
upstream/main
      ↓
main
      ↓
ezity
```

Ini akan considerably reduce pain masa update nanti.

---

# 7. Phase 4 — Run Studio Before Customizing

Install dependencies:

```bash
pnpm install
```

Hermes Studio current requirement ialah Node.js 22+.

Create env:

```bash
cp .env.example .env
```

Set:

```env
HERMES_API_URL=http://127.0.0.1:8642
```

Development:

```bash
pnpm dev
```

Open:

```text
http://NAS-IP:3000
```

Verify:

```text
✓ Studio loads
✓ Hermes connected
✓ Chat works
✓ Existing model visible
✓ Sessions work
✓ Skills visible
✓ Tools work
```

Jangan customize apa-apa sehingga baseline ni stable.

---

# 8. Phase 5 — Dockerize Against Existing Hermes

Official Compose normally creates its own Hermes Agent container. Kita tak mahu itu.

Create:

```text
docker-compose.ezity.yml
```

Example:

```yaml
services:

  ezity-ai-office:
    build:
      context: .
      dockerfile: docker/workspace/Dockerfile

    container_name: ezity-ai-office

    restart: unless-stopped

    environment:
      HERMES_API_URL: http://hermes-agent:8642
      HERMES_PASSWORD: ${HERMES_PASSWORD}

    volumes:
      - ezity-ai-office-data:/app/.runtime

    ports:
      - "3000:3000"

    networks:
      - ai-network

networks:
  ai-network:
    external: true

volumes:
  ezity-ai-office-data:
```

`hermes-agent` mesti diganti dengan **actual Docker hostname/container service name** Hermes you.

Contoh kalau container sekarang:

```text
hermes
```

guna:

```yaml
HERMES_API_URL: http://hermes:8642
```

---

# 9. Shared Docker Network

Studio dan Hermes kena berada dalam Docker network yang sama.

Check:

```bash
docker network ls
```

Contoh kita create:

```bash
docker network create ai-network
```

Connect existing Hermes:

```bash
docker network connect ai-network hermes-agent
```

Connect Ollama kalau perlu:

```bash
docker network connect ai-network ollama
```

Ezity AI Office Compose tadi automatically join:

```text
ai-network
```

Architecture:

```text
ai-network

hermes-agent:8642
       ▲
       │
ezity-ai-office:3000
       │
       ▼
     browser
```

---

# 10. Phase 6 — Add Basic Security

Jangan expose Studio terus ke Internet tanpa authentication.

Hermes Studio supports:

```env
HERMES_PASSWORD=
```

untuk password-protect UI.

Example:

```env
HERMES_PASSWORD=<strong-password>
```

Untuk internal use, preferred:

```text
Internet
   X

Tailscale
   │
   ▼
NAS
   │
Ezity AI Office
```

Public Cloudflare exposure hanya buat kemudian kalau genuinely diperlukan.

---

# 11. Phase 7 — Initial Ezity Branding

Jangan redesign seluruh app terus.

First customization:

```text
Hermes Studio
      ↓
Ezity AI Office
```

Change:

- app name
- page title
- favicon
- logo
- sidebar branding
- login branding
- default theme
- virtual office title

Suggested identity:

```text
Ezity AI Office
Ezity Solutions
```

Subtitle:

```text
AI Workforce & Operations
```

Sidebar:

```text
EZITY AI OFFICE

Office
Agents
Crews
Tasks
Approvals
Knowledge
Automations

Company
Finance
Engineering
Operations
Marketing

System
Models
Skills
Tools
Settings
```

**Do not rename internal Hermes concepts unnecessarily.**

Contoh:

```text
Crew
Agent
Session
Skill
Tool
```

keep internal naming initially.

UI labels sahaja kita customize.

Ini memudahkan upstream merging.

---

# 12. Phase 8 — Define Ezity AI Staff

Start kecil.

Recommended first crew:

## Chief of Staff

Role:

```text
Chief of Staff
```

Responsibility:

```text
Coordinate other Ezity AI staff.
Understand requests from the company owner.
Delegate domain-specific work.
Consolidate findings.
Escalate decisions requiring human approval.
```

Access:

```text
✓ staff delegation
✓ reports
✓ company information
✓ read-only cross-department data

✗ raw financial modifications
✗ production deployment
```

---

## Accountant

Role:

```text
Accountant / Bookkeeper
```

Responsibilities:

```text
Bookkeeping
Transaction review
Expense categorization
Invoice monitoring
Reconciliation assistance
P&L analysis
Cash flow analysis
Monthly reporting
```

Tools:

```text
EzityHub Finance API
```

---

## Developer

Responsibilities:

```text
EzityHub
EzBip
EzJemput
software maintenance
code review
bug fixing
testing
```

Tools later:

```text
GitHub
Codex
terminal
repo filesystem
```

---

## Operations

Responsibilities:

```text
Company operations
Events
Registration systems
customer issues
operational monitoring
```

Tools:

```text
EzityHub Operations API
EzBip API
```

---

## Marketing / Creative

Responsibilities:

```text
campaign ideas
copywriting
brand consistency
content planning
creative briefs
```

---

## QA / Reviewer

Responsibilities:

```text
review output
check code
verify calculations
challenge assumptions
validate before approval
```

---

# 13. Phase 9 — Model Strategy

Don't use expensive model untuk semua staff.

Example:

```text
Chief of Staff
→ premium reasoning model

Developer
→ coding model

Accountant
→ reliable reasoning model

Operations
→ medium-cost model

Marketing
→ medium model

simple background tasks
→ local Ollama model
```

Hermes Studio supports per-member models dalam Multi-Agent Crews.

Example:

```text
Chief of Staff
GPT / Claude / high reasoning

Developer
Codex

Operations
API economical model

Simple admin
Qwen local via Ollama
```

NAS therefore acts mainly as:

```text
orchestrator
gateway
database connector
UI
local lightweight inference
```

Heavy inference boleh kekal cloud.

---

# 14. Phase 10 — Connect EzityHub

EzityHub already exposes API.

Kita jangan bagi Hermes generic unrestricted HTTP access.

Preferred architecture:

```text
Hermes Accountant
       │
       ▼
EzityHub MCP Adapter
       │
       ▼
EzityHub REST API
       │
       ▼
Supabase
```

Hermes officially supports MCP as an adapter for external/internal systems, including internal APIs and company systems. It supports both local stdio MCP servers and remote HTTP MCP servers.

Kenapa MCP:

```text
Hermes sees:

get_transactions
get_expenses
create_expense
get_invoices
get_profit_loss
```

instead of:

```text
GET /api/v1/.....
POST /api/v1/.....
headers....
JSON....
```

AI works jauh better bila API exposed sebagai semantic tools.

---

# 15. EzityHub MCP Tool Design

Create project:

```text
ezityhub-mcp
```

Minimum initial tools:

```text
finance_get_transactions
finance_get_transaction

finance_get_expenses
finance_create_expense

finance_get_invoices
finance_get_overdue_invoices

finance_get_profit_loss
finance_get_cashflow

finance_get_uncategorized_transactions
```

Later:

```text
finance_propose_category
finance_prepare_reconciliation
finance_prepare_journal
```

Avoid initially:

```text
delete_transaction
delete_invoice
post_journal
void_payment
modify_historical_entry
```

---

# 16. Read vs Write Permissions

Design API tools in three levels.

## Level 1 — Read Only

AI boleh execute automatically:

```text
read transactions
read invoices
read expenses
generate reports
find uncategorized transactions
read account balances
```

---

## Level 2 — Safe Write

AI boleh execute depending on confidence/policy:

```text
add notes
create draft
suggest category
attach metadata
create draft journal
```

---

## Level 3 — Financial Commit

Require human approval:

```text
post journal
delete transaction
void invoice
mark invoice paid
change account balance
modify historical transaction
```

Flow:

```text
Accountant

"I recommend posting this journal:

Debit: Software Expense RM89
Credit: Bank RM89

Reason:
Domain renewal."

          ↓

Pending Approval

[Approve]
[Reject]
```

Hermes Studio already has approval-oriented functionality, so kita should reuse that instead of inventing another approval engine.

---

# 17. MCP Connection Configuration

Hermes MCP config lives in:

```text
~/.hermes/config.yaml
```

For remote EzityHub MCP:

```yaml
mcp_servers:

  ezityhub:
    url: "http://ezityhub-mcp:3001/mcp"

    headers:
      Authorization: "Bearer ${EZITYHUB_AGENT_TOKEN}"

    tools:
      include:
        - finance_get_transactions
        - finance_get_expenses
        - finance_get_invoices
        - finance_get_profit_loss
        - finance_get_cashflow
```

Current Hermes MCP supports tool filtering, allowing only selected tools daripada a connected server.

Ini sangat penting.

Never expose:

```text
all EzityHub admin API
```

kepada AI.

Expose only:

```text
tools required for that job.
```

---

# 18. EzityHub Service Account

Create special identity:

```text
ai-accountant@ezity.internal
```

atau logical API service account:

```text
service: hermes-accountant
```

Permissions:

```text
finance.transaction.read
finance.expense.read
finance.expense.create
finance.invoice.read
finance.report.read
```

Do not give:

```text
organization.delete
user.admin
billing.admin
database.raw_access
```

Later separate agents:

```text
hermes-accountant

hermes-operations

hermes-hr

hermes-chief-of-staff
```

Jangan satu giant API key untuk semua department.

---

# 19. Agent Persona — Accountant

Suggested system instructions:

```text
You are the Accountant for Ezity Solutions.

Your responsibilities are bookkeeping, financial review,
expense categorization, invoice monitoring, reconciliation,
cash-flow analysis and management reporting.

EzityHub is the authoritative source for company financial data.

Never invent financial records.

Always retrieve current figures from EzityHub before answering
questions involving balances, invoices, expenses or financial reports.

Do not perform destructive or irreversible financial actions
without explicit human approval.

When uncertain about accounting classification, present the
proposed treatment and reasoning for review instead of committing it.

For management reports, clearly distinguish:
- recorded facts
- calculations
- assumptions
- recommendations
```

---

# 20. First Accounting Test

Don't start dengan complicated autonomous bookkeeping.

Test:

```text
You:
Show all uncategorized transactions this month.
```

Expected:

```text
Accountant
    │
    ▼
finance_get_uncategorized_transactions
    │
    ▼
EzityHub
    │
    ▼
results
```

Then:

```text
Categorize these transactions and explain your reasoning.
Do not save anything.
```

Next:

```text
Prepare monthly P&L.
```

Then:

```text
Compare this month against previous month.
```

Only selepas results consistently good:

```text
allow draft writes.
```

---

# 21. Phase 11 — Chief of Staff Workflow

Once Accountant works:

```text
YOU
 │
 ▼
Chief of Staff
 │
 ├── Accountant
 │      └── EzityHub
 │
 ├── Developer
 │      └── GitHub
 │
 ├── Operations
 │      └── EzityHub
 │
 └── Marketing
```

Example:

```text
You:

"Give me this week's Ezity company briefing."
```

Chief of Staff delegates:

```text
Accountant
→ finance summary

Developer
→ product/dev summary

Operations
→ operational issues

Marketing
→ campaigns/content
```

Chief of Staff returns:

```text
EZITY WEEKLY BRIEF

Finance
Revenue ...
Expenses ...
Outstanding invoices ...

Engineering
EzityHub ...
EzBip ...

Operations
...

Issues requiring attention
1.
2.
3.
```

This is the point where multi-agent architecture mula genuinely useful.

---

# 22. Phase 12 — Virtual Office

Only selepas agents actually work properly, customize graphical office.

Concept:

```text
┌────────────────────────────────────┐
│           EZITY AI OFFICE          │
│                                    │
│ CEO OFFICE                         │
│ 🧑 Chief of Staff                  │
│ ● Working                          │
│                                    │
│ FINANCE             ENGINEERING    │
│ 🧮 Accountant       💻 Developer   │
│ ● Working           ○ Idle         │
│                                    │
│ OPERATIONS          MARKETING      │
│ 📋 Ops              🎨 Creative    │
│ ○ Idle              ● Working      │
│                                    │
│ QA                                 │
│ 🔍 Reviewer                        │
│ ○ Waiting                          │
└────────────────────────────────────┘
```

Agent status should come from actual agent state:

```text
idle
thinking
tool_call
working
waiting_approval
complete
error
```

Not random animation.

---

# 23. Phase 13 — Ezity-Specific Dashboard

After core integration stable, add custom Ezity modules around Hermes Studio.

Example:

```text
Dashboard

Company Health
├── Revenue
├── Expenses
├── Outstanding invoices
└── Current projects


AI Workforce
├── Active agents
├── Tasks
├── Pending approvals
└── Recent activity


Products
├── EzityHub
├── EzBip
└── EzJemput


Infrastructure
├── Hermes
├── Ollama
├── Supabase
└── deployments
```

Important principle:

```text
Don't copy EzityHub into Hermes.
```

Instead:

```text
Ezity AI Office
      │
      ▼
summary / control / agent interaction
      │
      ▼
EzityHub
      │
      ▼
full operational interface
```

EzityHub stays authoritative.

---

# 24. Upstream Strategy

Our fork should remain relatively thin.

Good customization:

```text
branding
navigation
Ezity dashboards
agent templates
office visualization
Ezity-specific connectors
```

Avoid unnecessarily modifying:

```text
Hermes gateway protocol
core session engine
streaming engine
agent runtime
tool execution
MCP internals
```

Reason:

```text
less divergence
=
easier upstream updates
```

Monthly:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

git checkout ezity
git merge main
```

Resolve only Ezity UI conflicts.

---

# 25. Recommended Repository Layout

Eventually:

```text
GitHub

ezity-ai-office
│
├── Hermes Studio fork
├── Ezity branding
├── AI Office UI
└── company dashboard

ezityhub
│
├── company system
├── accounting
├── HR
└── operations

ezityhub-mcp
│
└── Hermes ↔ EzityHub adapter
```

Do not put all three systems into one repo.

---

# 26. Production Architecture

Recommended final architecture:

```text
                         YOU
                          │
                    Tailscale/VPN
                          │
                          ▼
                ┌────────────────────┐
                │  EZITY AI OFFICE   │
                │ Hermes Studio Fork │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │    Hermes Agent    │
                │    Orchestrator    │
                └──────┬───────┬─────┘
                       │       │
              ┌────────┘       └─────────┐
              ▼                          ▼
        Cloud AI Models              Ollama
                                          NAS

                       │
                       ▼
               EzityHub MCP
                       │
                       ▼
               EzityHub API
                       │
                       ▼
                    Supabase
```

---

# 27. Implementation Order

Follow this sequence.

### Stage 1 — Infrastructure

```text
[ ] Verify Hermes gateway :8642
[ ] Fork Hermes Studio
[ ] Run Studio unchanged
[ ] Connect to existing Hermes
[ ] Dockerize Studio only
[ ] Add authentication
```

### Stage 2 — Branding

```text
[ ] Rename Ezity AI Office
[ ] Add Ezity logo
[ ] favicon
[ ] theme
[ ] navigation
```

### Stage 3 — AI Staff

```text
[ ] Chief of Staff
[ ] Accountant
[ ] Developer
[ ] Operations
[ ] QA
```

### Stage 4 — EzityHub Integration

```text
[ ] Create MCP adapter
[ ] service authentication
[ ] read-only finance tools
[ ] transaction queries
[ ] invoice queries
[ ] P&L
[ ] cashflow
```

### Stage 5 — Controlled Writes

```text
[ ] draft expense
[ ] category suggestion
[ ] journal proposal
[ ] human approval
[ ] audit trail
```

### Stage 6 — Multi-Agent

```text
[ ] Chief of Staff delegation
[ ] department handoffs
[ ] weekly briefing
[ ] QA review
```

### Stage 7 — AI Office

```text
[ ] Customize Conductor
[ ] Ezity office layout
[ ] agent status
[ ] task visualization
```

### Stage 8 — Company Dashboard

```text
[ ] Finance summary
[ ] engineering summary
[ ] product health
[ ] operations
[ ] alerts
```

---

# 28. What We Should NOT Build Yet

Avoid initially:

```text
❌ autonomous payments
❌ autonomous invoice deletion
❌ full direct DB access
❌ AI modifying Supabase tables directly
❌ unrestricted admin API
❌ custom orchestration engine
❌ rebuild Hermes agent runtime
❌ complex virtual office before agents work
```

Priority:

```text
Agent usefulness
       ↓
Reliable tool access
       ↓
Permissions
       ↓
Workflow
       ↓
UI polish
```

Not the other way around.

---

# 29. First Milestone

Our first milestone should be very specific:

```text
Ezity AI Office running on NAS
        +
connected to existing Hermes
        +
one Accountant Agent
        +
read-only EzityHub Finance tools
```

Success test:

```text
You:

"Prepare Ezity financial summary for September."

Accountant:

→ calls EzityHub
→ gets actual records
→ calculates figures
→ identifies issues
→ produces management summary
→ changes nothing without approval
```

If that works reliably, architecture is proven.

Then add:

```text
Developer
Operations
Chief of Staff
Multi-agent workflow
Virtual office
```

---

# 30. Final Direction

For Ezity, recommended approach is:

```text
DON'T

Hermes Studio
→ heavily rewrite everything
→ create unrelated custom system


DO

Hermes Studio
→ thin Ezity fork
→ reuse Hermes runtime
→ add Ezity branding
→ add company-specific integrations
→ connect EzityHub through controlled tools
→ gradually evolve into Ezity AI Office
```

Hermes Studio becomes the **AI workforce interface**.

Hermes Agent becomes the **agent runtime/orchestrator**.

EzityHub becomes the **company operating system and source of truth**.

EzityHub MCP becomes the **secure bridge between both systems**.

That separation gives us the best chance of keeping the project maintainable while still allowing Ezity AI Office to eventually look and behave like a completely custom product.
