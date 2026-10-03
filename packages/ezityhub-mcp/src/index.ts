#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig, maskToken } from './config.js'
import { EzityHubClient } from './client.js'
import { registerFinanceTools } from './tools/index.js'

async function main() {
  const config = loadConfig()

  // Print startup status to stderr so stdio JSON-RPC stream is untouched
  process.stderr.write(
    `[ezityhub-mcp] Starting EzityHub Read-Only Finance MCP Adapter\n`,
  )
  process.stderr.write(`[ezityhub-mcp] Target API: ${config.apiUrl}\n`)
  process.stderr.write(`[ezityhub-mcp] Token: ${maskToken(config.apiToken)}\n`)
  process.stderr.write(`[ezityhub-mcp] Mode: Strict Read-Only\n`)

  const client = new EzityHubClient(config)

  const server = new McpServer({
    name: 'ezityhub-finance',
    version: '1.0.0',
  })

  registerFinanceTools(server, client)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(
    `[ezityhub-mcp] Connected to stdio transport. Awaiting tool calls...\n`,
  )
}

main().catch((err) => {
  process.stderr.write(
    `[ezityhub-mcp] Fatal error: ${err instanceof Error ? err.stack : String(err)}\n`,
  )
  process.exit(1)
})
