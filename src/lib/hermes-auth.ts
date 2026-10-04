export interface AuthStatus {
  authenticated: boolean
  authRequired: boolean
  error?: string
}

export const AUTH_STORAGE_KEY = 'hermes-auth-token'

export function getStoredAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch {}
}

export async function fetchHermesAuthStatus(
  timeoutMs = 5_000,
): Promise<AuthStatus> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)

  const headers: Record<string, string> = {}
  const token = getStoredAuthToken()
  if (token) {
    headers['x-hermes-auth'] = token
    headers['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch('/api/auth-check', {
      headers,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out after 5 seconds')
    }

    throw error instanceof Error
      ? error
      : new Error('Failed to connect to Hermes Agent')
  } finally {
    globalThis.clearTimeout(timeout)
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  return (await res.json()) as AuthStatus
}
