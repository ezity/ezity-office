import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getProfitLossSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date for period (YYYY-MM-DD)'),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date for period (YYYY-MM-DD)'),
  fiscalYearId: z
    .string()
    .uuid()
    .optional()
    .describe('Fiscal year UUID filter'),
})

export const getCashflowSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Start date for cash flow period (YYYY-MM-DD)'),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('End date for cash flow period (YYYY-MM-DD)'),
})

export const getBalanceSheetSchema = z.object({
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('As of date for statement of financial position (YYYY-MM-DD)'),
})

export async function handleGetProfitLoss(
  client: EzityHubClient,
  args: z.infer<typeof getProfitLossSchema>,
) {
  const result = await client.getProfitAndLoss(
    {
      fromDate: args.fromDate,
      toDate: args.toDate,
      fiscalYearId: args.fiscalYearId,
    },
    'finance_get_profit_loss',
  )

  return {
    period: {
      fromDate: args.fromDate || null,
      toDate: args.toDate || null,
    },
    currency: 'MYR',
    statement: result.statement,
  }
}

export async function handleGetCashflow(
  client: EzityHubClient,
  args: z.infer<typeof getCashflowSchema>,
) {
  const result = await client.getCashFlow(
    {
      fromDate: args.fromDate,
      toDate: args.toDate,
    },
    'finance_get_cashflow',
  )

  return {
    period: {
      fromDate: args.fromDate || null,
      toDate: args.toDate || null,
    },
    currency: 'MYR',
    statement: result.statement,
  }
}

export async function handleGetBalanceSheet(
  client: EzityHubClient,
  args: z.infer<typeof getBalanceSheetSchema>,
) {
  const result = await client.getBalanceSheet(
    {
      asOfDate: args.asOfDate,
    },
    'finance_get_balance_sheet',
  )

  return {
    asOfDate: args.asOfDate || new Date().toISOString().slice(0, 10),
    currency: 'MYR',
    statement: result.statement,
  }
}
