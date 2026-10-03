import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getExpensesSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Filter expenses posted on or after this date (YYYY-MM-DD)'),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('Filter expenses posted on or before this date (YYYY-MM-DD)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Max records to return (default: 50)'),
})

export async function handleGetExpenses(
  client: EzityHubClient,
  args: z.infer<typeof getExpensesSchema>,
) {
  const result = await client.listPostedEntries(
    {
      fromDate: args.fromDate,
      toDate: args.toDate,
      limit: args.limit,
    },
    'finance_get_expenses',
  )

  const rawEntries = result.entries || []
  const expenseEntries: Array<any> = []
  let totalExpenseAmount = 0

  for (const entry of rawEntries) {
    const expenseLines = (entry.lines || []).filter((line: any) => {
      const code = String(line.account_code || '')
      const type = String(line.account_type || '').toLowerCase()
      // In EzityHub chart of accounts, 5xxx/6xxx or type='expense' represents operating/admin expenses
      return type === 'expense' || code.startsWith('5') || code.startsWith('6')
    })

    if (expenseLines.length > 0) {
      let entryTotal = 0
      for (const l of expenseLines) {
        const debit =
          typeof l.debit === 'number' ? l.debit : parseFloat(l.debit || '0')
        entryTotal += debit
      }
      totalExpenseAmount += entryTotal

      expenseEntries.push({
        id: entry.id,
        entryNumber: entry.entry_number,
        postingDate: entry.posting_date,
        description: entry.description,
        totalExpense: Math.round(entryTotal * 100) / 100,
        lines: expenseLines,
      })
    }
  }

  return {
    count: expenseEntries.length,
    currency: 'MYR',
    period: {
      fromDate: args.fromDate || null,
      toDate: args.toDate || null,
    },
    totalRecordedExpense: Math.round(totalExpenseAmount * 100) / 100,
    expenses: expenseEntries,
  }
}
