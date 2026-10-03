import { z } from 'zod';
import { EzityHubClient, EzityHubApiError } from '../client.js';

// --- Schemas ---

const journalLineSchema = z.object({
  accountId: z.string().uuid().describe('Target GL account UUID. Control accounts (AR/AP) are forbidden.'),
  debit: z.string().regex(/^(0|[1-9][0-9]{0,13})(\.[0-9]{1,2})?$/, 'Must be finite decimal string with <= 2 decimals'),
  credit: z.string().regex(/^(0|[1-9][0-9]{0,13})(\.[0-9]{1,2})?$/, 'Must be finite decimal string with <= 2 decimals'),
  businessUnitId: z.string().uuid().optional().nullable().describe('Required for revenue/expense accounts'),
  costCentreId: z.string().uuid().optional().nullable().describe('Required for revenue/expense accounts'),
  cashflowCategory: z.enum(['operating', 'investing', 'financing', 'internal_transfer']).optional().nullable().describe('Required only for cash-equivalent bank accounts'),
});

export const prepareJournalSchema = z.object({
  postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').describe('Accounting posting date (YYYY-MM-DD)'),
  description: z.string().trim().min(3).max(500).describe('Business purpose / memo for the journal draft'),
  currency: z.literal('MYR').default('MYR'),
  lines: z.array(journalLineSchema).min(2, 'Journal must contain at least 2 balanced lines').max(100),
  idempotencyKey: z.string().optional().describe('Unique client idempotency key to prevent duplicate drafts on retry'),
  agentDefinitionId: z.string().optional().describe('Identifier of the acting agent (e.g. ezity-accountant)'),
});

export const createExpenseDraftSchema = z.object({
  postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').describe('Expense date (YYYY-MM-DD)'),
  description: z.string().trim().min(3).max(500).describe('Expense description or purpose'),
  amount: z.number().positive('Expense amount must be greater than zero'),
  expenseAccountId: z.string().uuid().describe('Target GL Expense account UUID (e.g. 5200 Software)'),
  bankAccountId: z.string().uuid().describe('Paying Treasury Bank Account UUID (from list_bank_accounts)'),
  businessUnitId: z.string().uuid().optional().describe('Organizational business unit UUID'),
  costCentreId: z.string().uuid().optional().describe('Cost centre UUID for budget attribution'),
  reference: z.string().optional().describe('Receipt number, invoice reference, or payment voucher ID'),
  idempotencyKey: z.string().optional().describe('Unique client idempotency key to prevent duplicate drafts'),
  agentDefinitionId: z.string().optional().describe('Identifier of the acting agent (e.g. ezity-accountant)'),
});

export const proposeTransactionCategorySchema = z.object({
  bankAccountId: z.string().uuid().describe('Bank Account UUID where the unreconciled transaction occurred'),
  transactionId: z.string().describe('ID of the unreconciled bank transaction (from finance_get_uncategorized_transactions)'),
  proposedExpenseAccountId: z.string().uuid().describe('Target GL Expense account UUID for categorization'),
  description: z.string().optional().describe('Override or clarify transaction description'),
  justification: z.string().min(5).describe('Accounting rationale for this categorization'),
  businessUnitId: z.string().uuid().optional().describe('Business unit UUID'),
  costCentreId: z.string().uuid().optional().describe('Cost centre UUID'),
  idempotencyKey: z.string().optional().describe('Unique client idempotency key'),
  agentDefinitionId: z.string().optional().describe('Identifier of the acting agent (e.g. ezity-accountant)'),
});

export const createInvoiceDraftSchema = z.object({
  customerPartyId: z.string().uuid().describe('Target Customer Party UUID'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').describe('Invoice issue date (YYYY-MM-DD)'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').describe('Payment due date (YYYY-MM-DD)'),
  notes: z.string().optional().describe('Customer-facing notes or payment instructions'),
  salesOrderId: z.string().uuid().optional().describe('Optional sales order UUID to link'),
  lines: z.array(
    z.object({
      description: z.string().trim().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().min(0),
      discountPct: z.number().min(0).max(100).optional().nullable(),
      revenueAccountId: z.string().uuid().optional().nullable(),
      productId: z.string().uuid().optional().nullable(),
      businessUnitId: z.string().uuid().optional().nullable(),
      costCentreId: z.string().uuid().optional().nullable(),
    })
  ).min(1, 'Invoice must contain at least 1 line item'),
  invoiceId: z.string().uuid().optional().describe('Optional UUID for client-side idempotency or draft updates'),
  idempotencyKey: z.string().optional().describe('Unique client idempotency key'),
  agentDefinitionId: z.string().optional().describe('Identifier of the acting agent'),
});

export const submitInvoiceSchema = z.object({
  invoiceId: z.string().uuid().describe('UUID of the draft invoice to submit for human review'),
  approvalId: z.string().min(1, 'approvalId is required to prove verified human approval'),
  approvedBy: z.string().min(1, 'approvedBy is required to identify the human approver'),
  agentDefinitionId: z.string().optional().describe('Acting agent identifier'),
});

// --- Handlers ---

export async function handlePrepareJournal(
  client: EzityHubClient,
  args: z.infer<typeof prepareJournalSchema>
) {
  // Balanced check
  const totalDebit = args.lines.reduce((sum, l) => sum + parseFloat(l.debit || '0'), 0);
  const totalCredit = args.lines.reduce((sum, l) => sum + parseFloat(l.credit || '0'), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new EzityHubApiError(
      `Journal must balance: total debit (${totalDebit.toFixed(2)}) does not equal total credit (${totalCredit.toFixed(2)})`,
      'INVALID_FILTER',
      400,
      '/api/v1/accounting/journals'
    );
  }

  const payloadLines = args.lines.map((l) => ({
    account_id: l.accountId,
    debit: l.debit,
    credit: l.credit,
    business_unit_id: l.businessUnitId || null,
    cost_centre_id: l.costCentreId || null,
    cashflow_category: l.cashflowCategory || null,
  }));

  const res = await client.createJournalDraft(
    {
      posting_date: args.postingDate,
      description: args.description,
      currency: args.currency,
      lines: payloadLines,
    },
    {
      toolName: 'finance_prepare_journal',
      idempotencyKey: args.idempotencyKey,
      agentDefinitionId: args.agentDefinitionId,
    }
  );

  return {
    status: 'draft',
    workflowState: 'Pending Approval' as const,
    journalId: res.journal?.id,
    entryNumber: res.journal?.entry_number || 'DRAFT',
    postingDate: args.postingDate,
    currency: args.currency,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    linesCount: payloadLines.length,
    message: 'Draft journal prepared successfully. Submitted to EzityHub supervisor queue for human review before posting.',
  };
}

export async function handleCreateExpenseDraft(
  client: EzityHubClient,
  args: z.infer<typeof createExpenseDraftSchema>
) {
  // Look up bank account to get mapped GL account
  const bankAccountsRes = await client.listBankAccounts('finance_create_expense_draft');
  const bankAccount = (bankAccountsRes.bank_accounts || []).find((b: any) => b.id === args.bankAccountId);

  if (!bankAccount) {
    throw new EzityHubApiError(
      `Bank account with ID ${args.bankAccountId} not found in EzityHub.`,
      'NOT_FOUND',
      404,
      '/api/v1/finance/bank-accounts'
    );
  }

  const bankGlAccountId = bankAccount.gl_account_id;
  if (!bankGlAccountId) {
    throw new EzityHubApiError(
      `Bank account ${bankAccount.account_name || bankAccount.bank_name} has no mapped GL account. Cannot create double-entry journal.`,
      'INVALID_FILTER',
      400
    );
  }

  const amtStr = args.amount.toFixed(2);
  const memo = args.reference
    ? `${args.description} [Ref: ${args.reference}]`
    : args.description;

  const lines = [
    {
      account_id: args.expenseAccountId,
      debit: amtStr,
      credit: '0.00',
      business_unit_id: args.businessUnitId || null,
      cost_centre_id: args.costCentreId || null,
      cashflow_category: null,
    },
    {
      account_id: bankGlAccountId,
      debit: '0.00',
      credit: amtStr,
      business_unit_id: null,
      cost_centre_id: null,
      cashflow_category: 'operating' as const,
    },
  ];

  const res = await client.createJournalDraft(
    {
      posting_date: args.postingDate,
      description: `Expense: ${memo}`,
      currency: 'MYR',
      lines,
    },
    {
      toolName: 'finance_create_expense_draft',
      idempotencyKey: args.idempotencyKey,
      agentDefinitionId: args.agentDefinitionId,
      beforeState: { amount: args.amount, status: 'unrecorded' },
    }
  );

  return {
    status: 'draft',
    workflowState: 'Pending Approval' as const,
    expenseDraftId: res.journal?.id,
    entryNumber: res.journal?.entry_number || 'DRAFT',
    postingDate: args.postingDate,
    amount: args.amount,
    currency: 'MYR',
    description: memo,
    debitAccount: args.expenseAccountId,
    creditAccount: bankGlAccountId,
    message: 'Expense draft recorded in EzityHub. Requires human supervisor approval before posting to general ledger.',
  };
}

export async function handleProposeTransactionCategory(
  client: EzityHubClient,
  args: z.infer<typeof proposeTransactionCategorySchema>
) {
  // Verify bank account exists
  const bankAccountsRes = await client.listBankAccounts('finance_propose_transaction_category');
  const bankAccount = (bankAccountsRes.bank_accounts || []).find((b: any) => b.id === args.bankAccountId);

  if (!bankAccount) {
    throw new EzityHubApiError(
      `Bank account with ID ${args.bankAccountId} not found.`,
      'NOT_FOUND',
      404
    );
  }

  // Retrieve unreconciled transactions to find target
  const txListRes = await client.listBankTransactions(
    args.bankAccountId,
    { unreconciledOnly: true },
    'finance_propose_transaction_category'
  );
  const tx = (txListRes.transactions || []).find((t: any) => String(t.id) === String(args.transactionId));

  const amount = tx ? Math.abs(tx.amount) : 0;
  const txDate = tx?.transaction_date || new Date().toISOString().slice(0, 10);
  const memo = args.description || tx?.description || 'Categorized bank transaction';
  const amtStr = amount > 0 ? amount.toFixed(2) : '0.00';

  if (!bankAccount.gl_account_id) {
    throw new EzityHubApiError(
      `Bank account ${bankAccount.account_name} does not have a mapped GL cash account.`,
      'INVALID_FILTER',
      400
    );
  }

  // Prepare proposal draft journal
  const lines = [
    {
      account_id: args.proposedExpenseAccountId,
      debit: amtStr,
      credit: '0.00',
      business_unit_id: args.businessUnitId || null,
      cost_centre_id: args.costCentreId || null,
      cashflow_category: null,
    },
    {
      account_id: bankAccount.gl_account_id,
      debit: '0.00',
      credit: amtStr,
      business_unit_id: null,
      cost_centre_id: null,
      cashflow_category: 'operating' as const,
    },
  ];

  const res = await client.createJournalDraft(
    {
      posting_date: txDate,
      description: `Categorization Proposal [Tx #${args.transactionId}]: ${memo}`,
      currency: 'MYR',
      lines,
    },
    {
      toolName: 'finance_propose_transaction_category',
      idempotencyKey: args.idempotencyKey,
      agentDefinitionId: args.agentDefinitionId,
      beforeState: {
        transactionId: args.transactionId,
        reconciled: false,
        categorized: false,
      },
    }
  );

  return {
    status: 'proposal_created',
    workflowState: 'Pending Approval' as const,
    transaction: {
      id: args.transactionId,
      amount,
      currency: 'MYR',
      date: txDate,
      description: memo,
      status: 'unreconciled',
    },
    proposedAccounting: {
      debitAccount: args.proposedExpenseAccountId,
      creditAccount: bankAccount.gl_account_id,
      amount,
      justification: args.justification,
      draftJournalId: res.journal?.id,
    },
    approvalNotice: {
      required: true,
      nextStep: 'Human supervisor must review and approve this draft journal in EzityHub before ledger posting and bank reconciliation.',
    },
  };
}

export async function handleCreateInvoiceDraft(
  client: EzityHubClient,
  args: z.infer<typeof createInvoiceDraftSchema>
) {
  const payloadLines = args.lines.map((l) => ({
    product_id: l.productId || null,
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    discount_pct: l.discountPct || null,
    revenue_account_id: l.revenueAccountId || null,
    business_unit_id: l.businessUnitId || null,
    cost_centre_id: l.costCentreId || null,
  }));

  const res = await client.createInvoiceDraft(
    {
      invoice_id: args.invoiceId || null,
      customer_party_id: args.customerPartyId,
      issue_date: args.issueDate,
      due_date: args.dueDate,
      notes: args.notes || null,
      sales_order_id: args.salesOrderId || null,
      auto_submit: false, // Strictly draft!
      lines: payloadLines,
    },
    {
      toolName: 'finance_create_invoice_draft',
      idempotencyKey: args.idempotencyKey,
      agentDefinitionId: args.agentDefinitionId,
    }
  );

  return {
    status: 'draft',
    workflowState: 'Draft' as const,
    invoiceId: res.invoice?.id,
    invoiceNumber: res.invoice?.invoice_number || 'DRAFT',
    customerId: args.customerPartyId,
    issueDate: args.issueDate,
    dueDate: args.dueDate,
    totalAmount: res.invoice?.total_amount,
    currency: 'MYR',
    message: 'Draft sales invoice created in EzityHub. Not submitted to customer; awaiting human review.',
  };
}

export async function handleSubmitInvoiceForApproval(
  client: EzityHubClient,
  args: z.infer<typeof submitInvoiceSchema>
) {
  if (!args.approvalId || !args.approvedBy) {
    throw new EzityHubApiError(
      'Approval required: Cannot submit invoice without verified human approval (missing approvalId/approvedBy).',
      'PERMISSION_DENIED',
      403,
      `/api/v1/finance/invoices/${args.invoiceId}/submit`
    );
  }

  const res = await client.submitInvoice(args.invoiceId, {
    toolName: 'finance_submit_invoice_for_approval',
    approvalId: args.approvalId,
    approvedBy: args.approvedBy,
    agentDefinitionId: args.agentDefinitionId,
  });

  return {
    status: 'submitted',
    workflowState: 'Pending Approval' as const,
    invoiceId: args.invoiceId,
    approvedBy: args.approvedBy,
    approvalId: args.approvalId,
    invoice: res.invoice,
    message: 'Invoice submitted successfully for human review in EzityHub.',
  };
}
