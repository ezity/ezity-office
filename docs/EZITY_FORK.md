# Ezity AI Office

**Ezity AI Office** is an enterprise AI workforce and operations workspace maintained by **Ezity Solutions**.

## Upstream Relationship

- **Upstream Repository:** [JPeetz/Hermes-Studio](https://github.com/JPeetz/Hermes-Studio)
- **Product Name:** Ezity AI Office
- **Company:** Ezity Solutions
- **Short Descriptor:** AI Workforce & Operations

## Architecture & Compatibility Principles

To ensure continuous, painless merges with upstream releases of Hermes Studio, this fork adheres strictly to the following principles:

1. **Thin Presentation Layer:**
   Rebranding and customizations remain focused on user-facing presentation, labels, metadata, and visual assets.

2. **Preservation of Internal Contracts:**
   Internal Hermes concepts, API routes (`/api/*`), data models, gateway contracts, CLI tools, runtime orchestration, and environment variables (such as `HERMES_API_URL`, `HERMES_API_TOKEN`, `HERMES_PASSWORD`) are intentionally kept intact.

3. **Generic Functional Terminology:**
   Core operations concepts—including *Agent*, *Crew*, *Session*, *Skill*, *Tool*, *Memory*, *Workflow*, *Job*, *Approval*, and *MCP*—remain consistent with upstream architectures.

4. **Upstream Attribution & License:**
   The original MIT license, credits, and upstream attribution to JPeetz and the Hermes Agent community are fully preserved.

## Contributing & Syncing Upstream

When adding features or syncing upstream changes:
- Keep downstream-specific changes isolated.
- Avoid modifying core runtime wiring or renaming internal identifiers.
- Test compatibility against the standard Hermes Gateway.
