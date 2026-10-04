import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import { isAuthenticated, isPasswordProtectionEnabled } from '../../server/auth-middleware'
import { dispatchAntigravity } from '../../server/antigravity-bridge'
import { getClientIp, rateLimit, rateLimitResponse, requireJsonContentType } from '../../server/rate-limit'

const DispatchSchema = z.object({
  mode: z.enum(['plan', 'code']),
  prompt: z.string().trim().min(1).max(32_000),
})

export const Route = createFileRoute('/api/antigravity-dispatch')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Dispatch can modify a repository, so this endpoint deliberately fails closed.
        if (!isPasswordProtectionEnabled()) {
          return json({ ok: false, error: 'Password authentication must be configured' }, { status: 503 })
        }
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        if (!rateLimit(`antigravity-dispatch:${getClientIp(request)}`, 3, 60_000)) {
          return rateLimitResponse()
        }
        const parsed = DispatchSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
          return json({ ok: false, error: 'mode and non-empty prompt are required' }, { status: 400 })
        }
        try {
          const result = await dispatchAntigravity(parsed.data.mode, parsed.data.prompt)
          return json(result, { status: result.ok ? 200 : 502 })
        } catch (error) {
          const message = error instanceof Error && error.name === 'TimeoutError'
            ? 'Antigravity bridge timed out'
            : 'Antigravity bridge is unavailable'
          return json({ ok: false, error: message }, { status: 503 })
        }
      },
    },
  },
})
