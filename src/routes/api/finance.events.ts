import { createFileRoute } from '@tanstack/react-router'
import {
  correlateFinanceDraft,
  getBridgeStatus,
} from '../../server/finance-event-bridge'
import {
  listFinanceDrafts,
  listRecentFinancialEvents,
} from '../../server/finance-event-store'

export const Route = createFileRoute('/api/finance/events')({
  server: {
    handlers: {
      GET: async () => {
        const bridge = getBridgeStatus()
        const drafts = listFinanceDrafts()
        const events = listRecentFinancialEvents(50)

        return new Response(
          JSON.stringify({
            success: true,
            bridge,
            drafts,
            events,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store',
            },
          },
        )
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as any
          if (!body?.recordId) {
            return new Response(
              JSON.stringify({ error: 'Missing recordId in request body' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const draft = correlateFinanceDraft({
            recordId: body.recordId,
            type: body.type || 'journal',
            entryNumber: body.entryNumber,
            description: body.description,
            amount: body.amount,
            sessionKey: body.sessionKey,
            workflowState: body.workflowState || 'Pending Approval',
            idempotencyKey: body.idempotencyKey,
          })

          return new Response(JSON.stringify({ success: true, draft }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err.message || 'Invalid request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
