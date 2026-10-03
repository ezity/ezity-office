import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getTransactionsSchema = z.object({
  bankAccountId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'UUID of the bank account. If omitted, the default primary bank account is automatically selected.',
    ),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date filter (YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date filter (YYYY-MM-DD)'),
  unreconciledOnly: z
    .boolean()
    .optional()
    .describe('If true, returns only uncategorized/unreconciled transactions'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Max transactions to return (default: 50)'),
})

export const getUncategorizedTransactionsSchema = z.object({
  bankAccountId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'UUID of a specific bank account. If omitted, uncategorized transactions across all bank accounts will be retrieved.',
    ),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date filter (YYYY-MM-DD)'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date filter (YYYY-MM-DD)'),
})

export const getBankAccountsSchema = z.object({})

export async function handleGetBankAccounts(client: EzityHubClient) {
  const result = await client.listBankAccounts('finance_get_bank_accounts')
  return {
    count: result.count,
    bankAccounts: result.bank_accounts,
  }
}

export async function handleGetTransactions(
  client: EzityHubClient,
  args: z.infer<typeof getTransactionsSchema>,
) {
  let bankAccountId = args.bankAccountId
  if (!bankAccountId) {
    const accounts = await client.listBankAccounts('finance_get_transactions')
    if (!accounts.bank_accounts || accounts.bank_accounts.length === 0) {
      return {
        transactions: [],
        count: 0,
        currency: 'MYR',
        message: 'No active bank accounts found in EzityHub.',
      }
    }
    bankAccountId = accounts.bank_accounts[0].id
  }

  if (!bankAccountId) {
    return {
      transactions: [],
      count: 0,
      currency: 'MYR',
      message: 'No bank account ID specified and none could be resolved.',
    }
  }

  const result = await client.listBankTransactions(
    bankAccountId,
    {
      startDate: args.startDate,
      endDate: args.endDate,
      unreconciledOnly: args.unreconciledOnly,
    },
    'finance_get_transactions',
  )

  let txList = result.transactions || []
  if (args.limit && txList.length > args.limit) {
    txList = txList.slice(0, args.limit)
  }

  return {
    bankAccountId,
    count: txList.length,
    currency: 'MYR',
    period: {
      startDate: args.startDate || null,
      endDate: args.endDate || null,
    },
    transactions: txList,
  }
}

export async function handleGetUncategorizedTransactions(
  client: EzityHubClient,
  args: z.infer<typeof getUncategorizedTransactionsSchema>,
) {
  const accountsRes = await client.listBankAccounts(
    'finance_get_uncategorized_transactions',
  )
  const accounts = accountsRes.bank_accounts || []

  if (accounts.length === 0) {
    return {
      count: 0,
      transactions: [],
      currency: 'MYR',
      message: 'No bank accounts configured in EzityHub.',
    }
  }

  const targetAccounts = args.bankAccountId
    ? accounts.filter((a) => a.id === args.bankAccountId)
    : accounts

  const allUncategorized: Array<any> = []
  for (const acct of targetAccounts) {
    const txRes = await client.listBankTransactions(
      acct.id,
      {
        startDate: args.startDate,
        endDate: args.endDate,
        unreconciledOnly: true,
      },
      'finance_get_uncategorized_transactions',
    )
    if (txRes.transactions) {
      for (const tx of txRes.transactions) {
        allUncategorized.push({
          ...tx,
          bank_account_name: acct.account_name || acct.bank_name,
        })
      }
    }
  }

  return {
    count: allUncategorized.length,
    currency: 'MYR',
    period: {
      startDate: args.startDate || null,
      endDate: args.endDate || null,
    },
    uncategorizedTransactions: allUncategorized,
  }
}
