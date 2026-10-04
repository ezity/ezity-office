import { randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getRedisClient, getRedisClientSync } from './redis-client'

const TOKENS_KEY = 'hermes:studio:tokens'
const TOKEN_USER_KEY = 'hermes:studio:token:user'
const TOKEN_TTL_S = 30 * 24 * 60 * 60 // 30 days

const DATA_DIR = join(process.cwd(), '.runtime')
const TOKENS_FILE = join(DATA_DIR, 'auth-tokens.json')

/**
 * In-memory session store — source of truth for the current process.
 * Backed by disk (.runtime/auth-tokens.json) and Redis SET when REDIS_URL is set so tokens survive restarts.
 */
const validTokens = new Set<string>()

/**
 * Map of token -> userId for user identity tracking.
 */
const tokenToUserId = new Map<string, string>()

function loadTokensFromDisk(): void {
  try {
    if (existsSync(TOKENS_FILE)) {
      const raw = readFileSync(TOKENS_FILE, 'utf-8')
      const data = JSON.parse(raw) as {
        tokens?: Array<{ token: string; expiresAt?: number; userId?: string }>
      }
      const now = Date.now()
      if (Array.isArray(data?.tokens)) {
        for (const item of data.tokens) {
          if (!item.expiresAt || item.expiresAt > now) {
            validTokens.add(item.token)
            if (item.userId) tokenToUserId.set(item.token, item.userId)
          }
        }
      }
    }
  } catch {}
}

loadTokensFromDisk()

function saveTokensToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    const now = Date.now()
    const tokens = Array.from(validTokens).map((token) => ({
      token,
      userId: tokenToUserId.get(token),
      expiresAt: now + TOKEN_TTL_S * 1000,
    }))
    writeFileSync(TOKENS_FILE, JSON.stringify({ tokens }, null, 2), 'utf-8')
  } catch {}
}

// On startup load persisted tokens from Redis into the in-memory Set
void getRedisClient().then(async (client) => {
  if (!client) return
  try {
    const tokens = await client.smembers(TOKENS_KEY)
    for (const t of tokens) validTokens.add(t)
    const userMappings = await client.hgetall(TOKEN_USER_KEY)
    for (const [token, userId] of Object.entries(userMappings)) {
      tokenToUserId.set(token, userId)
    }
    if (tokens.length > 0) {
      console.log(`[auth] Loaded ${tokens.length} session token(s) from Redis`)
    }
  } catch {
    // Redis unavailable — in-memory store continues
  }
})

/**
 * Generate a cryptographically secure session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Store a session token as valid, optionally associated with a user.
 */
export function storeSessionToken(token: string, userId?: string): void {
  validTokens.add(token)
  if (userId) {
    tokenToUserId.set(token, userId)
  }
  saveTokensToDisk()
  const client = getRedisClientSync()
  if (client) {
    void client
      .sadd(TOKENS_KEY, token)
      .then(() => client.expire(TOKENS_KEY, TOKEN_TTL_S))
    if (userId) {
      void client.hset(TOKEN_USER_KEY, token, userId)
    }
  }
}

/**
 * Check if a session token is valid.
 */
export function isValidSessionToken(token: string): boolean {
  return validTokens.has(token)
}

/**
 * Get the user ID associated with a token, if any.
 */
export function getUserIdFromToken(token: string): string | undefined {
  return tokenToUserId.get(token)
}

/**
 * Remove a session token (logout).
 */
export function revokeSessionToken(token: string): void {
  validTokens.delete(token)
  tokenToUserId.delete(token)
  saveTokensToDisk()
  const client = getRedisClientSync()
  if (client) {
    void client.srem(TOKENS_KEY, token)
    void client.hdel(TOKEN_USER_KEY, token)
  }
}

/**
 * Check if password protection is enabled.
 */
export function isPasswordProtectionEnabled(): boolean {
  return Boolean(
    process.env.HERMES_PASSWORD && process.env.HERMES_PASSWORD.length > 0,
  )
}

/**
 * Verify password using timing-safe comparison.
 */
export function verifyPassword(password: string): boolean {
  const configured = process.env.HERMES_PASSWORD
  if (!configured || configured.length === 0) {
    return false
  }

  // Timing-safe comparison
  const passwordBuf = Buffer.from(password, 'utf8')
  const configuredBuf = Buffer.from(configured, 'utf8')

  // If lengths differ, still do a comparison to avoid timing leak
  if (passwordBuf.length !== configuredBuf.length) {
    return false
  }

  try {
    return timingSafeEqual(passwordBuf, configuredBuf)
  } catch {
    return false
  }
}

/**
 * Extract session token from cookie header.
 */
export function getSessionTokenFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    if (cookie.startsWith('hermes-auth=')) {
      return cookie.substring('hermes-auth='.length)
    }
  }
  return null
}

/**
 * Extract session token from request across cookies, custom header, or Bearer auth.
 */
export function extractAuthToken(request: Request): string | null {
  // 1. Check Cookie header
  const cookieHeader = request.headers.get('cookie')
  const cookieToken = getSessionTokenFromCookie(cookieHeader)
  if (cookieToken) return cookieToken

  // 2. Check x-hermes-auth custom header (from client localStorage)
  const customHeader = request.headers.get('x-hermes-auth')
  if (customHeader) return customHeader.trim()

  // 3. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  return null
}

function isLocalRequest(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || '127.0.0.1'
  const localIPs = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']
  if (localIPs.includes(ip)) return true
  // Allow Tailscale (100.x.x.x) and private LAN ranges
  if (/^100\.\d+\.\d+\.\d+$/.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^10\./.test(ip)) return true
  return false
}

/**
 * Check if the request is authenticated.
 * Returns true if:
 * - Password protection is disabled, OR
 * - Request has a valid session token (via cookie, x-hermes-auth, or bearer token)
 */
export function isAuthenticated(request: Request): boolean {
  // No password configured? No auth needed
  if (!isPasswordProtectionEnabled()) {
    return true
  }

  const token = extractAuthToken(request)
  if (!token) {
    return false
  }

  return isValidSessionToken(token)
}

export function requireLocalOrAuth(request: Request): boolean {
  if (!isPasswordProtectionEnabled()) {
    return isLocalRequest(request)
  }

  return isAuthenticated(request)
}

/**
 * Extract user ID from request.
 * First checks session token mapping, then falls back to HERMES_USER_ID environment variable.
 */
export function getUserIdFromRequest(request: Request): string | undefined {
  const token = extractAuthToken(request)
  if (token) {
    const userId = getUserIdFromToken(token)
    if (userId) return userId
  }

  // Fallback for testing/single-user deployments
  return process.env.HERMES_USER_ID
}

/**
 * Create a Set-Cookie header for the session token.
 * Defaults to 30 days when rememberMe is true, or session cookie when false.
 * Uses SameSite=Lax for reliable auto-login across navigations.
 */
export function createSessionCookie(token: string, rememberMe = true): string {
  const maxAge = rememberMe ? `; Max-Age=${TOKEN_TTL_S}` : ''
  return `hermes-auth=${token}; HttpOnly; SameSite=Strict; Path=/${maxAge}`
}
