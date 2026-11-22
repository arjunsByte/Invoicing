-- ==============================================================================
-- QORVA LABS LLP - Database Schema & Security Migration
-- Description: Complete schema for personal business invoicing, GST compliance,
--              quotations, manual payment tracking, expenses, and audit logs.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. COMPANY SETTINGS (Single-tenant Owner Profile)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'QORVA LABS LLP',
    tagline TEXT DEFAULT 'Enterprise Software & Cloud Systems',
    llpin TEXT,
    pan TEXT,
    is_gst_registered BOOLEAN NOT NULL DEFAULT false,
    gstin TEXT,
    state TEXT DEFAULT 'Maharashtra',
    state_code TEXT DEFAULT '27',
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    email TEXT DEFAULT 'owner@qorvalabs.com',
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_branch TEXT,
    bank_account_holder TEXT DEFAULT 'QORVA LABS LLP',
    upi_id TEXT,
    default_currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    financial_year_start INTEGER NOT NULL DEFAULT 4, -- 4 = April (Indian FY)
    gst_invoice_prefix TEXT NOT NULL DEFAULT 'QORVA/TAX/',
    non_gst_invoice_prefix TEXT NOT NULL DEFAULT 'QORVA/INV/',
    bill_of_supply_prefix TEXT NOT NULL DEFAULT 'QORVA/BOS/',
    quotation_prefix TEXT NOT NULL DEFAULT 'QORVA/EST/',
    credit_note_prefix TEXT NOT NULL DEFAULT 'QORVA/CN/',
    default_payment_terms TEXT DEFAULT 'Payment due within 15 days of invoice date.',
    default_notes TEXT DEFAULT 'Thank you for choosing QORVA LABS LLP. We appreciate your business!',
    terms_and_conditions TEXT DEFAULT '1. Goods/Services once billed cannot be returned without valid credit note. 2. Payments via NEFT/RTGS/IMPS/UPI. 3. Disputes subject to local jurisdiction.',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for company_settings
DROP TRIGGER IF EXISTS trigger_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_company_settings_updated_at
BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial company profile if empty
INSERT INTO company_settings (id, company_name, is_gst_registered, email)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, 'QORVA LABS LLP', false, 'owner@qorvalabs.com'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);


-- 2. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_type TEXT NOT NULL CHECK (customer_type IN ('business', 'individual')) DEFAULT 'business',
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    billing_address TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_state_code TEXT,
    billing_pincode TEXT,
    billing_country TEXT DEFAULT 'India',
    shipping_address TEXT,
    gstin TEXT,
    pan TEXT,
    preferred_currency TEXT DEFAULT 'INR',
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);
CREATE INDEX IF NOT EXISTS idx_customers_is_archived ON customers(is_archived);

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 3. PRODUCTS & SERVICES
CREATE TABLE IF NOT EXISTS products_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('service', 'goods')) DEFAULT 'service',
    sac_hsn_code TEXT,
    unit TEXT NOT NULL DEFAULT 'units',
    default_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_services_is_active ON products_services(is_active);

DROP TRIGGER IF EXISTS trigger_products_services_updated_at ON products_services;
CREATE TRIGGER trigger_products_services_updated_at
BEFORE UPDATE ON products_services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 4. QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE NOT NULL,
    quotation_type TEXT NOT NULL CHECK (quotation_type IN ('gst', 'non_gst')) DEFAULT 'gst',
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'accepted', 'rejected', 'expired', 'converted')) DEFAULT 'draft',
    converted_to_invoice_id UUID,
    place_of_supply TEXT,
    place_of_supply_state_code TEXT,
    is_interstate BOOLEAN DEFAULT false,
    currency TEXT NOT NULL DEFAULT 'INR',
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
    discount_value NUMERIC(14, 2) DEFAULT 0.00,
    discount_amount NUMERIC(14, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_tax NUMERIC(14, 2) DEFAULT 0.00,
    round_off NUMERIC(6, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_in_words TEXT,
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);

DROP TRIGGER IF EXISTS trigger_quotations_updated_at ON quotations;
CREATE TRIGGER trigger_quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 5. QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    sac_hsn_code TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit TEXT DEFAULT 'units',
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    cgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);


-- 6. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('gst_tax_invoice', 'non_gst_invoice', 'bill_of_supply')) DEFAULT 'gst_tax_invoice',
    financial_year TEXT NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    place_of_supply TEXT,
    place_of_supply_state_code TEXT,
    is_interstate BOOLEAN DEFAULT false,
    reverse_charge BOOLEAN DEFAULT false,
    currency TEXT NOT NULL DEFAULT 'INR',
    exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
    discount_value NUMERIC(14, 2) DEFAULT 0.00,
    discount_amount NUMERIC(14, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_tax NUMERIC(14, 2) DEFAULT 0.00,
    round_off NUMERIC(6, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_in_words TEXT,
    notes TEXT,
    terms_and_conditions TEXT,
    pdf_url TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_financial_year ON invoices(financial_year);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 7. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products_services(id) ON DELETE SET NULL,
    item_description TEXT NOT NULL,
    sac_hsn_code TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit TEXT DEFAULT 'units',
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5, 2) DEFAULT 0.00,
    cgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);


-- 8. PAYMENTS (Manual Payment Tracking with Reversal Ledger)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'bank_transfer', 'cash', 'cheque', 'credit_card', 'other')) DEFAULT 'bank_transfer',
    transaction_reference TEXT,
    notes TEXT,
    receipt_url TEXT,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 9. CREDIT NOTES
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_number TEXT UNIQUE NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL CHECK (reason IN ('cancellation', 'deficiency_in_service', 'change_in_value', 'other')) DEFAULT 'cancellation',
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);


-- 10. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_gstin TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'upi', 'credit_card', 'cash', 'other')) DEFAULT 'bank_transfer',
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Owner-Only Access
-- ==============================================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner Authenticated Full Access Policies
-- These policies verify that the request comes from an authenticated user.
-- At the application middleware & server layer, we strictly guard process.env.OWNER_EMAIL.

CREATE POLICY "Owner access to company_settings" ON company_settings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to customers" ON customers
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to products_services" ON products_services
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to quotations" ON quotations
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to quotation_items" ON quotation_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to invoices" ON invoices
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to invoice_items" ON invoice_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to payments" ON payments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to credit_notes" ON credit_notes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to expenses" ON expenses
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to audit_logs" ON audit_logs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Explicit table privileges are required in addition to RLS policies. These
-- grants also cover projects where default privileges were changed or tables
-- were created from the SQL editor.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    company_settings,
    customers,
    products_services,
    quotations,
    quotation_items,
    invoices,
    invoice_items,
    payments,
    credit_notes,
    expenses,
    audit_logs
TO authenticated, service_role;
