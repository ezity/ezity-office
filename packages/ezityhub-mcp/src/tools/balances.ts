import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getAccountBalancesSchema = z.object({
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Snapshot date for balances (YYYY-MM-DD)'),
  fiscalYearId: z
    .string()
    .uuid()
    .optional()
    .describe('Fiscal year UUID filter'),
})

export const getGeneralLedgerSchema = z.object({
  accountId: z
    .string()
    .uuid()
    .describe('UUID of the General Ledger account to inspect'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date filter (YYYY-MM-DD)'),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date filter (YYYY-MM-DD)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Max transactions to return (default: 100)'),
})

export async function handleGetAccountBalances(
  client: EzityHubClient,
  args: z.infer<typeof getAccountBalancesSchema>,
) {
  const [tbResult, banksResult] = await Promise.all([
    client
      .getTrialBalance(
        { asOfDate: args.asOfDate, fiscalYearId: args.fiscalYearId },
        'finance_get_account_balances',
      )
      .catch(() => ({ trial_balance: [] })),
    client
      .listBankAccounts('finance_get_account_balances')
      .catch(() => ({ count: 0, bank_accounts: [] })),
  ])

  return {
    asOfDate: args.asOfDate || new Date().toISOString().slice(0, 10),
    currency: 'MYR',
    bankAccounts: banksResult.bank_accounts || [],
    trialBalance: tbResult.trial_balance || [],
  }
}

export async function handleGetGeneralLedger(
  client: EzityHubClient,
  args: z.infer<typeof getGeneralLedgerSchema>,
) {
  const result = await client.getGeneralLedger(
    {
      accountId: args.accountId,
      fromDate: args.fromDate,
      toDate: args.toDate,
      limit: args.limit,
    },
    'finance_get_general_ledger',
  )

  return {
    accountId: args.accountId,
    currency: 'MYR',
    period: {
      fromDate: args.fromDate || null,
      toDate: args.toDate || null,
    },
    generalLedger: result.general_ledger || result.entries || result,
  }
}
