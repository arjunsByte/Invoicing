-- ==============================================================================
-- Seed Data for QORVA LABS LLP (Realistic business test data)
-- ==============================================================================

-- 1. Company Settings
UPDATE company_settings
SET 
    company_name = 'QORVA LABS LLP',
    tagline = 'Next-Gen Cloud Engineering & AI Software Solutions',
    llpin = 'ABX-9821',
    pan = 'AABFQ1234K',
    is_gst_registered = true,
    gstin = '27AABFQ1234K1Z5',
    state = 'Maharashtra',
    state_code = '27',
    address_line1 = 'Suite 402, Quantum Towers',
    address_line2 = 'S.V. Road, Malad West',
    city = 'Mumbai',
    pincode = '400064',
    country = 'India',
    email = 'accounts@qorvalabs.com',
    phone = '+91 98200 12345',
    website = 'https://qorvalabs.com',
    bank_name = 'HDFC Bank Ltd',
    bank_account_no = '50200088991122',
    bank_ifsc = 'HDFC0001234',
    bank_branch = 'Malad West Branch, Mumbai',
    bank_account_holder = 'QORVA LABS LLP',
    upi_id = 'qorvalabs@hdfcbank',
    default_currency = 'INR',
    currency_symbol = '₹',
    gst_invoice_prefix = 'QORVA/TAX/24-25/',
    non_gst_invoice_prefix = 'QORVA/INV/24-25/',
    bill_of_supply_prefix = 'QORVA/BOS/24-25/',
    quotation_prefix = 'QORVA/EST/24-25/',
    credit_note_prefix = 'QORVA/CN/24-25/'
WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- 2. Sample Products & Services
INSERT INTO products_services (id, name, description, type, sac_hsn_code, unit, default_price, gst_rate, is_active)
VALUES 
    ('b0000000-0000-0000-0000-000000000001'::uuid, 'Custom Software Architecture & Dev', 'Full-stack web application engineering and scalable cloud backend systems.', 'service', '998314', 'months', 150000.00, 18.00, true),
    ('b0000000-0000-0000-0000-000000000002'::uuid, 'Cloud Infrastructure & DevOps Setup', 'Terraform orchestration, Kubernetes deployment, and CI/CD pipelines.', 'service', '998313', 'fixed', 75000.00, 18.00, true),
    ('b0000000-0000-0000-0000-000000000003'::uuid, 'AI Model Fine-tuning & Integration', 'Custom LLM fine-tuning, RAG pipeline setup, and vector search indexing.', 'service', '998314', 'fixed', 120000.00, 18.00, true),
    ('b0000000-0000-0000-0000-000000000004'::uuid, 'Security Audit & Vulnerability Assessment', 'Comprehensive penetration testing, OWASP compliance review and code audit.', 'service', '998315', 'fixed', 50000.00, 18.00, true),
    ('b0000000-0000-0000-0000-000000000005'::uuid, 'Monthly Maintenance Retainer', 'SLA-backed priority bug fixes, uptime monitoring, and security updates.', 'service', '998314', 'months', 40000.00, 18.00, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Sample Customers
INSERT INTO customers (id, customer_type, company_name, contact_name, email, phone, billing_address, billing_city, billing_state, billing_state_code, billing_pincode, billing_country, gstin, pan, preferred_currency)
VALUES 
    ('c0000000-0000-0000-0000-000000000001'::uuid, 'business', 'Apex Omnitech Private Limited', 'Rohan Mehta', 'rohan@apexomnitech.com', '+91 99300 44556', 'Plot 18, Sector 12, BKC', 'Mumbai', 'Maharashtra', '27', '400051', 'India', '27AABCA5566K1Z1', 'AABCA5566K', 'INR'),
    ('c0000000-0000-0000-0000-000000000002'::uuid, 'business', 'Zenith FinServe Corp', 'Priya Sharma', 'priya@zenithfinserve.in', '+91 98450 77889', 'Level 5, Cyber Gateway, Hitec City', 'Hyderabad', 'Telangana', '36', '500081', 'India', '36AAACZ1122M1ZX', 'AAACZ1122M', 'INR'),
    ('c0000000-0000-0000-0000-000000000003'::uuid, 'individual', NULL, 'Dr. Vikramaditya Rao', 'vikram.rao@neuralmed.org', '+91 98111 22334', 'Flat 401, Ashoka Enclave', 'New Delhi', 'Delhi', '07', '110001', 'India', NULL, 'ABCPR9988D', 'INR')
ON CONFLICT (id) DO NOTHING;
