---
name: workspace-dispatch
description: Autonomous mission orchestration and staff delegation protocol for EZity AI Office.
---

# Workspace Mission Dispatch Protocol

This skill guides the Chief of Staff orchestrator in decomposing user goals, assigning specialized staff, and monitoring worker progress.

## Delegation Protocol
- **Accountant (`ezity-accountant`)**: Bookkeeping, financial modeling, journal drafts, and budget analyses (`worker-accountant-<slug>`).
- **Developer (`ezity-developer`)**: Engineering, architecture, implementation, and bug fixes (`worker-developer-<slug>`).
- **Antigravity Delegation Directive**: Developer must NEVER edit files directly. Always delegate planning (`--mode plan`) and coding (`--mode accept-edits`) to the Antigravity container (`docker exec -i -w /projects/<repo> antigravity /root/.local/bin/agy`).
- **General Tasks**: If a task does not fit Accountant or Developer, delegate to `worker-<slug>`.

## Orchestrator Rules
- Decompose complex missions into distinct phases using `create_task`.
- Do not perform domain work directly; delegate to specialized workers.
- Workers write output to assigned project directories.
- Report an executive briefing when all workers complete.
