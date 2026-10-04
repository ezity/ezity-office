import { createFileRoute } from '@tanstack/react-router'
import { BEARER_TOKEN, HERMES_API } from '../../../server/gateway-capabilities'
import { isAuthenticated } from '../../../server/auth-middleware'

async function proxyRequest(request: Request, splat: string) {
  const incomingUrl = new URL(request.url)
  const splatPath = splat || incomingUrl.pathname.replace(/^\/api\/hermes-proxy\/?/, '')
  const targetPath = splatPath.startsWith('/') ? splatPath : `/${splatPath}`
  const targetUrl = new URL(`${HERMES_API}${targetPath}`)
  targetUrl.search = incomingUrl.search

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')

  if (BEARER_TOKEN && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${BEARER_TOKEN}`)
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    init.body = await request.text()
  }

  const upstream = await fetch(targetUrl, init)
  if (upstream.status === 404 && targetPath.includes('available-models')) {
    return new Response(
      JSON.stringify({
        provider: 'hermes',
        models: [],
        providers: [],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
  const body = await upstream.text()
  const responseHeaders = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) responseHeaders.set('content-type', contentType)
  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export const Route = createFileRoute('/api/hermes-proxy/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          )
        }
        return proxyRequest(request, params._splat || '')
      },
      POST: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          )
        }
        return proxyRequest(request, params._splat || '')
      },
      PATCH: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          )
        }
        return proxyRequest(request, params._splat || '')
      },
      DELETE: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Unauthorized' }),
            { status: 401, headers: { 'content-type': 'application/json' } },
          )
        }
        return proxyRequest(request, params._splat || '')
      },
    },
  },
})
