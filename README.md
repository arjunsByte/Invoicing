# QORVA LABS LLP - Business Invoicing & Sales Management System

A production-ready, private, single-tenant internal business management web application built exclusively for the owner of **QORVA LABS LLP**.

---

## 1. Product Purpose & Security Model

This system is an internal financial tool and management suite. Customers **never** have accounts or access to the dashboard.

- **Private Authentication**: Exclusively accessible to the owner via preconfigured email (`OWNER_EMAIL`).
- **No Public Registration**: Public signups are permanently disabled.
- **Edge Route Protection**: Every route is guarded via Next.js Edge Middleware and server-side session verification.
- **Row Level Security (RLS)**: Enforced across all Supabase PostgreSQL tables.
- **Service Role Isolation**: Server-only operations; service keys are never bundled into client assets.
- **Issued Invoice Immutability**: Once an invoice is issued, silent inline edits are locked. Modifications require recorded cancellations or credit note adjustments.

---

## 2. Tech Stack

- **Framework**: Next.js 15 App Router (TypeScript)
- **Styling**: Tailwind CSS & Modern SaaS Minimalist Palette
- **Database & Storage**: Supabase PostgreSQL + Supabase Storage
- **Charts & Visualizations**: Recharts (Executive sales, collections, and margin trends)
- **PDF Generation**: Client & Server jsPDF Vector Engine (Indian Tax Invoice formats)
- **Testing**: Node Native Test Runner with TypeScript (`tsx --test`)
- **Deployment**: Vercel Serverless / Edge Platform

---

## 3. Core Modules

| Module | Features |
|---|---|
| **Executive Dashboard** | Total sales, GST sales, non-GST sales, cash collections, receivables, overdue invoices, expenses, dual cash flow vs accounting profit metrics, Recharts area & pie charts, date filters. |
| **Sales Insights** | Deep revenue analytics, product/service breakdown, customer acquisition, repeat client ratios, top 10 lifetime customers, expense-to-sales comparison. |
| **Customer Registry** | Permanent customer database (business vs individual), GSTIN, PAN, billing address, duplicate checks, full ledger and associated invoices/quotes. |
| **GST Tax Invoices** | Intra-state (CGST + SGST 50/50) vs Inter-state (IGST 100%), Place of Supply, HSN/SAC codes, Rule 46 CGST Act compliance, Indian numbering words, round-off. |
| **Non-GST Commercial Bills** | Clean commercial billing with zero GST charged or displayed, avoiding tax misrepresentation. |
| **Bill of Supply** | Standard format for composition and tax-exempt services. |
| **Quotation Engine** | Professional estimates with validity dates, terms, and **1-click conversion** to locked invoices. |
| **Manual Payment Tracking** | Records partial/full settlements, payment methods (UPI, NEFT, RTGS, Cheque, Card), UTR transaction references, receipts, and **audit-logged payment reversals**. |
| **Service Catalogue** | Reusable offerings with SAC/HSN codes, default prices, and tax rates. |
| **Business Expenses & ITC** | Operational costs tracking with eligible GST Input Tax Credit (ITC) ledger. |
| **Reports & Backups** | GST tax schedules (GSTR-1 vs GSTR-3B), Full JSON database backups, CSV exports for invoices, customers, and expenses. |
| **Settings & Profile** | QORVA LABS LLP profile, LLPIN, PAN, GSTIN, Bank account & IFSC, UPI ID, numbering prefixes, and **GST registration toggle**. |

---

## 4. Setup & Deployment Guide

### A. Supabase Database Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Authentication -> Settings** and disable **"Enable Email Signups"**.
3. Create the Owner user under **Authentication -> Users** using your preconfigured email (e.g. `owner@qorvalabs.com`).
4. In the **SQL Editor**, run the migration file located at:
   ```
   supabase/migrations/20261122000000_init.sql
   ```
5. (Optional) Run `supabase/seed.sql` for realistic initial company profiles and catalogues.

### B. Vercel Deployment
The application uses Supabase when configured. Its local JSON fallback (`.local-data.json`) uses atomic file replacement, but does not lock across processes; concurrent writes from multiple workers or instances can overwrite each other. Do not use the JSON fallback for multi-instance deployments. Configure Supabase or another transactional database before deploying that way. The application logs a warning when it uses the JSON fallback.

1. Push repository to GitHub.
2. In Vercel, click **"Add New Project"** and import the repository.
3. Configure the following Environment Variables in Vercel:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   OWNER_EMAIL=owner@qorvalabs.com
   NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
   ```
4. Click **Deploy**. Next.js will build and serve the application globally.

---

## 5. Local Development & Automated Tests

```bash
# Install dependencies
npm install

# Run automated unit and integration tests
npm test

# Run Next.js production build verification
npm run build

# Start development server
npm run dev
```

---

## 6. Project Structure

```
qorva-invoicing/
├── app/
│   ├── (auth)/login, unauthorized
│   ├── (dashboard)/
│   │   ├── page.tsx (Executive Dashboard)
│   │   ├── insights/ (Sales Analytics)
│   │   ├── customers/ (Customer Database)
│   │   ├── invoices/ (GST/Non-GST Invoices)
│   │   ├── quotations/ (Quotations & Conversion)
│   │   ├── payments/ (Payment Tracking & Reversals)
│   │   ├── products/ (Service Catalogue)
│   │   ├── expenses/ (Expenses & ITC Ledger)
│   │   ├── reports/ (Reports & Backups)
│   │   └── settings/ (LLPIN, GSTIN, Bank, Prefixes)
│   └── api/ (Next.js server-side route handlers)
├── components/ (Dashboard, Invoices, Customers, Charts, UI)
├── lib/
│   ├── financial/ (GST engine, Indian number-to-words, FY numbering)
│   ├── pdf/ (jsPDF vector document generation)
│   └── db/ (data store with full validation & Supabase integration)
├── supabase/migrations/ (PostgreSQL schema & RLS policies)
└── tests/ (Automated test suite)
```
