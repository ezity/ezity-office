export interface EzityHubConfig {
  apiUrl: string
  apiToken: string
  timeoutMs: number
}

export interface AuditRecord {
  timestamp: string
  requestId: string
  toolName: string
  endpoint: string
  method: string
  status: 'success' | 'failure'
  statusCode?: number
  durationMs: number
  error?: string
}

export type ErrorCode =
  | 'AUTH_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'INVALID_FILTER'
  | 'INTERNAL_ERROR'

export interface StructuredErrorResponse {
  error: true
  code: ErrorCode
  message: string
  endpoint?: string
  details?: unknown
}

export interface BankAccount {
  id: string
  bank_name: string
  account_name: string
  account_number: string
  currency: string
  gl_account_id?: string
  current_balance?: number
}

export interface BankTransaction {
  id: string
  bank_account_id: string
  transaction_date: string
  amount: number
  direction?: 'inflow' | 'outflow' | 'debit' | 'credit'
  description: string
  reference?: string
  reconciled: boolean
  categorized?: boolean
}

export interface PostedEntryLine {
  id?: string
  account_id: string
  account_code?: string
  account_name?: string
  account_type?: string
  debit: number | string
  credit: number | string
  description?: string
  business_unit_id?: string
  cost_centre_id?: string
}

export interface PostedEntry {
  id: string
  entry_number?: string
  posting_date: string
  description: string
  source_document_type?: string
  source_document_id?: string
  lines: Array<PostedEntryLine>
}

export interface InvoiceItem {
  id: string
  invoice_number: string
  customer_id?: string
  customer_name?: string
  issue_date: string
  due_date: string
  status: 'draft' | 'submitted' | 'posted' | 'paid' | 'overdue'
  subtotal: number
  tax_amount: number
  total_amount: number
  balance_due: number
  currency: string
}

export interface ArAgeingItem {
  customer_id: string
  customer_name: string
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
  total_outstanding: number
}

export interface TrialBalanceItem {
  account_id: string
  account_code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  debit_balance: number
  credit_balance: number
  net_balance: number
}

export type WorkflowState =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Posted'
  | 'Rejected'

export interface WriteAuditRecord extends AuditRecord {
  actingAgentId?: string
  agentDefinitionId?: string
  humanApprover?: string
  idempotencyKey?: string
  recordId?: string
  beforeState?: unknown
  afterState?: unknown
}

export interface JournalLineDraftInput {
  account_id: string
  debit: string
  credit: string
  business_unit_id?: string | null
  cost_centre_id?: string | null
  cashflow_category?:
    | 'operating'
    | 'investing'
    | 'financing'
    | 'internal_transfer'
    | null
}

export interface CreateJournalDraftInput {
  posting_date: string
  description: string
  currency?: 'MYR'
  lines: Array<JournalLineDraftInput>
}

export interface InvoiceLineDraftInput {
  product_id?: string | null
  description: string
  quantity: number
  unit_price: number
  discount_pct?: number | null
  revenue_account_id?: string | null
  business_unit_id?: string | null
  cost_centre_id?: string | null
}

export interface CreateInvoiceDraftInput {
  invoice_id?: string | null
  customer_party_id: string
  issue_date: string
  due_date: string
  notes?: string | null
  sales_order_id?: string | null
  auto_submit?: boolean
  lines: Array<InvoiceLineDraftInput>
}

// ─── Phase G Real-Time Event Streaming Types ─────────────────────────

export type EzityHubEventType =
  | 'connected'
  | 'accounting.journal.submitted.v1'
  | 'accounting.journal.resolved.v1'
  | 'sales.quotation.submitted.v1'
  | 'sales.quotation.resolved.v1'
  | 'identity.access.requested.v1'
  | 'identity.access.resolved.v1'
  | (string & {})

export interface EzityHubConnectedData {
  status: 'connected'
  agent: {
    membership_id: string
    name: string
    organization_id: string
  }
  server_time: string
}

export interface EzityHubJournalSubmittedData {
  journal_id: string
  entry_number?: string
  status?: string
  submitted_by?: string
}

export interface EzityHubJournalResolvedData {
  journal_id: string
  state: 'posted' | 'rejected'
  decision: 'approved' | 'rejected'
  reason?: string | null
  decided_at: string
  decided_by: string
}

export interface EzityHubEventNotification<T = Record<string, any>> {
  id: string
  event_id?: string
  event_type: EzityHubEventType
  category?: string
  title?: string
  subtitle?: string
  link?: string
  source_document_id?: string
  created_at: string
  read_at?: string | null
  organization_id?: string
  data: T
}

export interface CorrelatedFinancialLifecycleEvent {
  eventId: string
  eventType: string
  recordId: string // e.g. journal_id
  workflowState: WorkflowState
  actor?: string
  reason?: string | null
  timestamp: string
  organizationId?: string
  correlationId?: string
  rawEvent?: EzityHubEventNotification
}
