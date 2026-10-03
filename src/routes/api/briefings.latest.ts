import { createFileRoute } from '@tanstack/react-router'
import { getLatestDailyBriefing } from '../../server/daily-brief-store'
import { generateDailyBrief } from '../../server/daily-brief-service'

export const Route = createFileRoute('/api/briefings/latest')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const autoGenerate = url.searchParams.get('autoGenerate') === 'true'

        let briefing = getLatestDailyBriefing()

        if (!briefing && autoGenerate) {
          try {
            briefing = await generateDailyBrief({ isManual: false })
          } catch {
            // Soft fail
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            briefing: briefing || null,
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
