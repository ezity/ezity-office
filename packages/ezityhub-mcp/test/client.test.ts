import { describe, it, expect, vi } from 'vitest'
import { EzityHubClient, EzityHubApiError } from '../src/client.js'
import { AuditLogger } from '../src/audit.js'

describe('EzityHubClient', () => {
  const dummyToken = 'ez_agt_live_abcdef1234567890'
  const mockConfig = {
    apiUrl: 'http://test-ezityhub.internal',
    apiToken: dummyToken,
    timeoutMs: 1000,
  }

  it('A. EzityHub API client sends correct Bearer authentication header', async () => {
    let capturedHeaders: HeadersInit | undefined
    const mockFetch = vi
      .fn()
      .mockImplementation(async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers
        return new Response(
          JSON.stringify({
            success: true,
            count: 1,
            bank_accounts: [{ id: 'bank-1' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    const result = await client.listBankAccounts()

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect((capturedHeaders as Record<string, string>)['Authorization']).toBe(
      `Bearer ${dummyToken}`,
    )
  })

  it('D. Authentication failure: missing token fails with AUTH_FAILED before network call', async () => {
    const mockFetch = vi.fn()
    const client = new EzityHubClient(
      { ...mockConfig, apiToken: '' },
      { fetchFn: mockFetch as any },
    )

    await expect(client.listBankAccounts()).rejects.toThrowError(
      EzityHubApiError,
    )
    await expect(client.listBankAccounts()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
      statusCode: 401,
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('D. Authentication failure: HTTP 401 from EzityHub maps to AUTH_FAILED', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid agent token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    await expect(client.listBankAccounts()).rejects.toMatchObject({
      code: 'AUTH_FAILED',
      statusCode: 401,
    })
  })

  it('E. Permission failure: HTTP 403 maps to PERMISSION_DENIED', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Permission denied: agent lacks bank transaction read permission',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    await expect(client.listBankTransactions('bank-123')).rejects.toMatchObject(
      {
        code: 'PERMISSION_DENIED',
        statusCode: 403,
      },
    )
  })

  it('F. Timeout: aborts and returns TIMEOUT when request exceeds limit', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const err = new Error('The operation was aborted')
      err.name = 'AbortError'
      throw err
    })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    await expect(client.listBankAccounts()).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })

  it('G. Empty result: handles empty array/records without failing', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({ success: true, count: 0, transactions: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    const result = await client.listBankTransactions('bank-123')
    expect(result.success).toBe(true)
    expect(result.count).toBe(0)
    expect(result.transactions).toEqual([])
  })

  it('H. Malformed response: handles non-JSON / HTML 500 pages gracefully', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })
    })

    const client = new EzityHubClient(mockConfig, { fetchFn: mockFetch as any })
    await expect(client.listBankAccounts()).rejects.toMatchObject({
      code: 'UNAVAILABLE',
      statusCode: 502,
    })
  })

  it('I. No secret leakage: token does NOT leak into error messages or audit logs', async () => {
    const auditRecords: any[] = []
    const testLogger = new AuditLogger((rec) => auditRecords.push(rec))

    const mockFetch = vi.fn().mockImplementation(async () => {
      // Simulate backend echoing the token back in error message
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid key ez_agt_live_abcdef1234567890 supplied`,
        }),
        { status: 401 },
      )
    })

    const client = new EzityHubClient(mockConfig, {
      logger: testLogger,
      fetchFn: mockFetch as any,
    })

    try {
      await client.listBankAccounts()
    } catch (e) {
      // Expected
    }

    expect(auditRecords.length).toBeGreaterThan(0)
    const lastRecord = auditRecords[0]
    expect(lastRecord.error).not.toContain('ez_agt_live_abcdef1234567890')
    expect(lastRecord.error).toContain('[REDACTED_TOKEN]')
  })
  it("J. URL normalization: does not duplicate /api/v1 when apiUrl already includes /api/v1", async () => {
    let capturedUrl = ""
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url
      return new Response(JSON.stringify({ success: true, count: 0, bank_accounts: [] }), { status: 200 })
    })

    const clientWithApiV1 = new EzityHubClient(
      { apiUrl: "https://erp.ezitysolutions.com/api/v1", apiToken: dummyToken, timeoutMs: 1000 },
      { fetchFn: mockFetch as any }
    )
    await clientWithApiV1.listBankAccounts()
    expect(capturedUrl).toBe("https://erp.ezitysolutions.com/api/v1/finance/bank-accounts")
    expect(capturedUrl).not.toContain("/api/v1/api/v1")
  })

  it("K. URL normalization: handles trailing slash with /api/v1/", async () => {
    let capturedUrl = ""
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url
      return new Response(JSON.stringify({ success: true, count: 0, invoices: [] }), { status: 200 })
    })

    const clientTrailing = new EzityHubClient(
      { apiUrl: "https://erp.ezitysolutions.com/api/v1/", apiToken: dummyToken, timeoutMs: 1000 },
      { fetchFn: mockFetch as any }
    )
    await clientTrailing.listInvoices()
    expect(capturedUrl).toBe("https://erp.ezitysolutions.com/api/v1/finance/invoices")
    expect(capturedUrl).not.toContain("/api/v1/api/v1")
  })
})
