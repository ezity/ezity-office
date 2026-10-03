import { auditLogger } from './audit.js'
import type {
  CreateInvoiceDraftInput,
  CreateJournalDraftInput,
  ErrorCode,
  EzityHubConfig,
  StructuredErrorResponse,
  WriteAuditRecord,
} from './types.js'
import type { AuditLogger } from './audit.js'

export class EzityHubApiError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode?: number
  public readonly endpoint?: string
  public readonly details?: unknown

  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    endpoint?: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'EzityHubApiError'
    this.code = code
    this.statusCode = statusCode
    this.endpoint = endpoint
    this.details = details
  }

  toStructured(): StructuredErrorResponse {
    return {
      error: true,
      code: this.code,
      message: this.message,
      ...(this.endpoint ? { endpoint: this.endpoint } : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }
}

export class EzityHubClient {
  private config: EzityHubConfig
  private logger: AuditLogger
  private fetchFn: typeof fetch
  private idempotencyCache = new Map<string, any>()

  constructor(
    config: EzityHubConfig,
    options?: { logger?: AuditLogger; fetchFn?: typeof fetch },
  ) {
    this.config = config
    this.logger = options?.logger || auditLogger
    this.fetchFn = options?.fetchFn || fetch
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string
      query?: Record<string, unknown>
      body?: unknown
      toolName: string
      actingAgentId?: string
      agentDefinitionId?: string
      humanApprover?: string
      idempotencyKey?: string
      beforeState?: unknown
      afterState?: unknown
    },
  ): Promise<T> {
    const {
      method = 'GET',
      query,
      body,
      toolName,
      actingAgentId,
      agentDefinitionId,
      humanApprover,
      idempotencyKey,
      beforeState,
      afterState,
    } = options
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const startTime = Date.now()

    // Idempotency check for write operations
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      const cached = this.idempotencyCache.get(idempotencyKey)
      this.logger.log({
        timestamp: new Date().toISOString(),
        requestId,
        toolName,
        endpoint,
        method,
        status: 'success',
        statusCode: 200,
        durationMs: 0,
        actingAgentId,
        agentDefinitionId,
        humanApprover,
        idempotencyKey,
        beforeState,
        afterState: cached,
      })
      return cached as T
    }

    if (!this.config.apiToken) {
      const err = new EzityHubApiError(
        'EzityHub API token is not configured. Set EZITYHUB_API_TOKEN environment variable.',
        'AUTH_FAILED',
        401,
        endpoint,
      )
      this.logger.log({
        timestamp: new Date().toISOString(),
        requestId,
        toolName,
        endpoint,
        method,
        status: 'failure',
        statusCode: 401,
        durationMs: 0,
        actingAgentId,
        agentDefinitionId,
        humanApprover,
        idempotencyKey,
        error: err.message,
      })
      throw err
    }

    const url = new URL(`${this.config.apiUrl}${endpoint}`)
    if (query) {
      for (const [key, val] of Object.entries(query)) {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, String(val))
        }
      }
    }

    const controller = new AbortController()
    const timeoutTimer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    )

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.apiToken}`,
        Accept: 'application/json',
        'User-Agent': 'EzityHub-MCP-Adapter/1.0',
      }
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
      }

      const res = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutTimer)
      const durationMs = Date.now() - startTime

      let json: any = null
      const text = await res.text()
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        json = { raw: text }
      }

      if (!res.ok) {
        let code: ErrorCode = 'INTERNAL_ERROR'
        if (res.status === 401) code = 'AUTH_FAILED'
        else if (res.status === 403) code = 'PERMISSION_DENIED'
        else if (res.status === 404) code = 'NOT_FOUND'
        else if (res.status >= 500) code = 'UNAVAILABLE'
        else if (res.status === 400) code = 'INVALID_FILTER'

        const errMsg =
          json && typeof json === 'object' && json.error
            ? String(json.error)
            : `EzityHub request failed with status ${res.status}`

        this.logger.log({
          timestamp: new Date().toISOString(),
          requestId,
          toolName,
          endpoint,
          method,
          status: 'failure',
          statusCode: res.status,
          durationMs,
          actingAgentId,
          agentDefinitionId,
          humanApprover,
          idempotencyKey,
          error: errMsg,
        })

        throw new EzityHubApiError(errMsg, code, res.status, endpoint, json)
      }

      // Record ID resolution for audit
      const recordId =
        json?.journal?.id ||
        json?.invoice?.id ||
        json?.id ||
        undefined

      this.logger.log({
        timestamp: new Date().toISOString(),
        requestId,
        toolName,
        endpoint,
        method,
        status: 'success',
        statusCode: res.status,
        durationMs,
        actingAgentId,
        agentDefinitionId,
        humanApprover,
        idempotencyKey,
        recordId,
        beforeState,
        afterState: afterState || json,
      })

      if (idempotencyKey) {
        this.idempotencyCache.set(idempotencyKey, json)
      }

      return json as T
    } catch (err: any) {
      clearTimeout(timeoutTimer)
      const durationMs = Date.now() - startTime

      if (err instanceof EzityHubApiError) {
        throw err
      }

      let code: ErrorCode = 'UNAVAILABLE'
      let message = err?.message || 'Unknown network error'

      if (
        err?.name === 'AbortError' ||
        message.includes('aborted') ||
        message.includes('timeout')
      ) {
        code = 'TIMEOUT'
        message = `Request timed out after ${this.config.timeoutMs}ms`
      }

      this.logger.log({
        timestamp: new Date().toISOString(),
        requestId,
        toolName,
        endpoint,
        method,
        status: 'failure',
        durationMs,
        error: message,
      })

      throw new EzityHubApiError(message, code, undefined, endpoint)
    }
  }

  // --- Read-Only Business Endpoints ---

  async getMe(toolName = 'system_me') {
    return this.request<{ success: boolean; agent: any }>('/api/v1/agent/me', {
      toolName,
    })
  }

  async listBankAccounts(toolName = 'finance_get_bank_accounts') {
    return this.request<{
      success: boolean
      count: number
      bank_accounts: Array<any>
    }>('/api/v1/finance/bank-accounts', { toolName })
  }

  async listBankTransactions(
    bankAccountId: string,
    params?: {
      startDate?: string
      endDate?: string
      unreconciledOnly?: boolean
    },
    toolName = 'finance_get_transactions',
  ) {
    return this.request<{
      success: boolean
      count: number
      transactions: Array<any>
    }>(`/api/v1/finance/bank-accounts/${bankAccountId}/transactions`, {
      toolName,
      query: {
        start_date: params?.startDate,
        end_date: params?.endDate,
        unreconciled_only: params?.unreconciledOnly ? 'true' : undefined,
      },
    })
  }

  async listPostedEntries(
    params?: { fromDate?: string; toDate?: string; limit?: number },
    toolName = 'finance_get_expenses',
  ) {
    return this.request<{ success: boolean; count: number; entries: Array<any> }>(
      '/api/v1/accounting/entries',
      {
        toolName,
        query: {
          from_date: params?.fromDate,
          to_date: params?.toDate,
          limit: params?.limit,
        },
      },
    )
  }

  async getTrialBalance(
    params?: { asOfDate?: string; fiscalYearId?: string },
    toolName = 'finance_get_account_balances',
  ) {
    return this.request<{ success: boolean; trial_balance: any }>(
      '/api/v1/accounting/reports/trial-balance',
      {
        toolName,
        query: {
          as_of_date: params?.asOfDate,
          fiscal_year_id: params?.fiscalYearId,
        },
      },
    )
  }

  async getGeneralLedger(
    params: {
      accountId: string
      fromDate?: string
      toDate?: string
      limit?: number
    },
    toolName = 'finance_get_general_ledger',
  ) {
    return this.request<{
      success: boolean
      general_ledger?: any
      entries?: Array<any>
    }>('/api/v1/accounting/reports/general-ledger', {
      toolName,
      query: {
        account_id: params.accountId,
        from_date: params.fromDate,
        to_date: params.toDate,
        limit: params.limit,
      },
    })
  }

  async getProfitAndLoss(
    params?: { fromDate?: string; toDate?: string; fiscalYearId?: string },
    toolName = 'finance_get_profit_loss',
  ) {
    return this.request<{ success: boolean; statement: any }>(
      '/api/v1/accounting/reports/profit-and-loss',
      {
        toolName,
        query: {
          from_date: params?.fromDate,
          to_date: params?.toDate,
          fiscal_year_id: params?.fiscalYearId,
        },
      },
    )
  }

  async getBalanceSheet(
    params?: { asOfDate?: string },
    toolName = 'finance_get_balance_sheet',
  ) {
    return this.request<{ success: boolean; statement: any }>(
      '/api/v1/accounting/reports/balance-sheet',
      {
        toolName,
        query: {
          as_of_date: params?.asOfDate,
        },
      },
    )
  }

  async getCashFlow(
    params?: { fromDate?: string; toDate?: string },
    toolName = 'finance_get_cashflow',
  ) {
    return this.request<{ success: boolean; statement: any }>(
      '/api/v1/accounting/reports/cash-flow',
      {
        toolName,
        query: {
          from_date: params?.fromDate,
          to_date: params?.toDate,
        },
      },
    )
  }

  async listInvoices(
    params?: { status?: string; customerId?: string; limit?: number },
    toolName = 'finance_get_invoices',
  ) {
    return this.request<{ success: boolean; count: number; invoices: Array<any> }>(
      '/api/v1/finance/invoices',
      {
        toolName,
        query: {
          status: params?.status,
          customer_id: params?.customerId,
          limit: params?.limit,
        },
      },
    )
  }

  async getInvoice(invoiceId: string, toolName = 'finance_get_invoice') {
    return this.request<{ success: boolean; invoice: any }>(
      `/api/v1/finance/invoices/${invoiceId}`,
      { toolName },
    )
  }

  async getArAgeing(
    params?: { asOfDate?: string; customerId?: string },
    toolName = 'finance_get_overdue_invoices',
  ) {
    return this.request<{ success: boolean; count: number; ageing: Array<any> }>(
      '/api/v1/finance/reports/ar-ageing',
      {
        toolName,
        query: {
          as_of_date: params?.asOfDate,
          customer_id: params?.customerId,
        },
      },
    )
  }

  // --- Mutation Endpoints (Draft-First & Approval Gated) ---

  async createJournalDraft(
    data: CreateJournalDraftInput,
    options?: {
      toolName?: string
      idempotencyKey?: string
      actingAgentId?: string
      agentDefinitionId?: string
      humanApprover?: string
      beforeState?: unknown
    },
  ) {
    return this.request<{
      success: boolean
      journal: any
      message?: string
    }>('/api/v1/accounting/journals', {
      method: 'POST',
      body: data,
      toolName: options?.toolName || 'finance_prepare_journal',
      idempotencyKey: options?.idempotencyKey,
      actingAgentId: options?.actingAgentId,
      agentDefinitionId: options?.agentDefinitionId,
      humanApprover: options?.humanApprover,
      beforeState: options?.beforeState,
    })
  }

  async createInvoiceDraft(
    data: CreateInvoiceDraftInput,
    options?: {
      toolName?: string
      idempotencyKey?: string
      actingAgentId?: string
      agentDefinitionId?: string
      humanApprover?: string
    },
  ) {
    return this.request<{
      success: boolean
      invoice: any
      message?: string
    }>('/api/v1/finance/invoices', {
      method: 'POST',
      body: {
        ...data,
        auto_submit: false, // Strictly draft-first!
      },
      toolName: options?.toolName || 'finance_create_invoice_draft',
      idempotencyKey: options?.idempotencyKey,
      actingAgentId: options?.actingAgentId,
      agentDefinitionId: options?.agentDefinitionId,
      humanApprover: options?.humanApprover,
    })
  }

  async submitInvoice(
    invoiceId: string,
    options: {
      toolName?: string
      approvalId: string
      approvedBy: string
      actingAgentId?: string
      agentDefinitionId?: string
    },
  ) {
    return this.request<{
      success: boolean
      invoice: any
    }>(`/api/v1/finance/invoices/${invoiceId}/submit`, {
      method: 'POST',
      toolName: options.toolName || 'finance_submit_invoice',
      humanApprover: options.approvedBy,
      actingAgentId: options.actingAgentId,
      agentDefinitionId: options.agentDefinitionId,
      beforeState: { invoiceId, status: 'draft' },
      afterState: { invoiceId, status: 'submitted' },
    })
  }
}
