import type { AuditRecord } from './types.js'

export class AuditLogger {
  private logSink: (record: AuditRecord) => void

  constructor(sink?: (record: AuditRecord) => void) {
    this.logSink = sink || this.defaultSink
  }

  private defaultSink(record: AuditRecord): void {
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
      ...(record.error ? { error: record.error } : {}),
    })
    process.stderr.write(`[EZITYHUB_MCP_AUDIT] ${line}\n`)
  }

  log(record: AuditRecord): void {
    // Sanity-check: never allow raw tokens in audit record
    const sanitized: AuditRecord = {
      ...record,
      error: record.error
        ? record.error.replace(/ez_agt_[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
        : undefined,
    }
    this.logSink(sanitized)
  }
}

export const auditLogger = new AuditLogger()
