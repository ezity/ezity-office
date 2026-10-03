import { describe, it, expect, vi } from 'vitest'
import {
  getTransactionsSchema,
  getUncategorizedTransactionsSchema,
  handleGetTransactions,
  handleGetUncategorizedTransactions,
  handleGetBankAccounts,
} from '../src/tools/transactions.js'
import { getExpensesSchema, handleGetExpenses } from '../src/tools/expenses.js'
import {
  getInvoicesSchema,
  getInvoiceSchema,
  getOverdueInvoicesSchema,
  handleGetInvoices,
  handleGetInvoice,
  handleGetOverdueInvoices,
} from '../src/tools/invoices.js'
import {
  getAccountBalancesSchema,
  getGeneralLedgerSchema,
  handleGetAccountBalances,
  handleGetGeneralLedger,
} from '../src/tools/balances.js'
import {
  getProfitLossSchema,
  getCashflowSchema,
  getBalanceSheetSchema,
  handleGetProfitLoss,
  handleGetCashflow,
  handleGetBalanceSheet,
} from '../src/tools/statements.js'
import {
  getFinancialSummarySchema,
  handleGetFinancialSummary,
} from '../src/tools/summary.js'
import { EzityHubClient } from '../src/client.js'

describe('B. Tool Schemas Validation', () => {
  it('validates transaction parameters strictly', () => {
    // Valid
    expect(getTransactionsSchema.safeParse({}).success).toBe(true)
    expect(
      getTransactionsSchema.safeParse({
        bankAccountId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        unreconciledOnly: true,
        limit: 25,
      }).success,
    ).toBe(true)

    // Invalid UUID
    expect(
      getTransactionsSchema.safeParse({ bankAccountId: 'not-a-uuid' }).success,
    ).toBe(false)
    // Invalid Date format
    expect(
      getTransactionsSchema.safeParse({ startDate: '01-01-2026' }).success,
    ).toBe(false)
    // Negative limit
    expect(getTransactionsSchema.safeParse({ limit: -5 }).success).toBe(false)
  })

  it('validates invoice parameters strictly', () => {
    expect(getInvoicesSchema.safeParse({ status: 'paid' }).success).toBe(true)
    expect(
      getInvoicesSchema.safeParse({ status: 'invalid_status' }).success,
    ).toBe(false)
    expect(
      getInvoiceSchema.safeParse({
        invoiceId: '123e4567-e89b-12d3-a456-426614174000',
      }).success,
    ).toBe(true)
    expect(
      getInvoiceSchema.safeParse({ invoiceId: 'not-a-uuid' }).success,
    ).toBe(false)
  })

  it('validates date formats on statement schemas', () => {
    expect(
      getProfitLossSchema.safeParse({
        fromDate: '2026-01-01',
        toDate: '2026-03-31',
      }).success,
    ).toBe(true)
    expect(
      getProfitLossSchema.safeParse({ fromDate: '2026/01/01' }).success,
    ).toBe(false)
    expect(
      getBalanceSheetSchema.safeParse({ asOfDate: '2026-03-31' }).success,
    ).toBe(true)
    expect(
      getCashflowSchema.safeParse({
        fromDate: '2026-01-01',
        toDate: '2026-03-31',
      }).success,
    ).toBe(true)
  })
})

describe('C. Tool to EzityHub Endpoint Mapping', () => {
  const dummyUuid = '123e4567-e89b-12d3-a456-426614174000'
  let requestedUrls: string[] = []

  function createMockClient() {
    requestedUrls = []
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestedUrls.push(url)
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      if (pathname === '/api/v1/agent/me') {
        return new Response(
          JSON.stringify({
            success: true,
            agent: {
              organization: {
                name: 'Ezity Solutions Sdn Bhd',
                currency: 'MYR',
              },
            },
          }),
        )
      }
      if (pathname === '/api/v1/finance/bank-accounts') {
        return new Response(
          JSON.stringify({
            success: true,
            count: 1,
            bank_accounts: [
              { id: dummyUuid, bank_name: 'Maybank', current_balance: 45000.5 },
            ],
          }),
        )
      }
      if (pathname.includes('/transactions')) {
        return new Response(
          JSON.stringify({
            success: true,
            count: 2,
            transactions: [
              {
                id: 'tx-1',
                amount: 500,
                description: 'Client payment',
                reconciled: false,
              },
              {
                id: 'tx-2',
                amount: 120,
                description: 'Software subscription',
                reconciled: true,
              },
            ],
          }),
        )
      }
      if (pathname === '/api/v1/accounting/entries') {
        return new Response(
          JSON.stringify({
            success: true,
            count: 1,
            entries: [
              {
                id: 'ent-1',
                entry_number: 'JRN-001',
                posting_date: '2026-02-15',
                lines: [
                  {
                    account_code: '5200',
                    account_type: 'expense',
                    debit: 250,
                    credit: 0,
                  },
                  {
                    account_code: '1010',
                    account_type: 'asset',
                    debit: 0,
                    credit: 250,
                  },
                ],
              },
            ],
          }),
        )
      }
      if (pathname === '/api/v1/finance/invoices') {
        return new Response(
          JSON.stringify({
            success: true,
            count: 1,
            invoices: [
              {
                id: dummyUuid,
                invoice_number: 'INV-2026-001',
                total_amount: 1500,
                status: 'posted',
              },
            ],
          }),
        )
      }
      if (pathname.includes('/api/v1/finance/invoices/')) {
        return new Response(
          JSON.stringify({
            success: true,
            invoice: {
              id: dummyUuid,
              invoice_number: 'INV-2026-001',
              total_amount: 1500,
            },
          }),
        )
      }
      if (pathname === '/api/v1/finance/reports/ar-ageing') {
        return new Response(
          JSON.stringify({
            success: true,
            count: 1,
            ageing: [
              {
                customer_id: 'cust-1',
                customer_name: 'Acme Corp',
                days_1_30: 1500,
                total_outstanding: 1500,
              },
            ],
          }),
        )
      }
      if (pathname === '/api/v1/accounting/reports/profit-and-loss') {
        return new Response(
          JSON.stringify({
            success: true,
            statement: {
              total_revenue: 50000,
              total_expense: 20000,
              net_profit: 30000,
            },
          }),
        )
      }
      if (pathname === '/api/v1/accounting/reports/cash-flow') {
        return new Response(
          JSON.stringify({
            success: true,
            statement: {
              operating_activities: 12000,
              net_change_in_cash: 12000,
            },
          }),
        )
      }
      if (pathname === '/api/v1/accounting/reports/balance-sheet') {
        return new Response(
          JSON.stringify({
            success: true,
            statement: {
              total_assets: 150000,
              total_liabilities: 50000,
              total_equity: 100000,
            },
          }),
        )
      }
      if (pathname === '/api/v1/accounting/reports/trial-balance') {
        return new Response(
          JSON.stringify({
            success: true,
            trial_balance: [{ account_code: '1010', net_balance: 45000.5 }],
          }),
        )
      }
      if (pathname === '/api/v1/accounting/reports/general-ledger') {
        return new Response(
          JSON.stringify({
            success: true,
            general_ledger: [
              { posting_date: '2026-01-01', running_balance: 45000 },
            ],
          }),
        )
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    })

    return new EzityHubClient(
      {
        apiUrl: 'http://localhost:3000',
        apiToken: 'ez_agt_test_token',
        timeoutMs: 5000,
      },
      { fetchFn: mockFetch as any },
    )
  }

  it('finance_get_bank_accounts maps to GET /api/v1/finance/bank-accounts', async () => {
    const client = createMockClient()
    const res = await handleGetBankAccounts(client)
    expect(requestedUrls[0]).toContain('/api/v1/finance/bank-accounts')
    expect(res.count).toBe(1)
  })

  it('finance_get_transactions maps to GET /api/v1/finance/bank-accounts/{id}/transactions with params', async () => {
    const client = createMockClient()
    const res = await handleGetTransactions(client, {
      bankAccountId: dummyUuid,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })
    expect(requestedUrls[0]).toContain(
      `/api/v1/finance/bank-accounts/${dummyUuid}/transactions`,
    )
    expect(requestedUrls[0]).toContain('start_date=2026-01-01')
    expect(requestedUrls[0]).toContain('end_date=2026-01-31')
    expect(res.count).toBe(2)
  })

  it('finance_get_uncategorized_transactions maps with unreconciled_only=true', async () => {
    const client = createMockClient()
    const res = await handleGetUncategorizedTransactions(client, {
      bankAccountId: dummyUuid,
    })
    expect(
      requestedUrls.some((u) => u.includes('unreconciled_only=true')),
    ).toBe(true)
    expect(res.count).toBe(2)
  })

  it('finance_get_expenses maps to GET /api/v1/accounting/entries and isolates expense lines', async () => {
    const client = createMockClient()
    const res = await handleGetExpenses(client, {
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    })
    expect(requestedUrls[0]).toContain('/api/v1/accounting/entries')
    expect(res.count).toBe(1)
    expect(res.totalRecordedExpense).toBe(250)
  })

  it('finance_get_invoices and finance_get_invoice map to invoices endpoints', async () => {
    const client = createMockClient()
    const listRes = await handleGetInvoices(client, { status: 'posted' })
    expect(requestedUrls[0]).toContain('/api/v1/finance/invoices?status=posted')
    expect(listRes.count).toBe(1)

    const detailRes = await handleGetInvoice(client, { invoiceId: dummyUuid })
    expect(requestedUrls[1]).toContain(`/api/v1/finance/invoices/${dummyUuid}`)
    expect(detailRes.invoice.invoice_number).toBe('INV-2026-001')
  })

  it('finance_get_overdue_invoices maps to GET /api/v1/finance/reports/ar-ageing', async () => {
    const client = createMockClient()
    const res = await handleGetOverdueInvoices(client, {
      asOfDate: '2026-02-28',
    })
    expect(requestedUrls[0]).toContain(
      '/api/v1/finance/reports/ar-ageing?as_of_date=2026-02-28',
    )
    expect(res.totalOverdueReceivables).toBe(1500)
  })

  it('finance_get_profit_loss maps to GET /api/v1/accounting/reports/profit-and-loss', async () => {
    const client = createMockClient()
    const res = await handleGetProfitLoss(client, {
      fromDate: '2026-01-01',
      toDate: '2026-03-31',
    })
    expect(requestedUrls[0]).toContain(
      '/api/v1/accounting/reports/profit-and-loss?from_date=2026-01-01&to_date=2026-03-31',
    )
    expect(res.statement.net_profit).toBe(30000)
  })

  it('finance_get_cashflow maps to GET /api/v1/accounting/reports/cash-flow', async () => {
    const client = createMockClient()
    const res = await handleGetCashflow(client, {
      fromDate: '2026-01-01',
      toDate: '2026-03-31',
    })
    expect(requestedUrls[0]).toContain(
      '/api/v1/accounting/reports/cash-flow?from_date=2026-01-01&to_date=2026-03-31',
    )
    expect(res.statement.net_change_in_cash).toBe(12000)
  })

  it('finance_get_balance_sheet maps to GET /api/v1/accounting/reports/balance-sheet', async () => {
    const client = createMockClient()
    const res = await handleGetBalanceSheet(client, { asOfDate: '2026-03-31' })
    expect(requestedUrls[0]).toContain(
      '/api/v1/accounting/reports/balance-sheet?as_of_date=2026-03-31',
    )
    expect(res.statement.total_assets).toBe(150000)
  })

  it('finance_get_financial_summary aggregates organization, cash, P&L, and receivables accurately', async () => {
    const client = createMockClient()
    const res = await handleGetFinancialSummary(client, {
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    })
    expect(res.organization.currency).toBe('MYR')
    expect(res.cashAndTreasury.totalBankBalance).toBe(45000.5)
    expect(res.receivables.totalOverdue).toBe(1500)
    expect(res.profitAndLossStatement.net_profit).toBe(30000)
  })
})
