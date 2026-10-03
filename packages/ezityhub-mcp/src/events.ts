import type {
  CorrelatedFinancialLifecycleEvent,
  EzityHubConnectedData,
  EzityHubEventNotification,
  EzityHubJournalResolvedData,
  EzityHubJournalSubmittedData,
  WorkflowState,
} from './types.js'

export interface EventSubscriberOptions {
  apiUrl: string
  apiToken: string
  expectedOrgId?: string
  lastEventId?: string
  initialProcessedIds?: Iterable<string>
  fetchFn?: typeof fetch
  initialRetryDelayMs?: number
  maxRetryDelayMs?: number
  heartbeatTimeoutMs?: number
  maxRetentionIds?: number
  onEvent?: (event: CorrelatedFinancialLifecycleEvent) => void | Promise<void>
  onRawEvent?: (event: EzityHubEventNotification) => void | Promise<void>
  onConnected?: (info: EzityHubConnectedData) => void
  onError?: (err: Error) => void
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void
}

export class EzityHubEventSubscriber {
  private apiUrl: string
  private apiToken: string
  private expectedOrgId?: string
  private lastEventId: string | null = null
  private processedIds: Set<string> = new Set()
  private maxRetentionIds: number
  private fetchFn: typeof fetch

  private initialRetryDelayMs: number
  private maxRetryDelayMs: number
  private heartbeatTimeoutMs: number

  private onEvent?: (event: CorrelatedFinancialLifecycleEvent) => void | Promise<void>
  private onRawEvent?: (event: EzityHubEventNotification) => void | Promise<void>
  private onConnected?: (info: EzityHubConnectedData) => void
  private onError?: (err: Error) => void
  private onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void

  private running = false
  private currentAbortController: AbortController | null = null
  private retryAttempt = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private currentOrgId: string | null = null

  constructor(options: EventSubscriberOptions) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, '')
    this.apiToken = options.apiToken
    this.expectedOrgId = options.expectedOrgId
    this.lastEventId = options.lastEventId || null
    this.maxRetentionIds = options.maxRetentionIds ?? 1000
    this.fetchFn = options.fetchFn || fetch

    this.initialRetryDelayMs = options.initialRetryDelayMs ?? 1000
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 30000
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 45000

    this.onEvent = options.onEvent
    this.onRawEvent = options.onRawEvent
    this.onConnected = options.onConnected
    this.onError = options.onError
    this.onStatusChange = options.onStatusChange

    if (options.initialProcessedIds) {
      for (const id of options.initialProcessedIds) {
        this.addProcessedId(id)
      }
    }
  }

  public isRunning(): boolean {
    return this.running
  }

  public getLastEventId(): string | null {
    return this.lastEventId
  }

  public getProcessedIds(): string[] {
    return Array.from(this.processedIds)
  }

  public hasProcessed(id: string): boolean {
    return this.processedIds.has(id)
  }

  public getConnectedOrgId(): string | null {
    return this.currentOrgId
  }

  private addProcessedId(id: string): void {
    if (this.processedIds.size >= this.maxRetentionIds) {
      // Evict oldest entries to keep retention bounded
      const it = this.processedIds.values()
      const oldest = it.next().value
      if (oldest !== undefined) {
        this.processedIds.delete(oldest)
      }
    }
    this.processedIds.add(id)
  }

  public start(): void {
    if (this.running) return
    this.running = true
    this.retryAttempt = 0
    this.connect()
  }

  public stop(): void {
    this.running = false
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.currentAbortController) {
      this.currentAbortController.abort()
      this.currentAbortController = null
    }
    this.onStatusChange?.('disconnected')
  }

  private resetHeartbeatWatchdog(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer)
    if (!this.running) return

    this.heartbeatTimer = setTimeout(() => {
      // Heartbeat timed out — server dropped or silently hung
      this.handleConnectionDrop(new Error(`Heartbeat timeout: no data or keepalive received for ${this.heartbeatTimeoutMs}ms`))
    }, this.heartbeatTimeoutMs)
  }

  private async connect(): Promise<void> {
    if (!this.running) return

    this.onStatusChange?.(this.retryAttempt === 0 ? 'connecting' : 'reconnecting')

    const controller = new AbortController()
    this.currentAbortController = controller

    try {
      const url = new URL(`${this.apiUrl}/api/v1/agent/events`)
      if (this.lastEventId) {
        url.searchParams.set('since_id', this.lastEventId)
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId
      }

      const res = await this.fetchFn(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`EzityHub event stream failed with status ${res.status}: ${text}`)
      }

      if (!res.body) {
        throw new Error('EzityHub event stream response has no readable body')
      }

      // Connection opened successfully
      this.retryAttempt = 0
      this.onStatusChange?.('connected')
      this.resetHeartbeatWatchdog()

      await this.readStream(res.body)

      // If stream ended normally by server, treat as connection drop and reconnect
      if (this.running && !controller.signal.aborted) {
        this.handleConnectionDrop(
          new Error('EzityHub event stream ended by remote server'),
        )
      }
    } catch (err: any) {
      if (!this.running || controller.signal.aborted) {
        return
      }
      this.handleConnectionDrop(err)
    }
  }

  private handleConnectionDrop(err: any): void {
    if (!this.running) return

    if (this.currentAbortController) {
      this.currentAbortController.abort()
      this.currentAbortController = null
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.onError?.(err instanceof Error ? err : new Error(String(err)))

    // Exponential backoff with jitter
    const delay = Math.min(
      this.initialRetryDelayMs * Math.pow(2, this.retryAttempt),
      this.maxRetryDelayMs,
    )
    const jitter = Math.floor(delay * 0.1 * (Math.random() * 2 - 1))
    const minDelay = Math.min(this.initialRetryDelayMs, 200)
    const finalDelay = Math.max(minDelay, delay + jitter)

    this.retryAttempt++
    this.onStatusChange?.('reconnecting')

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, finalDelay)
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (this.running) {
        const { value, done } = await reader.read()
        if (done) break

        this.resetHeartbeatWatchdog()

        buffer += decoder.decode(value, { stream: true })
        let boundary: number
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const rawBlock = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          this.parseAndDispatchBlock(rawBlock)
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private parseAndDispatchBlock(rawBlock: string): void {
    const lines = rawBlock.split('\n')
    let eventType: string = 'message'
    let eventId: string | null = null
    let dataBuffer = ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      // Comment / Keep-alive
      if (line.startsWith(':')) {
        this.resetHeartbeatWatchdog()
        continue
      }

      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim()
      } else if (line.startsWith('id:')) {
        eventId = line.slice(3).trim()
      } else if (line.startsWith('data:')) {
        const val = line.slice(5).trim()
        dataBuffer += (dataBuffer ? '\n' : '') + val
      }
    }

    if (!dataBuffer && !eventType) return

    let parsedData: any = null
    try {
      parsedData = dataBuffer ? JSON.parse(dataBuffer) : {}
    } catch {
      // Malformed JSON data block
      this.onError?.(new Error(`Malformed SSE data block received: ${dataBuffer}`))
      return
    }

    // 1. Connection Handshake
    if (eventType === 'connected') {
      const connectedData = parsedData as EzityHubConnectedData
      const orgId = connectedData.agent?.organization_id
      this.currentOrgId = orgId || null

      if (this.expectedOrgId && orgId && this.expectedOrgId !== orgId) {
        const err = new Error(
          `Cross-tenant violation: connected organization ${orgId} does not match expected organization ${this.expectedOrgId}`,
        )
        this.onError?.(err)
        this.stop()
        return
      }

      this.onConnected?.(connectedData)
      return
    }

    // 2. Event notification
    // Check if notification ID exists
    const notificationId = eventId || parsedData.id
    if (!notificationId) {
      // Malformed event without identifier
      this.onError?.(new Error(`Received event without ID: event=${eventType}`))
      return
    }

    // Deduplication check
    if (this.hasProcessed(notificationId)) {
      // Duplicate event suppressed
      return
    }

    // Tenant boundary validation
    const eventOrgId = parsedData.organization_id || parsedData.data?.organization_id
    if (this.expectedOrgId && eventOrgId && eventOrgId !== this.expectedOrgId) {
      // Cross-tenant event rejected
      this.onError?.(
        new Error(`Cross-tenant event rejected: event ${notificationId} belongs to org ${eventOrgId}, expected ${this.expectedOrgId}`),
      )
      return
    }

    // Track processed ID and last event ID
    this.addProcessedId(notificationId)
    this.lastEventId = notificationId

    const notification: EzityHubEventNotification = {
      id: notificationId,
      event_id: parsedData.event_id,
      event_type: eventType,
      category: parsedData.category,
      title: parsedData.title,
      subtitle: parsedData.subtitle,
      link: parsedData.link,
      source_document_id: parsedData.source_document_id,
      created_at: parsedData.created_at || new Date().toISOString(),
      read_at: parsedData.read_at,
      organization_id: eventOrgId,
      data: parsedData.data || {},
    }

    this.onRawEvent?.(notification)

    // Authoritative Financial Lifecycle Correlation
    const correlated = this.correlateFinancialEvent(notification)
    if (correlated) {
      this.onEvent?.(correlated)
    }
  }

  private correlateFinancialEvent(
    notification: EzityHubEventNotification,
  ): CorrelatedFinancialLifecycleEvent | null {
    const { event_type, data, created_at, source_document_id, id, organization_id } = notification

    if (event_type === 'accounting.journal.submitted.v1') {
      const payload = data as EzityHubJournalSubmittedData
      const journalId = payload.journal_id || source_document_id
      if (!journalId) return null

      return {
        eventId: id,
        eventType: event_type,
        recordId: journalId,
        workflowState: 'Pending Approval' as WorkflowState,
        actor: payload.submitted_by,
        timestamp: created_at,
        organizationId: organization_id,
        correlationId: notification.event_id || journalId,
        rawEvent: notification,
      }
    }

    if (event_type === 'accounting.journal.resolved.v1') {
      const payload = data as EzityHubJournalResolvedData
      const journalId = payload.journal_id || source_document_id
      if (!journalId) return null

      const isApproved = payload.decision === 'approved' || payload.state === 'posted'
      const workflowState: WorkflowState = isApproved ? 'Posted' : 'Rejected'

      return {
        eventId: id,
        eventType: event_type,
        recordId: journalId,
        workflowState,
        actor: payload.decided_by,
        reason: payload.reason || null,
        timestamp: payload.decided_at || created_at,
        organizationId: organization_id,
        correlationId: notification.event_id || journalId,
        rawEvent: notification,
      }
    }

    return null
  }
}
