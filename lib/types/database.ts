export type CustomerType = 'business' | 'individual';

export interface CompanySettings {
  id: string;
  company_name: string;
  tagline?: string;
  llpin?: string;
  pan?: string;
  is_gst_registered: boolean;
  gstin?: string;
  state: string;
  state_code: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  pincode?: string;
  country: string;
  email: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  bank_account_holder?: string;
  upi_id?: string;
  default_currency: string;
  currency_symbol: string;
  financial_year_start: number;
  gst_invoice_prefix: string;
  non_gst_invoice_prefix: string;
  bill_of_supply_prefix: string;
  quotation_prefix: string;
  credit_note_prefix: string;
  default_payment_terms?: string;
  default_notes?: string;
  terms_and_conditions?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  customer_type: CustomerType;
  company_name?: string;
  contact_name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_state_code?: string;
  billing_pincode?: string;
  billing_country?: string;
  shipping_address?: string;
  gstin?: string;
  pan?: string;
  preferred_currency: string;
  notes?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Computed aggregations for dashboard/customer list
  total_sales?: number;
  total_paid?: number;
  outstanding_balance?: number;
  invoice_count?: number;
}

export interface ProductService {
  id: string;
  name: string;
  description?: string;
  type: 'service' | 'goods';
  sac_hsn_code?: string;
  unit: string;
  default_price: number;
  gst_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'gst_tax_invoice' | 'non_gst_invoice' | 'bill_of_supply';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type QuotationStatus = 'draft' | 'pending' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id?: string;
  item_description: string;
  sac_hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: DocumentType;
  financial_year: string;
  quotation_id?: string;
  customer_id: string;
  customer_snapshot: Partial<Customer>;
  company_snapshot: Partial<CompanySettings>;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  is_locked: boolean;
  place_of_supply?: string;
  place_of_supply_state_code?: string;
  is_interstate: boolean;
  reverse_charge: boolean;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  round_off: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  amount_in_words?: string;
  notes?: string;
  terms_and_conditions?: string;
  pdf_url?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  customer?: Customer;
}

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_id?: string;
  item_description: string;
  sac_hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  quotation_type: 'gst' | 'non_gst';
  customer_id: string;
  customer_snapshot: Partial<Customer>;
  company_snapshot: Partial<CompanySettings>;
  quotation_date: string;
  valid_until: string;
  status: QuotationStatus;
  converted_to_invoice_id?: string;
  place_of_supply?: string;
  place_of_supply_state_code?: string;
  is_interstate: boolean;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  round_off: number;
  total_amount: number;
  amount_in_words?: string;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
  customer?: Customer;
}

export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque' | 'credit_card' | 'other';

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  receipt_url?: string;
  is_reversed: boolean;
  reversed_at?: string;
  reversal_reason?: string;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
  customer?: Customer;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  customer_id: string;
  credit_note_date: string;
  reason: 'cancellation' | 'deficiency_in_service' | 'change_in_value' | 'other';
  amount: number;
  gst_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  invoice?: Invoice;
  customer?: Customer;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  vendor_name: string;
  vendor_gstin?: string;
  expense_date: string;
  description?: string;
  taxable_amount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  performed_by?: string;
  created_at: string;
}
