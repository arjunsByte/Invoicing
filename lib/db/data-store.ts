import {
  CompanySettings,
  Customer,
  ProductService,
  Invoice,
  InvoiceItem,
  Quotation,
  QuotationItem,
  Payment,
  Expense,
  CreditNote,
  AuditLog,
  InvoiceStatus,
} from "@/lib/types/database";
import { calculateLineItemTax, calculateDocumentTotals } from "@/lib/financial/gst-calculator";
import { numberToIndianWords } from "@/lib/financial/number-to-words";
import { getFinancialYear, generateNextDocumentNumber } from "@/lib/financial/invoice-numbering";
import fs from "fs";
import path from "path";

// In-memory or file-backed storage when Supabase is not connected
const DATA_FILE_PATH = path.join(process.cwd(), ".local-data.json");

interface LocalDataState {
  companySettings: CompanySettings;
  customers: Customer[];
  productsServices: ProductService[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  creditNotes: CreditNote[];
  expenses: Expense[];
  auditLogs: AuditLog[];
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: "a0000000-0000-0000-0000-000000000001",
  company_name: "QORVA LABS LLP",
  tagline: "Next-Gen Cloud Engineering & Enterprise Software Solutions",
  llpin: "ABX-9821",
  pan: "AABFQ1234K",
  is_gst_registered: true,
  gstin: "27AABFQ1234K1Z5",
  state: "Maharashtra",
  state_code: "27",
  address_line1: "Suite 402, Quantum Towers",
  address_line2: "S.V. Road, Malad West",
  city: "Mumbai",
  pincode: "400064",
  country: "India",
  email: "owner@qorvalabs.com",
  phone: "+91 98200 12345",
  website: "https://qorvalabs.com",
  bank_name: "HDFC Bank Ltd",
  bank_account_no: "50200088991122",
  bank_ifsc: "HDFC0001234",
  bank_branch: "Malad West Branch, Mumbai",
  bank_account_holder: "QORVA LABS LLP",
  upi_id: "qorvalabs@hdfcbank",
  default_currency: "INR",
  currency_symbol: "₹",
  financial_year_start: 4,
  gst_invoice_prefix: "QORVA/TAX/{FY}/",
  non_gst_invoice_prefix: "QORVA/INV/{FY}/",
  bill_of_supply_prefix: "QORVA/BOS/{FY}/",
  quotation_prefix: "QORVA/EST/{FY}/",
  credit_note_prefix: "QORVA/CN/{FY}/",
  default_payment_terms: "Payment due within 15 days of invoice date.",
  default_notes: "Thank you for choosing QORVA LABS LLP. We appreciate your business!",
  terms_and_conditions: "1. Goods/Services once billed cannot be returned without valid credit note. 2. Payments via NEFT/RTGS/IMPS/UPI. 3. Disputes subject to local jurisdiction.",
  updated_at: new Date().toISOString(),
};

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    customer_type: "business",
    company_name: "Apex Omnitech Private Limited",
    contact_name: "Rohan Mehta",
    email: "rohan@apexomnitech.com",
    phone: "+91 99300 44556",
    billing_address: "Plot 18, Sector 12, BKC",
    billing_city: "Mumbai",
    billing_state: "Maharashtra",
    billing_state_code: "27",
    billing_pincode: "400051",
    billing_country: "India",
    gstin: "27AABCA5566K1Z1",
    pan: "AABCA5566K",
    preferred_currency: "INR",
    notes: "Key enterprise client for cloud DevOps services.",
    is_archived: false,
    created_at: "2026-08-15T10:00:00Z",
    updated_at: "2026-08-15T10:00:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    customer_type: "business",
    company_name: "Zenith FinServe Corp",
    contact_name: "Priya Sharma",
    email: "priya@zenithfinserve.in",
    phone: "+91 98450 77889",
    billing_address: "Level 5, Cyber Gateway, Hitec City",
    billing_city: "Hyderabad",
    billing_state: "Telangana",
    billing_state_code: "36",
    billing_pincode: "500081",
    billing_country: "India",
    gstin: "36AAACZ1122M1ZX",
    pan: "AAACZ1122M",
    preferred_currency: "INR",
    notes: "Interstate client requiring IGST invoicing.",
    is_archived: false,
    created_at: "2026-09-01T11:30:00Z",
    updated_at: "2026-09-01T11:30:00Z",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    customer_type: "individual",
    contact_name: "Dr. Vikramaditya Rao",
    email: "vikram.rao@neuralmed.org",
    phone: "+91 98111 22334",
    billing_address: "Flat 401, Ashoka Enclave",
    billing_city: "New Delhi",
    billing_state: "Delhi",
    billing_state_code: "07",
    billing_pincode: "110001",
    billing_country: "India",
    pan: "ABCPR9988D",
    preferred_currency: "INR",
    notes: "Specialized AI healthcare consulting.",
    is_archived: false,
    created_at: "2026-10-10T14:20:00Z",
    updated_at: "2026-10-10T14:20:00Z",
  },
];

const DEFAULT_PRODUCTS: ProductService[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "Custom Software Architecture & Dev",
    description: "Full-stack web application engineering and scalable cloud backend systems.",
    type: "service",
    sac_hsn_code: "998314",
    unit: "months",
    default_price: 150000.0,
    gst_rate: 18.0,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Cloud Infrastructure & DevOps Setup",
    description: "Terraform orchestration, Kubernetes deployment, and CI/CD pipelines.",
    type: "service",
    sac_hsn_code: "998313",
    unit: "fixed",
    default_price: 75000.0,
    gst_rate: 18.0,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "AI Model Fine-tuning & Integration",
    description: "Custom LLM fine-tuning, RAG pipeline setup, and vector search indexing.",
    type: "service",
    sac_hsn_code: "998314",
    unit: "fixed",
    default_price: 120000.0,
    gst_rate: 18.0,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    name: "Security Audit & Vulnerability Assessment",
    description: "Comprehensive penetration testing, OWASP compliance review and code audit.",
    type: "service",
    sac_hsn_code: "998315",
    unit: "fixed",
    default_price: 50000.0,
    gst_rate: 18.0,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: "inv-001",
    invoice_number: "QORVA/TAX/26-27/001",
    invoice_type: "gst_tax_invoice",
    financial_year: "2026-2027",
    customer_id: "c0000000-0000-0000-0000-000000000001",
    customer_snapshot: DEFAULT_CUSTOMERS[0],
    company_snapshot: DEFAULT_COMPANY_SETTINGS,
    invoice_date: "2026-10-15",
    due_date: "2026-10-30",
    status: "paid",
    is_locked: true,
    place_of_supply: "Maharashtra (27)",
    place_of_supply_state_code: "27",
    is_interstate: false,
    reverse_charge: false,
    currency: "INR",
    exchange_rate: 1.0,
    subtotal: 150000.0,
    discount_type: "percentage",
    discount_value: 0,
    discount_amount: 0,
    taxable_amount: 150000.0,
    cgst_amount: 13500.0,
    sgst_amount: 13500.0,
    igst_amount: 0,
    total_tax: 27000.0,
    round_off: 0,
    total_amount: 177000.0,
    amount_paid: 177000.0,
    balance_due: 0,
    amount_in_words: "Rupees One Lakh Seventy Seven Thousand Only",
    notes: "Payment settled in full via NEFT.",
    created_at: "2026-10-15T09:00:00Z",
    updated_at: "2026-10-20T11:00:00Z",
    items: [
      {
        id: "item-001",
        invoice_id: "inv-001",
        item_description: "Custom Software Architecture & Dev - Oct 2026 Milestone",
        sac_hsn_code: "998314",
        quantity: 1,
        unit: "months",
        unit_price: 150000.0,
        discount_percent: 0,
        taxable_amount: 150000.0,
        gst_rate: 18.0,
        cgst_rate: 9.0,
        cgst_amount: 13500.0,
        sgst_rate: 9.0,
        sgst_amount: 13500.0,
        igst_rate: 0,
        igst_amount: 0,
        total_amount: 177000.0,
        sort_order: 1,
      },
    ],
  },
  {
    id: "inv-002",
    invoice_number: "QORVA/TAX/26-27/002",
    invoice_type: "gst_tax_invoice",
    financial_year: "2026-2027",
    customer_id: "c0000000-0000-0000-0000-000000000002",
    customer_snapshot: DEFAULT_CUSTOMERS[1],
    company_snapshot: DEFAULT_COMPANY_SETTINGS,
    invoice_date: "2026-11-05",
    due_date: "2026-11-20",
    status: "partially_paid",
    is_locked: true,
    place_of_supply: "Telangana (36)",
    place_of_supply_state_code: "36",
    is_interstate: true,
    reverse_charge: false,
    currency: "INR",
    exchange_rate: 1.0,
    subtotal: 120000.0,
    discount_type: "percentage",
    discount_value: 0,
    discount_amount: 0,
    taxable_amount: 120000.0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 21600.0,
    total_tax: 21600.0,
    round_off: 0,
    total_amount: 141600.0,
    amount_paid: 70000.0,
    balance_due: 71600.0,
    amount_in_words: "Rupees One Lakh Forty One Thousand Six Hundred Only",
    notes: "Interstate IGST transaction. Part payment received via RTGS.",
    created_at: "2026-11-05T10:00:00Z",
    updated_at: "2026-11-12T14:30:00Z",
    items: [
      {
        id: "item-002",
        invoice_id: "inv-002",
        item_description: "AI Model Fine-tuning & Integration (Phase 1)",
        sac_hsn_code: "998314",
        quantity: 1,
        unit: "fixed",
        unit_price: 120000.0,
        discount_percent: 0,
        taxable_amount: 120000.0,
        gst_rate: 18.0,
        cgst_rate: 0,
        cgst_amount: 0,
        sgst_rate: 0,
        sgst_amount: 0,
        igst_rate: 18.0,
        igst_amount: 21600.0,
        total_amount: 141600.0,
        sort_order: 1,
      },
    ],
  },
  {
    id: "inv-003",
    invoice_number: "QORVA/INV/26-27/003",
    invoice_type: "non_gst_invoice",
    financial_year: "2026-2027",
    customer_id: "c0000000-0000-0000-0000-000000000003",
    customer_snapshot: DEFAULT_CUSTOMERS[2],
    company_snapshot: DEFAULT_COMPANY_SETTINGS,
    invoice_date: "2026-11-18",
    due_date: "2026-12-02",
    status: "issued",
    is_locked: true,
    place_of_supply: "Delhi (07)",
    place_of_supply_state_code: "07",
    is_interstate: true,
    reverse_charge: false,
    currency: "INR",
    exchange_rate: 1.0,
    subtotal: 50000.0,
    discount_type: "percentage",
    discount_value: 0,
    discount_amount: 0,
    taxable_amount: 50000.0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_tax: 0,
    round_off: 0,
    total_amount: 50000.0,
    amount_paid: 0,
    balance_due: 50000.0,
    amount_in_words: "Rupees Fifty Thousand Only",
    notes: "Commercial invoice for direct advisory consulting.",
    created_at: "2026-11-18T16:00:00Z",
    updated_at: "2026-11-18T16:00:00Z",
    items: [
      {
        id: "item-003",
        invoice_id: "inv-003",
        item_description: "Advisory & Medical AI Systems Architecture Review",
        quantity: 1,
        unit: "fixed",
        unit_price: 50000.0,
        discount_percent: 0,
        taxable_amount: 50000.0,
        gst_rate: 0,
        cgst_rate: 0,
        cgst_amount: 0,
        sgst_rate: 0,
        sgst_amount: 0,
        igst_rate: 0,
        igst_amount: 0,
        total_amount: 50000.0,
        sort_order: 1,
      },
    ],
  },
];

const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "pay-001",
    payment_number: "REC/26-27/001",
    invoice_id: "inv-001",
    customer_id: "c0000000-0000-0000-0000-000000000001",
    amount: 177000.0,
    payment_date: "2026-10-20",
    payment_method: "bank_transfer",
    transaction_reference: "HDFCN2629381716",
    notes: "Full invoice settlement received via HDFC NEFT.",
    is_reversed: false,
    created_at: "2026-10-20T11:00:00Z",
    updated_at: "2026-10-20T11:00:00Z",
  },
  {
    id: "pay-002",
    payment_number: "REC/26-27/002",
    invoice_id: "inv-002",
    customer_id: "c0000000-0000-0000-0000-000000000002",
    amount: 70000.0,
    payment_date: "2026-11-12",
    payment_method: "bank_transfer",
    transaction_reference: "ICICIR552910128",
    notes: "50% advance milestone payment via RTGS.",
    is_reversed: false,
    created_at: "2026-11-12T14:30:00Z",
    updated_at: "2026-11-12T14:30:00Z",
  },
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: "exp-001",
    expense_number: "EXP/26-27/001",
    category: "cloud_hosting",
    vendor_name: "Amazon Web Services (AWS)",
    vendor_gstin: "27AABCA1234J1Z8",
    expense_date: "2026-10-02",
    description: "Production EC2, RDS, and S3 infrastructure bill.",
    taxable_amount: 18500.0,
    gst_amount: 3330.0,
    total_amount: 21830.0,
    payment_method: "credit_card",
    notes: "Corporate credit card automated debit.",
    created_at: "2026-10-02T05:00:00Z",
    updated_at: "2026-10-02T05:00:00Z",
  },
  {
    id: "exp-002",
    expense_number: "EXP/26-27/002",
    category: "software_subscriptions",
    vendor_name: "GitHub / Microsoft",
    vendor_gstin: "9918USA29000101",
    expense_date: "2026-10-15",
    description: "GitHub Enterprise Cloud & Copilot Business licences.",
    taxable_amount: 8200.0,
    gst_amount: 1476.0,
    total_amount: 9676.0,
    payment_method: "credit_card",
    notes: "Annual software subscriptions.",
    created_at: "2026-10-15T09:00:00Z",
    updated_at: "2026-10-15T09:00:00Z",
  },
  {
    id: "exp-003",
    expense_number: "EXP/26-27/003",
    category: "legal_professional",
    vendor_name: "Kothari & Associates Chartered Accountants",
    vendor_gstin: "27AAAFK8822L1ZP",
    expense_date: "2026-11-01",
    description: "Quarterly GST Filing and LLP Statutory Audit retainer.",
    taxable_amount: 15000.0,
    gst_amount: 2700.0,
    total_amount: 17700.0,
    payment_method: "bank_transfer",
    notes: "Quarterly professional fee.",
    created_at: "2026-11-01T12:00:00Z",
    updated_at: "2026-11-01T12:00:00Z",
  },
];

const DEFAULT_QUOTATIONS: Quotation[] = [
  {
    id: "quot-001",
    quotation_number: "QORVA/EST/26-27/001",
    quotation_type: "gst",
    customer_id: "c0000000-0000-0000-0000-000000000002",
    customer_snapshot: DEFAULT_CUSTOMERS[1],
    company_snapshot: DEFAULT_COMPANY_SETTINGS,
    quotation_date: "2026-11-10",
    valid_until: "2026-12-10",
    status: "pending",
    place_of_supply: "Telangana (36)",
    place_of_supply_state_code: "36",
    is_interstate: true,
    currency: "INR",
    exchange_rate: 1.0,
    subtotal: 180000.0,
    discount_type: "percentage",
    discount_value: 5,
    discount_amount: 9000.0,
    taxable_amount: 171000.0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 30780.0,
    total_tax: 30780.0,
    round_off: 0,
    total_amount: 201780.0,
    amount_in_words: "Rupees Two Lakh One Thousand Seven Hundred Eighty Only",
    notes: "Special 5% loyalty discount applied for enterprise contract.",
    terms_and_conditions: "Proposal valid for 30 calendar days from issue date.",
    created_at: "2026-11-10T11:00:00Z",
    updated_at: "2026-11-10T11:00:00Z",
    items: [
      {
        id: "qitem-001",
        quotation_id: "quot-001",
        item_description: "Cloud Security Architecture Review & SOC2 Audit Prep",
        sac_hsn_code: "998315",
        quantity: 1,
        unit: "fixed",
        unit_price: 180000.0,
        discount_percent: 5,
        taxable_amount: 171000.0,
        gst_rate: 18.0,
        cgst_rate: 0,
        cgst_amount: 0,
        sgst_rate: 0,
        sgst_amount: 0,
        igst_rate: 18.0,
        igst_amount: 30780.0,
        total_amount: 201780.0,
        sort_order: 1,
      },
    ],
  },
];

function loadLocalData(): LocalDataState {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read local data, using defaults", e);
  }

  const initial: LocalDataState = {
    companySettings: DEFAULT_COMPANY_SETTINGS,
    customers: DEFAULT_CUSTOMERS,
    productsServices: DEFAULT_PRODUCTS,
    quotations: DEFAULT_QUOTATIONS,
    invoices: DEFAULT_INVOICES,
    payments: DEFAULT_PAYMENTS,
    creditNotes: [],
    expenses: DEFAULT_EXPENSES,
    auditLogs: [],
  };

  saveLocalData(initial);
  return initial;
}

function saveLocalData(data: LocalDataState) {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save local data", e);
  }
}

// ==============================================================================
// PUBLIC DATA STORE METHODS
// ==============================================================================

export async function getCompanySettings(): Promise<CompanySettings> {
  const data = loadLocalData();
  return data.companySettings;
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
  const data = loadLocalData();
  data.companySettings = {
    ...data.companySettings,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalData(data);
  return data.companySettings;
}

export async function getCustomers(): Promise<Customer[]> {
  const data = loadLocalData();
  // Compute totals for each customer
  return data.customers.map((c) => {
    const custInvoices = data.invoices.filter((inv) => inv.customer_id === c.id && inv.status !== "cancelled");
    const total_sales = custInvoices.reduce((acc, inv) => acc + Number(inv.total_amount), 0);
    const total_paid = custInvoices.reduce((acc, inv) => acc + Number(inv.amount_paid), 0);
    const outstanding_balance = custInvoices.reduce((acc, inv) => acc + Number(inv.balance_due), 0);
    return {
      ...c,
      total_sales,
      total_paid,
      outstanding_balance,
      invoice_count: custInvoices.length,
    };
  });
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customers = await getCustomers();
  return customers.find((c) => c.id === id) || null;
}

export async function createCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
  const data = loadLocalData();
  const newCustomer: Customer = {
    ...customer,
    id: `cust-${Date.now()}`,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.customers.push(newCustomer);
  saveLocalData(data);
  return newCustomer;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  const data = loadLocalData();
  const index = data.customers.findIndex((c) => c.id === id);
  if (index === -1) return null;
  data.customers[index] = {
    ...data.customers[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalData(data);
  return data.customers[index];
}

export async function getProductsServices(): Promise<ProductService[]> {
  const data = loadLocalData();
  return data.productsServices;
}

export async function createProductService(
  item: Omit<ProductService, "id" | "created_at" | "updated_at">
): Promise<ProductService> {
  const data = loadLocalData();
  const newProduct: ProductService = {
    ...item,
    id: `prod-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.productsServices.push(newProduct);
  saveLocalData(data);
  return newProduct;
}

export async function updateProductService(id: string, updates: Partial<ProductService>): Promise<ProductService | null> {
  const data = loadLocalData();
  const index = data.productsServices.findIndex((p) => p.id === id);
  if (index === -1) return null;
  data.productsServices[index] = {
    ...data.productsServices[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveLocalData(data);
  return data.productsServices[index];
}

export async function getInvoices(): Promise<Invoice[]> {
  const data = loadLocalData();
  return data.invoices.map((inv) => {
    const customer = data.customers.find((c) => c.id === inv.customer_id);
    return {
      ...inv,
      customer,
    };
  });
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getInvoices();
  return invoices.find((inv) => inv.id === id) || null;
}

export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
  const data = loadLocalData();
  const fy = getFinancialYear();
  const settings = data.companySettings;

  // Prefix selection
  let prefix = settings.gst_invoice_prefix;
  if (invoiceData.invoice_type === "non_gst_invoice") {
    prefix = settings.non_gst_invoice_prefix;
  } else if (invoiceData.invoice_type === "bill_of_supply") {
    prefix = settings.bill_of_supply_prefix;
  }

  const existingSameType = data.invoices.filter((i) => i.invoice_type === invoiceData.invoice_type);
  const nextNumber = generateNextDocumentNumber(prefix, existingSameType.length + 1, fy);

  const customer = data.customers.find((c) => c.id === invoiceData.customer_id) || {};

  const newInvoice: Invoice = {
    id: `inv-${Date.now()}`,
    invoice_number: invoiceData.invoice_number || nextNumber,
    invoice_type: invoiceData.invoice_type || "gst_tax_invoice",
    financial_year: fy.full,
    quotation_id: invoiceData.quotation_id,
    customer_id: invoiceData.customer_id!,
    customer_snapshot: customer,
    company_snapshot: settings,
    invoice_date: invoiceData.invoice_date || new Date().toISOString().split("T")[0],
    due_date: invoiceData.due_date || new Date().toISOString().split("T")[0],
    status: invoiceData.status || "draft",
    is_locked: invoiceData.status === "issued" || invoiceData.is_locked || false,
    place_of_supply: invoiceData.place_of_supply,
    place_of_supply_state_code: invoiceData.place_of_supply_state_code,
    is_interstate: invoiceData.is_interstate || false,
    reverse_charge: invoiceData.reverse_charge || false,
    currency: invoiceData.currency || settings.default_currency,
    exchange_rate: 1.0,
    subtotal: Number(invoiceData.subtotal) || 0,
    discount_type: invoiceData.discount_type || "percentage",
    discount_value: Number(invoiceData.discount_value) || 0,
    discount_amount: Number(invoiceData.discount_amount) || 0,
    taxable_amount: Number(invoiceData.taxable_amount) || 0,
    cgst_amount: Number(invoiceData.cgst_amount) || 0,
    sgst_amount: Number(invoiceData.sgst_amount) || 0,
    igst_amount: Number(invoiceData.igst_amount) || 0,
    total_tax: Number(invoiceData.total_tax) || 0,
    round_off: Number(invoiceData.round_off) || 0,
    total_amount: Number(invoiceData.total_amount) || 0,
    amount_paid: 0,
    balance_due: Number(invoiceData.total_amount) || 0,
    amount_in_words: numberToIndianWords(Number(invoiceData.total_amount) || 0),
    notes: invoiceData.notes || settings.default_notes,
    terms_and_conditions: invoiceData.terms_and_conditions || settings.terms_and_conditions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: invoiceData.items || [],
  };

  data.invoices.unshift(newInvoice);
  saveLocalData(data);
  return newInvoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
  const data = loadLocalData();
  const index = data.invoices.findIndex((inv) => inv.id === id);
  if (index === -1) return null;

  const existing = data.invoices[index];
  if (existing.is_locked && updates.status !== "cancelled" && updates.status !== "paid" && updates.status !== "partially_paid") {
    throw new Error("Cannot edit locked or issued invoice. Issue a credit note or cancel with audit trail.");
  }

  data.invoices[index] = {
    ...existing,
    ...updates,
    amount_in_words: updates.total_amount !== undefined ? numberToIndianWords(updates.total_amount) : existing.amount_in_words,
    updated_at: new Date().toISOString(),
  };

  saveLocalData(data);
  return data.invoices[index];
}

export async function cancelInvoice(id: string, reason: string): Promise<Invoice | null> {
  const data = loadLocalData();
  const invoice = data.invoices.find((i) => i.id === id);
  if (!invoice) return null;

  invoice.status = "cancelled";
  invoice.cancelled_at = new Date().toISOString();
  invoice.cancellation_reason = reason;
  invoice.balance_due = 0;
  invoice.updated_at = new Date().toISOString();

  // Log audit
  data.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    entity_type: "invoice",
    entity_id: id,
    action: "cancel",
    new_data: { reason },
    performed_by: "Owner",
    created_at: new Date().toISOString(),
  });

  saveLocalData(data);
  return invoice;
}

export async function getPayments(): Promise<Payment[]> {
  const data = loadLocalData();
  return data.payments.map((p) => {
    const invoice = data.invoices.find((i) => i.id === p.invoice_id);
    const customer = data.customers.find((c) => c.id === p.customer_id);
    return {
      ...p,
      invoice,
      customer,
    };
  });
}

export async function recordPayment(paymentData: {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: Payment["payment_method"];
  transaction_reference?: string;
  notes?: string;
}): Promise<Payment> {
  const data = loadLocalData();
  const invoice = data.invoices.find((i) => i.id === paymentData.invoice_id);
  if (!invoice) throw new Error("Invoice not found.");

  const payAmt = Number(paymentData.amount);
  if (payAmt <= 0) throw new Error("Payment amount must be greater than zero.");
  if (payAmt > invoice.balance_due) {
    throw new Error(`Payment amount (₹${payAmt}) cannot exceed invoice balance due (₹${invoice.balance_due}).`);
  }

  const fy = getFinancialYear();
  const paySeq = data.payments.length + 1;
  const paymentNumber = `REC/${fy.short}/${String(paySeq).padStart(3, "0")}`;

  const payment: Payment = {
    id: `pay-${Date.now()}`,
    payment_number: paymentNumber,
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    amount: payAmt,
    payment_date: paymentData.payment_date,
    payment_method: paymentData.payment_method,
    transaction_reference: paymentData.transaction_reference,
    notes: paymentData.notes,
    is_reversed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  data.payments.unshift(payment);

  // Update invoice balance and status
  invoice.amount_paid = Number((invoice.amount_paid + payAmt).toFixed(2));
  invoice.balance_due = Number((invoice.total_amount - invoice.amount_paid).toFixed(2));
  if (invoice.balance_due <= 0.01) {
    invoice.status = "paid";
    invoice.balance_due = 0;
  } else {
    invoice.status = "partially_paid";
  }
  invoice.updated_at = new Date().toISOString();

  // Audit log
  data.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    entity_type: "payment",
    entity_id: payment.id,
    action: "create",
    new_data: { payment_number: payment.payment_number, amount: payAmt, invoice_number: invoice.invoice_number },
    performed_by: "Owner",
    created_at: new Date().toISOString(),
  });

  saveLocalData(data);
  return payment;
}

export async function reversePayment(paymentId: string, reason: string): Promise<Payment | null> {
  const data = loadLocalData();
  const payment = data.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  if (payment.is_reversed) throw new Error("Payment has already been reversed.");

  const invoice = data.invoices.find((i) => i.id === payment.invoice_id);
  if (!invoice) throw new Error("Linked invoice not found.");

  payment.is_reversed = true;
  payment.reversed_at = new Date().toISOString();
  payment.reversal_reason = reason;
  payment.updated_at = new Date().toISOString();

  // Restore invoice balance
  invoice.amount_paid = Math.max(0, Number((invoice.amount_paid - payment.amount).toFixed(2)));
  invoice.balance_due = Number((invoice.total_amount - invoice.amount_paid).toFixed(2));
  if (invoice.amount_paid === 0) {
    invoice.status = "issued";
  } else {
    invoice.status = "partially_paid";
  }
  invoice.updated_at = new Date().toISOString();

  data.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    entity_type: "payment",
    entity_id: payment.id,
    action: "payment_reversed",
    new_data: { reason, amount: payment.amount, invoice_number: invoice.invoice_number },
    performed_by: "Owner",
    created_at: new Date().toISOString(),
  });

  saveLocalData(data);
  return payment;
}

export async function getQuotations(): Promise<Quotation[]> {
  const data = loadLocalData();
  return data.quotations.map((q) => {
    const customer = data.customers.find((c) => c.id === q.customer_id);
    return {
      ...q,
      customer,
    };
  });
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const quotes = await getQuotations();
  return quotes.find((q) => q.id === id) || null;
}

export async function createQuotation(quotationData: Partial<Quotation>): Promise<Quotation> {
  const data = loadLocalData();
  const fy = getFinancialYear();
  const settings = data.companySettings;

  const nextSeq = data.quotations.length + 1;
  const quoteNumber = generateNextDocumentNumber(settings.quotation_prefix, nextSeq, fy);
  const customer = data.customers.find((c) => c.id === quotationData.customer_id) || {};

  const newQuote: Quotation = {
    id: `quot-${Date.now()}`,
    quotation_number: quotationData.quotation_number || quoteNumber,
    quotation_type: quotationData.quotation_type || "gst",
    customer_id: quotationData.customer_id!,
    customer_snapshot: customer,
    company_snapshot: settings,
    quotation_date: quotationData.quotation_date || new Date().toISOString().split("T")[0],
    valid_until: quotationData.valid_until || new Date().toISOString().split("T")[0],
    status: quotationData.status || "draft",
    place_of_supply: quotationData.place_of_supply,
    place_of_supply_state_code: quotationData.place_of_supply_state_code,
    is_interstate: quotationData.is_interstate || false,
    currency: quotationData.currency || settings.default_currency,
    exchange_rate: 1.0,
    subtotal: Number(quotationData.subtotal) || 0,
    discount_type: quotationData.discount_type || "percentage",
    discount_value: Number(quotationData.discount_value) || 0,
    discount_amount: Number(quotationData.discount_amount) || 0,
    taxable_amount: Number(quotationData.taxable_amount) || 0,
    cgst_amount: Number(quotationData.cgst_amount) || 0,
    sgst_amount: Number(quotationData.sgst_amount) || 0,
    igst_amount: Number(quotationData.igst_amount) || 0,
    total_tax: Number(quotationData.total_tax) || 0,
    round_off: Number(quotationData.round_off) || 0,
    total_amount: Number(quotationData.total_amount) || 0,
    amount_in_words: numberToIndianWords(Number(quotationData.total_amount) || 0),
    notes: quotationData.notes || settings.default_notes,
    terms_and_conditions: quotationData.terms_and_conditions || settings.terms_and_conditions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: quotationData.items || [],
  };

  data.quotations.unshift(newQuote);
  saveLocalData(data);
  return newQuote;
}

export async function convertQuotationToInvoice(quotationId: string): Promise<Invoice> {
  const data = loadLocalData();
  const quote = data.quotations.find((q) => q.id === quotationId);
  if (!quote) throw new Error("Quotation not found.");

  const fy = getFinancialYear();
  const settings = data.companySettings;

  let docType: Invoice["invoice_type"] = "gst_tax_invoice";
  let prefix = settings.gst_invoice_prefix;
  if (quote.quotation_type === "non_gst") {
    docType = "non_gst_invoice";
    prefix = settings.non_gst_invoice_prefix;
  }

  const existingInvoices = data.invoices.filter((i) => i.invoice_type === docType);
  const nextNumber = generateNextDocumentNumber(prefix, existingInvoices.length + 1, fy);

  const invoiceItems: InvoiceItem[] = (quote.items || []).map((item, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    item_description: item.item_description,
    sac_hsn_code: item.sac_hsn_code,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    taxable_amount: item.taxable_amount,
    gst_rate: item.gst_rate,
    cgst_rate: item.cgst_rate,
    cgst_amount: item.cgst_amount,
    sgst_rate: item.sgst_rate,
    sgst_amount: item.sgst_amount,
    igst_rate: item.igst_rate,
    igst_amount: item.igst_amount,
    total_amount: item.total_amount,
    sort_order: item.sort_order,
  }));

  const invoice: Invoice = {
    id: `inv-${Date.now()}`,
    invoice_number: nextNumber,
    invoice_type: docType,
    financial_year: fy.full,
    quotation_id: quote.id,
    customer_id: quote.customer_id,
    customer_snapshot: quote.customer_snapshot,
    company_snapshot: settings,
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    status: "issued",
    is_locked: true,
    place_of_supply: quote.place_of_supply,
    place_of_supply_state_code: quote.place_of_supply_state_code,
    is_interstate: quote.is_interstate,
    reverse_charge: false,
    currency: quote.currency,
    exchange_rate: quote.exchange_rate,
    subtotal: quote.subtotal,
    discount_type: quote.discount_type,
    discount_value: quote.discount_value,
    discount_amount: quote.discount_amount,
    taxable_amount: quote.taxable_amount,
    cgst_amount: quote.cgst_amount,
    sgst_amount: quote.sgst_amount,
    igst_amount: quote.igst_amount,
    total_tax: quote.total_tax,
    round_off: quote.round_off,
    total_amount: quote.total_amount,
    amount_paid: 0,
    balance_due: quote.total_amount,
    amount_in_words: quote.amount_in_words,
    notes: quote.notes,
    terms_and_conditions: quote.terms_and_conditions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: invoiceItems,
  };

  quote.status = "converted";
  quote.converted_to_invoice_id = invoice.id;
  quote.updated_at = new Date().toISOString();

  data.invoices.unshift(invoice);
  saveLocalData(data);
  return invoice;
}

export async function getExpenses(): Promise<Expense[]> {
  const data = loadLocalData();
  return data.expenses;
}

export async function createExpense(expenseData: Omit<Expense, "id" | "expense_number" | "created_at" | "updated_at">): Promise<Expense> {
  const data = loadLocalData();
  const fy = getFinancialYear();
  const seq = data.expenses.length + 1;
  const expenseNumber = `EXP/${fy.short}/${String(seq).padStart(3, "0")}`;

  const newExpense: Expense = {
    ...expenseData,
    id: `exp-${Date.now()}`,
    expense_number: expenseNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  data.expenses.unshift(newExpense);
  saveLocalData(data);
  return newExpense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const data = loadLocalData();
  const idx = data.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  data.expenses.splice(idx, 1);
  saveLocalData(data);
  return true;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const data = loadLocalData();
  return data.auditLogs;
}

export async function getFullBackupDump() {
  const data = loadLocalData();
  return {
    exported_at: new Date().toISOString(),
    organization: "QORVA LABS LLP",
    data,
  };
}
