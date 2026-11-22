-- Apply this once in Supabase SQL Editor if the schema migration was already run
-- and the app reports "permission denied for table customers".
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
