import dotenv from 'dotenv'
import type { EzityHubConfig } from './types.js'

// Load .env if present in development
dotenv.config()

export function maskToken(token: string | undefined): string {
  if (!token) return '[NOT_SET]'
  if (token.length <= 10) return '***'
  return `${token.slice(0, 7)}...${token.slice(-4)}`
}

export function loadConfig(): EzityHubConfig {
  let apiUrl = (
    process.env.EZITYHUB_API_URL || 'http://localhost:3000'
  ).replace(/\/+$/, '')
  apiUrl = apiUrl.replace(/\/api\/v1$/, '')
  const apiToken = process.env.EZITYHUB_API_TOKEN || ''
  const timeoutMs = parseInt(process.env.EZITYHUB_TIMEOUT_MS || '15000', 10)

  return {
    apiUrl,
    apiToken,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
  }
}
