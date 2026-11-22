import { InvoiceItem, QuotationItem } from "@/lib/types/database";

export interface ItemCalculationInput {
  quantity: number;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
}

export interface TaxCalculationResult {
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
}

export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateLineItemTax(
  input: ItemCalculationInput,
  isInterstate: boolean,
  isGstApplicable: boolean = true
): TaxCalculationResult {
  const qty = Number(input.quantity) || 0;
  const price = Number(input.unit_price) || 0;
  const discountPct = Number(input.discount_percent) || 0;
  const gstRate = isGstApplicable ? (Number(input.gst_rate) || 0) : 0;

  // Base raw amount
  const rawSubtotal = qty * price;
  const discountAmount = rawSubtotal * (discountPct / 100);
  const taxable_amount = roundTo2(rawSubtotal - discountAmount);

  if (!isGstApplicable || gstRate === 0) {
    return {
      taxable_amount,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      total_tax: 0,
      total_amount: taxable_amount,
    };
  }

  if (isInterstate) {
    const igst_amount = roundTo2(taxable_amount * (gstRate / 100));
    return {
      taxable_amount,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: gstRate,
      igst_amount,
      total_tax: igst_amount,
      total_amount: roundTo2(taxable_amount + igst_amount),
    };
  } else {
    const halfRate = gstRate / 2;
    const cgst_amount = roundTo2(taxable_amount * (halfRate / 100));
    const sgst_amount = roundTo2(taxable_amount * (halfRate / 100));
    const total_tax = roundTo2(cgst_amount + sgst_amount);
    return {
      taxable_amount,
      cgst_rate: halfRate,
      cgst_amount,
      sgst_rate: halfRate,
      sgst_amount,
      igst_rate: 0,
      igst_amount: 0,
      total_tax,
      total_amount: roundTo2(taxable_amount + total_tax),
    };
  }
}

export interface DocumentTotals {
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  round_off: number;
  total_amount: number;
}

export function calculateDocumentTotals(
  items: (InvoiceItem | QuotationItem)[],
  overallDiscountType: 'percentage' | 'fixed' = 'percentage',
  overallDiscountVal: number = 0,
  enableRoundOff: boolean = true
): DocumentTotals {
  let subtotal = 0;
  let taxable_amount = 0;
  let cgst_amount = 0;
  let sgst_amount = 0;
  let igst_amount = 0;
  let total_tax = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    subtotal += qty * price;
    taxable_amount += Number(item.taxable_amount) || 0;
    cgst_amount += Number(item.cgst_amount) || 0;
    sgst_amount += Number(item.sgst_amount) || 0;
    igst_amount += Number(item.igst_amount) || 0;
    total_tax += (Number(item.cgst_amount) || 0) + (Number(item.sgst_amount) || 0) + (Number(item.igst_amount) || 0);
  }

  subtotal = roundTo2(subtotal);
  taxable_amount = roundTo2(taxable_amount);
  cgst_amount = roundTo2(cgst_amount);
  sgst_amount = roundTo2(sgst_amount);
  igst_amount = roundTo2(igst_amount);
  total_tax = roundTo2(total_tax);

  let docDiscount = 0;
  if (overallDiscountType === 'percentage') {
    docDiscount = roundTo2(taxable_amount * (Number(overallDiscountVal || 0) / 100));
  } else {
    docDiscount = roundTo2(Number(overallDiscountVal || 0));
  }

  const rawFinal = Math.max(0, taxable_amount - docDiscount + total_tax);
  let round_off = 0;
  let total_amount = rawFinal;

  if (enableRoundOff) {
    total_amount = Math.round(rawFinal);
    round_off = roundTo2(total_amount - rawFinal);
  } else {
    total_amount = roundTo2(rawFinal);
  }

  return {
    subtotal,
    discount_amount: docDiscount,
    taxable_amount,
    cgst_amount,
    sgst_amount,
    igst_amount,
    total_tax,
    round_off,
    total_amount,
  };
}
