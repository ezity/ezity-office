export type AntigravityMode = 'plan' | 'code'

export interface AntigravityBridgeResult {
  ok: boolean
  mode?: AntigravityMode
  output?: string
  error?: string
  exitCode?: number
}

const DEFAULT_BRIDGE_URL = 'http://antigravity-bridge:8787'
const BRIDGE_TIMEOUT_MS = 670_000

export function getAntigravityBridgeConfig(): { url: string; token: string } | null {
  const token = process.env.ANTIGRAVITY_BRIDGE_TOKEN?.trim()
  if (!token) return null
  return {
    url: (process.env.ANTIGRAVITY_BRIDGE_URL?.trim() || DEFAULT_BRIDGE_URL).replace(/\/$/, ''),
    token,
  }
}

export async function dispatchAntigravity(
  mode: AntigravityMode,
  prompt: string,
): Promise<AntigravityBridgeResult> {
  const config = getAntigravityBridgeConfig()
  if (!config) return { ok: false, error: 'Antigravity bridge is not configured' }

  const response = await fetch(`${config.url}/v1/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bridge-Token': config.token,
    },
    body: JSON.stringify({ mode, prompt }),
    signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
  })
  const payload = (await response.json().catch(() => ({}))) as AntigravityBridgeResult
  if (!response.ok && !payload.error) {
    return { ok: false, error: `Bridge request failed with HTTP ${response.status}` }
  }
  return payload
}
