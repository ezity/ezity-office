import { createFileRoute } from '@tanstack/react-router'
import {
  getDailyBriefSettings,
  listDailyBriefings,
  updateDailyBriefSettings,
} from '../../server/daily-brief-store'
import { generateDailyBrief, syncHermesDailyBriefJob } from '../../server/daily-brief-service'

export const Route = createFileRoute('/api/briefings')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const limit = Number(url.searchParams.get('limit') || 20)

        const briefings = listDailyBriefings(limit)
        const settings = getDailyBriefSettings()

        return new Response(
          JSON.stringify({
            success: true,
            briefings,
            settings,
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
          const body = (await request.json().catch(() => ({}))) as {
            isManual?: boolean
            force?: boolean
            timezone?: string
            syncHermes?: boolean
            settings?: {
              enabled?: boolean
              hour?: number
              minute?: number
              timezone?: string
            }
          }

          // If settings update requested
          if (body?.settings) {
            updateDailyBriefSettings(body.settings)
          }

          if (body?.syncHermes) {
            await syncHermesDailyBriefJob()
          }

          const briefing = await generateDailyBrief({
            isManual: body?.isManual ?? true,
            force: body?.force ?? false,
            timezone: body?.timezone,
          })

          return new Response(
            JSON.stringify({
              success: true,
              briefing,
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
