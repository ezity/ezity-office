# EzityHub Finance MCP Adapter (`ezityhub-mcp`)

A strictly **READ-ONLY** Model Context Protocol (MCP) server that connects AI coworkers (such as the Ezity Accountant) in Hermes to authoritative financial records in **EzityHub**.

## Architecture

```
Ezity Accountant
      ↓
Hermes Agent
      ↓ (stdio / JSON-RPC)
EzityHub MCP Adapter (`ezityhub-mcp`)
      ↓ (REST HTTP / Bearer ez_agt_*)
EzityHub API (`/api/v1/...`)
      ↓
EzityHub Core / Supabase
```

> **Security Note:** Direct Supabase database access is prohibited. All queries flow through authenticated EzityHub API endpoints.

## Implemented Read-Only Tools

| MCP Tool                                 | EzityHub Endpoint                                                                | Required Permissions                                  | Purpose                                                       |
| :--------------------------------------- | :------------------------------------------------------------------------------- | :---------------------------------------------------- | :------------------------------------------------------------ |
| `finance_get_bank_accounts`              | `GET /api/v1/finance/bank-accounts`                                              | `finance.bank.manage` \| `finance.bank.reconcile`     | List treasury bank accounts and mapped GL codes               |
| `finance_get_transactions`               | `GET /api/v1/finance/bank-accounts/{id}/transactions`                            | `finance.bank.reconcile` \| `accounting.journal.read` | Retrieve bank transactions for an account & period            |
| `finance_get_uncategorized_transactions` | `GET /api/v1/finance/bank-accounts/{id}/transactions?unreconciled_only=true`     | `finance.bank.reconcile` \| `accounting.journal.read` | Retrieve unposted / uncategorized bank items                  |
| `finance_get_expenses`                   | `GET /api/v1/accounting/entries`                                                 | `accounting.journal.read`                             | Retrieve posted expense transactions & journal lines          |
| `finance_get_invoices`                   | `GET /api/v1/finance/invoices`                                                   | `finance.invoice.read`                                | Query sales invoices by status or customer                    |
| `finance_get_invoice`                    | `GET /api/v1/finance/invoices/{id}`                                              | `finance.invoice.read`                                | Inspect invoice details, line items, and approval state       |
| `finance_get_overdue_invoices`           | `GET /api/v1/finance/reports/ar-ageing`                                          | `finance.invoice.read` \| `finance.receipt.read`      | Retrieve Accounts Receivable overdue ageing analysis          |
| `finance_get_account_balances`           | `GET /api/v1/accounting/reports/trial-balance` & `/api/v1/finance/bank-accounts` | `accounting.journal.read`                             | Combined liquid bank balances and trial balance GL items      |
| `finance_get_general_ledger`             | `GET /api/v1/accounting/reports/general-ledger`                                  | `accounting.journal.read`                             | GL transactions and running balance for an account            |
| `finance_get_profit_loss`                | `GET /api/v1/accounting/reports/profit-and-loss`                                 | `accounting.journal.read`                             | Official Profit and Loss statement (revenues & expenses)      |
| `finance_get_cashflow`                   | `GET /api/v1/accounting/reports/cash-flow`                                       | `accounting.journal.read`                             | Statement of Cash Flows (operating, investing, financing)     |
| `finance_get_balance_sheet`              | `GET /api/v1/accounting/reports/balance-sheet`                                   | `accounting.journal.read`                             | Statement of Financial Position (assets, liabilities, equity) |
| `finance_get_financial_summary`          | Aggregated (`/agent/me`, P&L, bank accounts, AR ageing)                          | Read-only finance permissions                         | High-level executive financial health briefing                |

## Authentication & Service Identity

The adapter uses a dedicated machine agent token created in EzityHub:

- Format: `ez_agt_live_<random>`
- Service Identity: `ai-accountant@ezity.internal` / `hermes-accountant`
- Minimum Read-Only Permissions:
  - `accounting.journal.read`
  - `accounting.setup.read`
  - `finance.bank.manage`
  - `finance.bank.reconcile`
  - `finance.invoice.read`
  - `finance.receipt.read`

Forbidden permissions:

- `accounting.journal.prepare`
- `finance.invoice.create`
- `finance.invoice.submit`
- `finance.receipt.create`
- Any mutation / deletion / administrative permissions.

## Hermes Configuration

In `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  ezityhub-finance:
    command: node
    args:
      - /path/to/ezityhub-mcp/dist/index.js
    env:
      EZITYHUB_API_URL: http://localhost:3000
      EZITYHUB_API_TOKEN: ez_agt_live_...
      EZITYHUB_TIMEOUT_MS: '15000'
```

## Running Locally

```bash
npm install
npm run build
npm test
```
