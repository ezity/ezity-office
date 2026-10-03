import { createFileRoute } from '@tanstack/react-router'
import { getDailyBriefing } from '../../server/daily-brief-store'

export const Route = createFileRoute('/api/briefings/$briefingId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { briefingId } = params
        const briefing = getDailyBriefing(briefingId)

        if (!briefing) {
          return new Response(JSON.stringify({ error: 'Briefing not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({
            success: true,
            briefing,
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
    },
  },
})
