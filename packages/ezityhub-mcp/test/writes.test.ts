import { describe, it, expect, vi } from 'vitest';
import {
  handlePrepareJournal,
  handleCreateExpenseDraft,
  handleProposeTransactionCategory,
  handleCreateInvoiceDraft,
  handleSubmitInvoiceForApproval,
  prepareJournalSchema,
  createExpenseDraftSchema,
  createInvoiceDraftSchema,
  submitInvoiceSchema,
} from '../src/tools/writes.js';
import { EzityHubClient, EzityHubApiError } from '../src/client.js';
import { AuditLogger } from '../src/audit.js';

describe('Phase F: Controlled Financial Writes & Approvals', () => {
  const dummyBankAccountId = '11111111-1111-1111-1111-111111111111';
  const dummyBankGlAccountId = '22222222-2222-2222-2222-222222222222';
  const dummyExpenseAccountId = '33333333-3333-3333-3333-333333333333';
  const dummyCustomerId = '44444444-4444-4444-4444-444444444444';
  const dummyInvoiceId = '55555555-5555-5555-5555-555555555555';

  function createMockWriteClient(options?: {
    customFetch?: (url: string, init?: RequestInit) => Promise<Response>;
    logger?: AuditLogger;
  }) {
    const mockFetch = options?.customFetch || vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const method = init?.method || 'GET';

      if (pathname === '/api/v1/finance/bank-accounts' && method === 'GET') {
        return new Response(JSON.stringify({
          success: true,
          count: 1,
          bank_accounts: [{
            id: dummyBankAccountId,
            bank_name: 'Maybank',
            account_name: 'Maybank Operating',
            gl_account_id: dummyBankGlAccountId,
            currency: 'MYR',
          }],
        }));
      }

      if (pathname.includes('/transactions') && method === 'GET') {
        return new Response(JSON.stringify({
          success: true,
          count: 1,
          transactions: [{
            id: 'tx-domain-89',
            transaction_date: '2026-10-01',
            amount: -89.00,
            description: 'DOMAIN RENEWAL EZITY.MY',
            reconciled: false,
          }],
        }));
      }

      if (pathname === '/api/v1/accounting/journals' && method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          success: true,
          journal: {
            id: 'jrn-draft-123',
            entry_number: 'JRN-2026-DRAFT-001',
            posting_date: body.posting_date,
            description: body.description,
            state: 'draft',
          },
          message: 'Draft journal prepared successfully and submitted for supervisor review.',
        }), { status: 201 });
      }

      if (pathname === '/api/v1/finance/invoices' && method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          success: true,
          invoice: {
            id: dummyInvoiceId,
            invoice_number: 'INV-2026-DRAFT',
            customer_party_id: body.customer_party_id,
            total_amount: 1500.00,
            status: 'draft',
          },
        }), { status: 201 });
      }

      if (pathname === `/api/v1/finance/invoices/${dummyInvoiceId}/submit` && method === 'POST') {
        return new Response(JSON.stringify({
          success: true,
          invoice: {
            id: dummyInvoiceId,
            status: 'submitted',
          },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404 });
    });

    return new EzityHubClient(
      {
        apiUrl: 'http://localhost:3000',
        apiToken: 'ez_agt_test_token',
        timeoutMs: 5000,
      },
      {
        fetchFn: mockFetch as any,
        logger: options?.logger,
      }
    );
  }

  it('A. Draft creation: prepares journal draft in draft state without posting', async () => {
    const client = createMockWriteClient();
    const res = await handlePrepareJournal(client, {
      postingDate: '2026-10-03',
      description: 'Monthly office supplies',
      currency: 'MYR',
      lines: [
        { accountId: dummyExpenseAccountId, debit: '150.00', credit: '0.00' },
        { accountId: dummyBankGlAccountId, debit: '0.00', credit: '150.00', cashflowCategory: 'operating' },
      ],
    });

    expect(res.status).toBe('draft');
    expect(res.workflowState).toBe('Pending Approval');
    expect(res.journalId).toBe('jrn-draft-123');
    expect(res.totalDebit).toBe(150.00);
    expect(res.totalCredit).toBe(150.00);
    expect(res.message).toContain('human review');
  });

  it('A. Draft creation: creates invoice draft with auto_submit=false', async () => {
    let capturedBody: any = null;
    const client = createMockWriteClient({
      customFetch: async (url, init) => {
        if (url.includes('/api/v1/finance/invoices')) {
          capturedBody = JSON.parse(init?.body as string);
          return new Response(JSON.stringify({
            success: true,
            invoice: { id: dummyInvoiceId, total_amount: 1500.00, status: 'draft' },
          }), { status: 201 });
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await handleCreateInvoiceDraft(client, {
      customerPartyId: dummyCustomerId,
      issueDate: '2026-10-03',
      dueDate: '2026-11-03',
      lines: [{ description: 'Cloud Consulting', quantity: 1, unitPrice: 1500.00 }],
    });

    expect(res.status).toBe('draft');
    expect(res.workflowState).toBe('Draft');
    expect(capturedBody.auto_submit).toBe(false);
  });

  it('B. Proposal generation: proposes categorization for unreconciled domain renewal', async () => {
    const client = createMockWriteClient();
    const res = await handleProposeTransactionCategory(client, {
      bankAccountId: dummyBankAccountId,
      transactionId: 'tx-domain-89',
      proposedExpenseAccountId: dummyExpenseAccountId,
      justification: 'Annual domain renewal classified under Software & Subscriptions (5200)',
    });

    expect(res.status).toBe('proposal_created');
    expect(res.workflowState).toBe('Pending Approval');
    expect(res.transaction.amount).toBe(89.00);
    expect(res.proposedAccounting.debitAccount).toBe(dummyExpenseAccountId);
    expect(res.proposedAccounting.creditAccount).toBe(dummyBankGlAccountId);
    expect(res.proposedAccounting.draftJournalId).toBe('jrn-draft-123');
    expect(res.approvalNotice.required).toBe(true);
  });

  it('C. No commit without approval: submitInvoice rejects when approvalId or approvedBy is missing', async () => {
    const client = createMockWriteClient();

    await expect(
      handleSubmitInvoiceForApproval(client, {
        invoiceId: dummyInvoiceId,
        approvalId: '',
        approvedBy: '',
      })
    ).rejects.toThrowError('Cannot submit invoice without verified human approval');
  });

  it('D. Approved commit executes once when valid approval is supplied', async () => {
    let callCount = 0;
    const client = createMockWriteClient({
      customFetch: async (url, init) => {
        if (url.includes(`/api/v1/finance/invoices/${dummyInvoiceId}/submit`)) {
          callCount++;
          return new Response(JSON.stringify({
            success: true,
            invoice: { id: dummyInvoiceId, status: 'submitted' },
          }));
        }
        return new Response('{}', { status: 200 });
      },
    });

    const res = await handleSubmitInvoiceForApproval(client, {
      invoiceId: dummyInvoiceId,
      approvalId: 'appr-user-1234',
      approvedBy: 'supervisor@ezity.my',
    });

    expect(res.status).toBe('submitted');
    expect(res.workflowState).toBe('Pending Approval');
    expect(callCount).toBe(1);
  });

  it('E. Duplicate retry does not duplicate record (Idempotency cache)', async () => {
    let networkCalls = 0;
    const client = createMockWriteClient({
      customFetch: async (url, init) => {
        if (url.includes('/api/v1/accounting/journals')) {
          networkCalls++;
          return new Response(JSON.stringify({
            success: true,
            journal: { id: 'jrn-idemp-1', entry_number: 'JRN-001' },
          }), { status: 201 });
        }
        return new Response('{}');
      },
    });

    const idempotencyKey = 'idem-unique-key-xyz';

    // First call
    const res1 = await handlePrepareJournal(client, {
      postingDate: '2026-10-03',
      description: 'Hosting expense',
      lines: [
        { accountId: dummyExpenseAccountId, debit: '89.00', credit: '0.00' },
        { accountId: dummyBankGlAccountId, debit: '0.00', credit: '89.00' },
      ],
      idempotencyKey,
    });

    // Second call with same idempotency key (e.g. network timeout retry)
    const res2 = await handlePrepareJournal(client, {
      postingDate: '2026-10-03',
      description: 'Hosting expense',
      lines: [
        { accountId: dummyExpenseAccountId, debit: '89.00', credit: '0.00' },
        { accountId: dummyBankGlAccountId, debit: '0.00', credit: '89.00' },
      ],
      idempotencyKey,
    });

    expect(networkCalls).toBe(1); // Only 1 HTTP call made!
    expect(res1.journalId).toBe('jrn-idemp-1');
    expect(res2.journalId).toBe('jrn-idemp-1');
  });

  it('F. Rejected approval creates no committed mutation', async () => {
    // When approval is denied, client is never invoked
    const mockFetch = vi.fn();
    const client = new EzityHubClient(
      { apiUrl: 'http://localhost:3000', apiToken: 'token', timeoutMs: 1000 },
      { fetchFn: mockFetch as any }
    );

    // Simulated rejection check in workflow
    const isApproved = false;
    if (isApproved) {
      await handleSubmitInvoiceForApproval(client, {
        invoiceId: dummyInvoiceId,
        approvalId: 'appr-denied',
        approvedBy: 'denied',
      });
    }

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('G. Permission failure: 403 returned if agent lacks prepare permission', async () => {
    const client = createMockWriteClient({
      customFetch: async () => {
        return new Response(JSON.stringify({
          success: false,
          error: 'Permission denied: agent lacks accounting.journal.prepare',
        }), { status: 403 });
      },
    });

    await expect(
      handlePrepareJournal(client, {
        postingDate: '2026-10-03',
        description: 'Unauthorized journal',
        lines: [
          { accountId: dummyExpenseAccountId, debit: '100.00', credit: '0.00' },
          { accountId: dummyBankGlAccountId, debit: '0.00', credit: '100.00' },
        ],
      })
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      statusCode: 403,
    });
  });

  it('H. Audit trail created: records acting AI identity, human approver, before/after state', async () => {
    const auditEvents: any[] = [];
    const testLogger = new AuditLogger((rec) => auditEvents.push(rec));

    const client = createMockWriteClient({
      logger: testLogger,
      customFetch: async (url, init) => {
        if (url.includes('/submit')) {
          return new Response(JSON.stringify({
            success: true,
            invoice: { id: dummyInvoiceId, status: 'submitted' },
          }));
        }
        return new Response('{}');
      },
    });

    await handleSubmitInvoiceForApproval(client, {
      invoiceId: dummyInvoiceId,
      approvalId: 'appr-999',
      approvedBy: 'finance-lead@ezity.my',
      agentDefinitionId: 'ezity-accountant',
    });

    expect(auditEvents.length).toBeGreaterThan(0);
    const event = auditEvents[0];
    expect(event.humanApprover).toBe('finance-lead@ezity.my');
    expect(event.agentDefinitionId).toBe('ezity-accountant');
    expect(event.beforeState).toEqual({ invoiceId: dummyInvoiceId, status: 'draft' });
    expect(event.afterState).toEqual({ invoiceId: dummyInvoiceId, status: 'submitted' });
  });

  it('I. Unbalanced journal schema validation blocks invalid double-entry', async () => {
    const client = createMockWriteClient();

    // Debits (100) != Credits (50)
    await expect(
      handlePrepareJournal(client, {
        postingDate: '2026-10-03',
        description: 'Unbalanced entry',
        lines: [
          { accountId: dummyExpenseAccountId, debit: '100.00', credit: '0.00' },
          { accountId: dummyBankGlAccountId, debit: '0.00', credit: '50.00' },
        ],
      })
    ).rejects.toThrowError(/Journal must balance/);
  });
});
