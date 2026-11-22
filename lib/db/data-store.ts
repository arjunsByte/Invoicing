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

let hasWarnedAboutFileStore = false;

function warnAboutFileStore() {
  if (hasWarnedAboutFileStore) return;
  hasWarnedAboutFileStore = true;
  console.warn(
    "Supabase is not configured. Using the local JSON data store, which has no cross-process locking and can lose concurrent updates. Use a transactional database for multi-worker or multi-instance deployments."
  );
}

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

const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_PRODUCTS: ProductService[] = [];
const DEFAULT_INVOICES: Invoice[] = [];
const DEFAULT_PAYMENTS: Payment[] = [];
const DEFAULT_EXPENSES: Expense[] = [];
const DEFAULT_QUOTATIONS: Quotation[] = [];

function loadLocalData(): LocalDataState {
  warnAboutFileStore();
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
  warnAboutFileStore();
  try {
    const tempPath = `${DATA_FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: "utf-8", flag: "wx" });
    fs.renameSync(tempPath, DATA_FILE_PATH);
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

export async function deleteCustomer(id: string): Promise<boolean> {
  const data = loadLocalData();
  if (data.invoices.some((invoice) => invoice.customer_id === id) || data.quotations.some((quotation) => quotation.customer_id === id)) {
    throw new Error("Customer has invoices or quotations. Archive the customer instead to preserve transaction history.");
  }
  const count = data.customers.length;
  data.customers = data.customers.filter((customer) => customer.id !== id);
  if (data.customers.length === count) return false;
  saveLocalData(data);
  return true;
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

  const normalizedItems: InvoiceItem[] = (invoiceData.items || []).map((item, index) => {
    const tax = calculateLineItemTax(item, invoiceData.is_interstate === true, invoiceData.invoice_type !== "non_gst_invoice");
    return {
      item_description: String(item.item_description || "").slice(0, 500),
      sac_hsn_code: item.sac_hsn_code,
      quantity: Number(item.quantity), unit: String(item.unit || "unit"), unit_price: Number(item.unit_price),
      discount_percent: Number(item.discount_percent) || 0, gst_rate: Number(item.gst_rate) || 0,
      ...tax, sort_order: index + 1,
    };
  });
  const discountType = invoiceData.discount_type === "fixed" ? "fixed" : "percentage";
  const discountValue = Math.max(0, Number(invoiceData.discount_value) || 0);
  const totals = calculateDocumentTotals(normalizedItems, discountType, discountValue, true);
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
    subtotal: totals.subtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: totals.discount_amount,
    taxable_amount: totals.taxable_amount,
    cgst_amount: totals.cgst_amount,
    sgst_amount: totals.sgst_amount,
    igst_amount: totals.igst_amount,
    total_tax: totals.total_tax,
    round_off: totals.round_off,
    total_amount: totals.total_amount,
    amount_paid: 0,
    balance_due: totals.total_amount,
    amount_in_words: numberToIndianWords(totals.total_amount),
    notes: invoiceData.notes || settings.default_notes,
    terms_and_conditions: invoiceData.terms_and_conditions || settings.terms_and_conditions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: normalizedItems,
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

export async function deleteInvoice(id: string): Promise<boolean> {
  const data = loadLocalData();
  const invoice = data.invoices.find((item) => item.id === id);
  if (!invoice) return false;
  if (invoice.status !== "draft" || invoice.is_locked || invoice.amount_paid > 0 || data.payments.some((payment) => payment.invoice_id === id)) {
    throw new Error("Only unpaid draft invoices can be deleted. Cancel issued invoices to preserve their audit trail.");
  }
  data.invoices = data.invoices.filter((item) => item.id !== id);
  if (invoice.quotation_id) {
    const quotation = data.quotations.find((item) => item.id === invoice.quotation_id);
    if (quotation?.converted_to_invoice_id === id) {
      quotation.status = "accepted";
      quotation.converted_to_invoice_id = undefined;
    }
  }
  saveLocalData(data);
  return true;
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
