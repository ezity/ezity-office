import { createFileRoute } from '@tanstack/react-router'
import {
  getWorkItemSummary,
  listWorkItems,
  upsertWorkItem,
} from '../../server/task-store'
import type { TaskPriority, TaskSourceType, WorkItemStatus, WorkItemType } from '../../types/task'

export const Route = createFileRoute('/api/work-items')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get('status') as WorkItemStatus | null
        const assignee = url.searchParams.get('assignee') || undefined
        const sourceType = url.searchParams.get('sourceType') as TaskSourceType | null

        const items = listWorkItems({
          status: status || undefined,
          assignee,
          sourceType: sourceType || undefined,
        })
        const summary = getWorkItemSummary()

        return new Response(
          JSON.stringify({
            success: true,
            items,
            summary,
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
          const body = (await request.json()) as {
            id?: string
            title: string
            description?: string
            status?: WorkItemStatus
            priority?: TaskPriority
            assignee?: string | null
            sourceType?: TaskSourceType
            sourceId?: string | null
            sourceSessionKey?: string | null
            metadata?: Record<string, unknown>
            workItemType?: WorkItemType
          }

          if (!body?.title) {
            return new Response(
              JSON.stringify({ error: 'Missing title in request body' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const item = upsertWorkItem({
            id: body.id,
            title: body.title,
            description: body.description,
            status: body.status,
            priority: body.priority,
            assignee: body.assignee,
            sourceType: body.sourceType,
            sourceId: body.sourceId,
            sourceSessionKey: body.sourceSessionKey,
            metadata: body.metadata,
            workItemType: body.workItemType,
          })

          return new Response(JSON.stringify({ success: true, item }), {
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

      PATCH: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            id: string
            title?: string
            description?: string
            status?: WorkItemStatus
            priority?: TaskPriority
            assignee?: string | null
            metadata?: Record<string, unknown>
          }

          if (!body?.id) {
            return new Response(
              JSON.stringify({ error: 'Missing id in request body' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const item = upsertWorkItem({
            id: body.id,
            title: body.title || '',
            description: body.description,
            status: body.status,
            priority: body.priority,
            assignee: body.assignee,
            metadata: body.metadata,
          })

          return new Response(JSON.stringify({ success: true, item }), {
            status: 200,
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
