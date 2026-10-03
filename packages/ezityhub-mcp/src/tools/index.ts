import { EzityHubApiError } from '../client.js'
import {
  getBankAccountsSchema,
  getTransactionsSchema,
  getUncategorizedTransactionsSchema,
  handleGetBankAccounts,
  handleGetTransactions,
  handleGetUncategorizedTransactions,
} from './transactions.js'
import { getExpensesSchema, handleGetExpenses } from './expenses.js'
import {
  getInvoiceSchema,
  getInvoicesSchema,
  getOverdueInvoicesSchema,
  handleGetInvoice,
  handleGetInvoices,
  handleGetOverdueInvoices,
} from './invoices.js'
import {
  getAccountBalancesSchema,
  getGeneralLedgerSchema,
  handleGetAccountBalances,
  handleGetGeneralLedger,
} from './balances.js'
import {
  getBalanceSheetSchema,
  getCashflowSchema,
  getProfitLossSchema,
  handleGetBalanceSheet,
  handleGetCashflow,
  handleGetProfitLoss,
} from './statements.js'
import {
  getFinancialSummarySchema,
  handleGetFinancialSummary,
} from './summary.js'
import type { EzityHubClient} from '../client.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

function formatToolResponse(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

function formatErrorResponse(err: unknown) {
  if (err instanceof EzityHubApiError) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(err.toStructured(), null, 2),
        },
      ],
    }
  }

  const message = err instanceof Error ? err.message : String(err)
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            error: true,
            code: 'INTERNAL_ERROR',
            message,
          },
          null,
          2,
        ),
      },
    ],
  }
}

export function registerFinanceTools(
  server: McpServer,
  client: EzityHubClient,
) {
  // 1. Bank Accounts
  server.tool(
    'finance_get_bank_accounts',
    'List treasury bank accounts with their account numbers, currency, and mapped GL accounts.',
    getBankAccountsSchema.shape,
    async () => {
      try {
        const result = await handleGetBankAccounts(client)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 2. Bank Transactions
  server.tool(
    'finance_get_transactions',
    'Retrieve transactions from a treasury bank account within an optional date range.',
    getTransactionsSchema.shape,
    async (args) => {
      try {
        const result = await handleGetTransactions(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 3. Uncategorized Transactions
  server.tool(
    'finance_get_uncategorized_transactions',
    'Retrieve uncategorized or unreconciled bank transactions requiring review across bank accounts.',
    getUncategorizedTransactionsSchema.shape,
    async (args) => {
      try {
        const result = await handleGetUncategorizedTransactions(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 4. Expenses
  server.tool(
    'finance_get_expenses',
    'Retrieve recorded operating expenses and posted expense ledger entries within a date range.',
    getExpensesSchema.shape,
    async (args) => {
      try {
        const result = await handleGetExpenses(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 5. Invoices List
  server.tool(
    'finance_get_invoices',
    'Query sales invoices filtered by status (draft, submitted, posted, paid) or customer UUID.',
    getInvoicesSchema.shape,
    async (args) => {
      try {
        const result = await handleGetInvoices(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 6. Invoice Detail
  server.tool(
    'finance_get_invoice',
    'Inspect full details, line items, and approval state of a specific sales invoice by invoice UUID.',
    getInvoiceSchema.shape,
    async (args) => {
      try {
        const result = await handleGetInvoice(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 7. Overdue Invoices
  server.tool(
    'finance_get_overdue_invoices',
    'Retrieve Accounts Receivable ageing analysis and overdue customer balances (Current, 1-30, 31-60, 61-90, 90+ days overdue).',
    getOverdueInvoicesSchema.shape,
    async (args) => {
      try {
        const result = await handleGetOverdueInvoices(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 8. Account Balances
  server.tool(
    'finance_get_account_balances',
    'Retrieve liquid bank balances and complete trial balance ledger account balances as of a specific date.',
    getAccountBalancesSchema.shape,
    async (args) => {
      try {
        const result = await handleGetAccountBalances(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 9. General Ledger
  server.tool(
    'finance_get_general_ledger',
    'Query the General Ledger running balance and chronological journal lines for a specific GL account UUID.',
    getGeneralLedgerSchema.shape,
    async (args) => {
      try {
        const result = await handleGetGeneralLedger(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 10. Profit & Loss
  server.tool(
    'finance_get_profit_loss',
    'Generate the official Profit and Loss financial statement with grouped revenue and expense categories for a date range.',
    getProfitLossSchema.shape,
    async (args) => {
      try {
        const result = await handleGetProfitLoss(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 11. Cash Flow
  server.tool(
    'finance_get_cashflow',
    'Generate Statement of Cash Flows categorized into operating, investing, and financing activities.',
    getCashflowSchema.shape,
    async (args) => {
      try {
        const result = await handleGetCashflow(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 12. Balance Sheet
  server.tool(
    'finance_get_balance_sheet',
    'Generate Statement of Financial Position (Balance Sheet) showing assets, liabilities, and equity as of a specific date.',
    getBalanceSheetSchema.shape,
    async (args) => {
      try {
        const result = await handleGetBalanceSheet(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )

  // 13. Financial Summary
  server.tool(
    'finance_get_financial_summary',
    'Generate a high-level executive financial briefing aggregating bank cash reserves, P&L performance, and overdue receivables.',
    getFinancialSummarySchema.shape,
    async (args) => {
      try {
        const result = await handleGetFinancialSummary(client, args)
        return formatToolResponse(result)
      } catch (err) {
        return formatErrorResponse(err)
      }
    },
  )
}
