import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getFinancialSummarySchema = z.object({
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date of summary period (YYYY-MM-DD)'),
  periodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date of summary period (YYYY-MM-DD)'),
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('As of date for balance and overdue snapshot (YYYY-MM-DD)'),
})

export async function handleGetFinancialSummary(
  client: EzityHubClient,
  args: z.infer<typeof getFinancialSummarySchema>,
) {
  const asOf = args.asOfDate || new Date().toISOString().slice(0, 10)
  const start = args.periodStart
  const end = args.periodEnd || asOf

  const [meRes, banksRes, plRes, arRes] = await Promise.all([
    client
      .getMe('finance_get_financial_summary')
      .catch(() => ({ success: false, agent: null })),
    client
      .listBankAccounts('finance_get_financial_summary')
      .catch(() => ({ success: false, count: 0, bank_accounts: [] })),
    client
      .getProfitAndLoss(
        { fromDate: start, toDate: end },
        'finance_get_financial_summary',
      )
      .catch(() => ({ success: false, statement: null })),
    client
      .getArAgeing({ asOfDate: asOf }, 'finance_get_financial_summary')
      .catch(() => ({ success: false, count: 0, ageing: [] })),
  ])

  const bankAccounts = banksRes.bank_accounts || []
  const totalCashBalance = bankAccounts.reduce(
    (sum: number, acct: any) => sum + (acct.current_balance || 0),
    0,
  )

  const arList = arRes.ageing || []
  const totalOverdueReceivables = arList.reduce((sum: number, row: any) => {
    return (
      sum +
      (row.days_1_30 || 0) +
      (row.days_31_60 || 0) +
      (row.days_61_90 || 0) +
      (row.days_over_90 || 0)
    )
  }, 0)

  return {
    organization: {
      name: meRes.agent?.organization?.name || 'EZity Solutions',
      currency: meRes.agent?.organization?.currency || 'MYR',
    },
    snapshotDate: asOf,
    period: {
      startDate: start || null,
      endDate: end || null,
    },
    cashAndTreasury: {
      accountCount: bankAccounts.length,
      totalBankBalance: Math.round(totalCashBalance * 100) / 100,
      accounts: bankAccounts.map((a: any) => ({
        id: a.id,
        name: a.account_name || a.bank_name,
        currency: a.currency,
        balance: a.current_balance ?? null,
      })),
    },
    receivables: {
      overdueCustomerCount: arList.length,
      totalOverdue: Math.round(totalOverdueReceivables * 100) / 100,
    },
    profitAndLossStatement: plRes.statement || null,
  }
}
