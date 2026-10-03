import { z } from 'zod'
import type { EzityHubClient } from '../client.js'

export const getInvoicesSchema = z.object({
  status: z
    .enum(['draft', 'submitted', 'posted', 'paid'])
    .optional()
    .describe('Filter by invoice status'),
  customerId: z
    .string()
    .uuid()
    .optional()
    .describe('Filter by customer/party UUID'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max invoices to return (default: 25)'),
})

export const getInvoiceSchema = z.object({
  invoiceId: z.string().uuid().describe('UUID of the invoice to inspect'),
})

export const getOverdueInvoicesSchema = z.object({
  asOfDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .describe('As of date for ageing calculation (YYYY-MM-DD)'),
  customerId: z
    .string()
    .uuid()
    .optional()
    .describe('Optional customer UUID filter'),
})

export async function handleGetInvoices(
  client: EzityHubClient,
  args: z.infer<typeof getInvoicesSchema>,
) {
  const result = await client.listInvoices(
    {
      status: args.status,
      customerId: args.customerId,
      limit: args.limit,
    },
    'finance_get_invoices',
  )

  return {
    count: result.count,
    currency: 'MYR',
    invoices: result.invoices || [],
  }
}

export async function handleGetInvoice(
  client: EzityHubClient,
  args: z.infer<typeof getInvoiceSchema>,
) {
  const result = await client.getInvoice(args.invoiceId, 'finance_get_invoice')
  return {
    invoice: result.invoice,
  }
}

export async function handleGetOverdueInvoices(
  client: EzityHubClient,
  args: z.infer<typeof getOverdueInvoicesSchema>,
) {
  const result = await client.getArAgeing(
    {
      asOfDate: args.asOfDate,
      customerId: args.customerId,
    },
    'finance_get_overdue_invoices',
  )

  const ageingReport = result.ageing || []
  let totalOverdue = 0
  const overdueCustomers = ageingReport.map((row: any) => {
    const overdueAmt =
      (row.days_1_30 || 0) +
      (row.days_31_60 || 0) +
      (row.days_61_90 || 0) +
      (row.days_over_90 || 0)
    totalOverdue += overdueAmt
    return {
      customerId: row.customer_id,
      customerName: row.customer_name,
      current: row.current || 0,
      overdue1To30Days: row.days_1_30 || 0,
      overdue31To60Days: row.days_31_60 || 0,
      overdue61To90Days: row.days_61_90 || 0,
      overdueOver90Days: row.days_over_90 || 0,
      totalOverdue: Math.round(overdueAmt * 100) / 100,
      totalOutstanding: row.total_outstanding || 0,
    }
  })

  return {
    asOfDate: args.asOfDate || new Date().toISOString().slice(0, 10),
    count: overdueCustomers.length,
    currency: 'MYR',
    totalOverdueReceivables: Math.round(totalOverdue * 100) / 100,
    ageingAnalysis: overdueCustomers,
  }
}
