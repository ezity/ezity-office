import type { AuditRecord, WriteAuditRecord } from './types.js'

export class AuditLogger {
  private logSink: (record: WriteAuditRecord) => void

  constructor(sink?: (record: WriteAuditRecord) => void) {
    this.logSink = sink || this.defaultSink
  }

  private defaultSink(record: WriteAuditRecord): void {
    // Write structured audit log to stderr so stdio MCP transport is not corrupted
    const line = JSON.stringify({
      timestamp: record.timestamp,
      requestId: record.requestId,
      tool: record.toolName,
      endpoint: record.endpoint,
      method: record.method,
      status: record.status,
      statusCode: record.statusCode,
      durationMs: record.durationMs,
      ...(record.actingAgentId ? { actingAgentId: record.actingAgentId } : {}),
      ...(record.agentDefinitionId ? { agentDefinitionId: record.agentDefinitionId } : {}),
      ...(record.humanApprover ? { humanApprover: record.humanApprover } : {}),
      ...(record.idempotencyKey ? { idempotencyKey: record.idempotencyKey } : {}),
      ...(record.recordId ? { recordId: record.recordId } : {}),
      ...(record.beforeState !== undefined ? { beforeState: record.beforeState } : {}),
      ...(record.afterState !== undefined ? { afterState: record.afterState } : {}),
      ...(record.error ? { error: record.error } : {}),
    })
    process.stderr.write(`[EZITYHUB_MCP_AUDIT] ${line}\n`)
  }

  log(record: WriteAuditRecord): void {
    // Sanity-check: never allow raw tokens in audit record
    const sanitized: WriteAuditRecord = {
      ...record,
      error: record.error
        ? record.error.replace(/ez_agt_[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
        : undefined,
    }
    this.logSink(sanitized)
  }
}

export const auditLogger = new AuditLogger()
