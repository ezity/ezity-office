---
name: workspace-dispatch
description: Autonomous mission orchestration and staff delegation protocol for EZity AI Office.
---

# Workspace Mission Dispatch Protocol

This skill guides the Chief of Staff orchestrator in decomposing user goals, assigning specialized staff, and monitoring worker progress.

## Staff Roles & Responsibilities

1. **Accountant (`ezity-accountant`)**:
   - Handles bookkeeping, financial modeling, journal drafts, and budget analyses.
   - Worker label convention: `worker-accountant-<task-slug>`.

2. **Developer (`ezity-developer`)**:
   - Handles engineering, software architecture, technical implementation, and bug fixes.
   - Worker label convention: `worker-developer-<task-slug>`.
   - **CRITICAL DELEGATION RULE**: Developer must NEVER read or edit repository files directly using ad-hoc shell or filesystem tools.
   - All planning and coding MUST be delegated to the **Antigravity (`agy`)** Docker container on the NAS.

---

## Antigravity (`agy`) Execution Protocol for Developer

When executing or dispatching tasks for **Developer**:

### Environment & Repositories
The Antigravity engine runs inside container `antigravity` (`local/antigravity:latest`), accessible to Hermes via the Docker socket (`docker exec`).
Mounted repositories inside container:
- `/projects/ezity-office` (EZity AI Office)
- `/projects/PharmaHadir` (PharmaHadir)
- `/projects/EZBip` (EZBip)
- `/workspace` (General / shared workspace)

Persistent configurations inside container:
- `/root/.gemini` (AGY credentials & configuration)
- `/root/.ssh` (GitHub SSH auth configured for GitHub user `ezity`)

### Invocation Commands

#### 1. Planning Phase (Model: `gemini-3.8-flash-high`)
Always start complex engineering tasks by generating a verified architectural plan:
```bash
docker exec -i -w /projects/<repo_name> antigravity /root/.local/bin/agy \
  --model gemini-3.8-flash-high \
  --mode plan \
  --print "<detailed planning prompt including requirements, constraints, and target files>"
```

#### 2. Coding & Implementation Phase (Model: `gemini-3.8-flash-medium`)
Execute multi-file autonomous edits, refactoring, and implementations:
```bash
docker exec -i -w /projects/<repo_name> antigravity /root/.local/bin/agy \
  --model gemini-3.8-flash-medium \
  --mode accept-edits \
  --print "<actionable implementation instructions based on approved plan>"
```

#### 3. Verification & Git
After `agy` completes its run:
- Review the diffs, test outputs, and plan status printed by `agy`.
- If requested to push changes, run `git` commands inside the container where SSH keys for `ezity` are mounted.
- Synthesize the final outcome and return the status to Chief of Staff.

---

## Orchestrator Rules
- Decompose complex missions into distinct phases.
- Do not perform domain work directly; delegate to specialized staff workers using `create_task`.
- Supervised mode: wait for approval before running tasks if configured.
- Report an executive briefing when all workers complete.
