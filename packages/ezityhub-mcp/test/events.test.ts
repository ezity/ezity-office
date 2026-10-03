import { describe, it, expect, vi } from 'vitest'
import { EzityHubEventSubscriber } from '../src/events.js'
import type { CorrelatedFinancialLifecycleEvent, EzityHubConnectedData } from '../src/types.js'

function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe('EzityHubEventSubscriber', () => {
  it('handles SSE connection and handshake (Requirement 14.A)', async () => {
    const handshakeData: EzityHubConnectedData = {
      status: 'connected',
      agent: {
        membership_id: 'mem-123',
        name: 'Ezity Accountant',
        organization_id: 'org-456',
      },
      server_time: '2026-10-03T10:00:00Z',
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `: keep-alive\n\n`,
        `event: connected\ndata: ${JSON.stringify(handshakeData)}\n\n`,
      ]),
    })

    let connectedInfo: EzityHubConnectedData | null = null
    let statusHistory: string[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onConnected: (info) => {
        connectedInfo = info
      },
      onStatusChange: (status) => {
        statusHistory.push(status)
      },
    })

    subscriber.start()

    // Wait a tick for stream processing
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('https://hub.ezity.my/api/v1/agent/events')
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
    expect(mockFetch.mock.calls[0][1].headers.Accept).toBe('text/event-stream')
    expect(connectedInfo).toEqual(handshakeData)
    expect(subscriber.getConnectedOrgId()).toBe('org-456')
  })

  it('processes valid accounting.journal.submitted.v1 events (Requirement 14.B)', async () => {
    const journalEvent = {
      id: 'notif-001',
      event_id: 'outbox-001',
      event_type: 'accounting.journal.submitted.v1',
      created_at: '2026-10-03T10:05:00Z',
      data: {
        journal_id: 'jrn-123',
        entry_number: 'JRN-2026-001',
        status: 'draft',
        submitted_by: 'user-supervisor-1',
      },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-001\nevent: accounting.journal.submitted.v1\ndata: ${JSON.stringify(journalEvent)}\n\n`,
      ]),
    })

    const events: CorrelatedFinancialLifecycleEvent[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onEvent: (evt) => {
        events.push(evt)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(events.length).toBe(1)
    expect(events[0].recordId).toBe('jrn-123')
    expect(events[0].workflowState).toBe('Pending Approval')
    expect(events[0].actor).toBe('user-supervisor-1')
    expect(subscriber.getLastEventId()).toBe('notif-001')
  })

  it('processes posted journal events when approved (Requirement 14.G)', async () => {
    const journalResolved = {
      id: 'notif-002',
      event_id: 'outbox-002',
      event_type: 'accounting.journal.resolved.v1',
      created_at: '2026-10-03T10:10:00Z',
      data: {
        journal_id: 'jrn-123',
        state: 'posted',
        decision: 'approved',
        reason: 'Verified against bank transaction RM89',
        decided_at: '2026-10-03T10:10:00Z',
        decided_by: 'supervisor-azman',
      },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-002\nevent: accounting.journal.resolved.v1\ndata: ${JSON.stringify(journalResolved)}\n\n`,
      ]),
    })

    const events: CorrelatedFinancialLifecycleEvent[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onEvent: (evt) => {
        events.push(evt)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(events.length).toBe(1)
    expect(events[0].recordId).toBe('jrn-123')
    expect(events[0].workflowState).toBe('Posted')
    expect(events[0].actor).toBe('supervisor-azman')
    expect(events[0].reason).toBe('Verified against bank transaction RM89')
  })

  it('processes rejected journal events with supervisor reason (Requirement 14.F)', async () => {
    const journalRejected = {
      id: 'notif-003',
      event_id: 'outbox-003',
      event_type: 'accounting.journal.resolved.v1',
      created_at: '2026-10-03T10:12:00Z',
      data: {
        journal_id: 'jrn-456',
        state: 'rejected',
        decision: 'rejected',
        reason: 'Incorrect expense account — should be 5210 Cloud Hosting',
        decided_at: '2026-10-03T10:12:00Z',
        decided_by: 'supervisor-azman',
      },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-003\nevent: accounting.journal.resolved.v1\ndata: ${JSON.stringify(journalRejected)}\n\n`,
      ]),
    })

    const events: CorrelatedFinancialLifecycleEvent[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onEvent: (evt) => {
        events.push(evt)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(events.length).toBe(1)
    expect(events[0].recordId).toBe('jrn-456')
    expect(events[0].workflowState).toBe('Rejected')
    expect(events[0].actor).toBe('supervisor-azman')
    expect(events[0].reason).toBe('Incorrect expense account — should be 5210 Cloud Hosting')
  })

  it('suppresses duplicate events by event ID (Requirement 14.E)', async () => {
    const journalEvent = {
      id: 'notif-duplicate-1',
      event_type: 'accounting.journal.submitted.v1',
      data: { journal_id: 'jrn-999', submitted_by: 'acc-1' },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-duplicate-1\nevent: accounting.journal.submitted.v1\ndata: ${JSON.stringify(journalEvent)}\n\n`,
        `id: notif-duplicate-1\nevent: accounting.journal.submitted.v1\ndata: ${JSON.stringify(journalEvent)}\n\n`,
      ]),
    })

    const events: CorrelatedFinancialLifecycleEvent[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onEvent: (evt) => {
        events.push(evt)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    // Must be suppressed to exactly 1
    expect(events.length).toBe(1)
  })

  it('sends Last-Event-ID header and since_id query parameter on reconnect (Requirement 14.D)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([`: keep-alive\n\n`]),
    })

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      lastEventId: 'prev-notif-777',
      fetchFn: mockFetch as any,
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callUrl = new URL(mockFetch.mock.calls[0][0])
    expect(callUrl.searchParams.get('since_id')).toBe('prev-notif-777')
    expect(mockFetch.mock.calls[0][1].headers['Last-Event-ID']).toBe('prev-notif-777')
  })

  it('rejects cross-tenant events and mismatches (Requirement 14.I)', async () => {
    const foreignEvent = {
      id: 'notif-foreign',
      organization_id: 'foreign-tenant-xyz',
      event_type: 'accounting.journal.resolved.v1',
      data: { journal_id: 'jrn-leaked', state: 'posted', decision: 'approved' },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-foreign\nevent: accounting.journal.resolved.v1\ndata: ${JSON.stringify(foreignEvent)}\n\n`,
      ]),
    })

    const events: CorrelatedFinancialLifecycleEvent[] = []
    const errors: Error[] = []

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      expectedOrgId: 'my-org-123',
      fetchFn: mockFetch as any,
      onEvent: (evt) => {
        events.push(evt)
      },
      onError: (err) => {
        errors.push(err)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    // Must NOT process the foreign event
    expect(events.length).toBe(0)
    expect(errors.some((e) => e.message.includes('Cross-tenant'))).toBe(true)
  })

  it('safely handles malformed SSE blocks without crashing (Requirement 14.J)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockReadableStream([
        `id: notif-bad\nevent: accounting.journal.resolved.v1\ndata: { INVALID JSON\n\n`,
      ]),
    })

    const errors: Error[] = []
    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      fetchFn: mockFetch as any,
      onError: (err) => {
        errors.push(err)
      },
    })

    subscriber.start()
    await new Promise((r) => setTimeout(r, 50))
    subscriber.stop()

    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0].message).toContain('Malformed SSE')
  })

  it('reconnects with exponential backoff on stream termination (Requirement 14.C)', async () => {
    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        // First connection closes immediately
        return {
          ok: true,
          status: 200,
          body: createMockReadableStream([': initial\n\n']),
        }
      }
      return {
        ok: true,
        status: 200,
        body: createMockReadableStream([': reconnected\n\n']),
      }
    })

    const subscriber = new EzityHubEventSubscriber({
      apiUrl: 'https://hub.ezity.my',
      apiToken: 'test-token',
      initialRetryDelayMs: 20, // fast retry for test
      fetchFn: mockFetch as any,
    })

    subscriber.start()
    // Wait enough for first stream to close and reconnect to trigger
    await new Promise((r) => setTimeout(r, 100))
    subscriber.stop()

    expect(callCount).toBeGreaterThanOrEqual(2)
  })
})
