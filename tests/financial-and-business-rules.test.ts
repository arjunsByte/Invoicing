import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calculateLineItemTax, calculateDocumentTotals } from "../lib/financial/gst-calculator";
import { numberToIndianWords, formatINR } from "../lib/financial/number-to-words";
import { getFinancialYear, generateNextDocumentNumber } from "../lib/financial/invoice-numbering";

describe("1. GST Calculation Engine", () => {
  it("should calculate intra-state GST (50% CGST + 50% SGST) correctly for 18% rate", () => {
    const item = {
      quantity: 2,
      unit_price: 50000,
      discount_percent: 10, // 1,00,000 - 10,000 = 90,000 taxable
      gst_rate: 18,
    };

    const isInterstate = false;
    const isGstApplicable = true;

    const result = calculateLineItemTax(item, isInterstate, isGstApplicable);

    assert.equal(result.taxable_amount, 90000);
    assert.equal(result.cgst_rate, 9);
    assert.equal(result.cgst_amount, 8100);
    assert.equal(result.sgst_rate, 9);
    assert.equal(result.sgst_amount, 8100);
    assert.equal(result.igst_rate, 0);
    assert.equal(result.igst_amount, 0);
    assert.equal(result.total_tax, 16200);
    assert.equal(result.total_amount, 106200);
  });

  it("should calculate inter-state GST (100% IGST) correctly for 18% rate", () => {
    const item = {
      quantity: 1,
      unit_price: 150000,
      discount_percent: 0,
      gst_rate: 18,
    };

    const isInterstate = true;
    const isGstApplicable = true;

    const result = calculateLineItemTax(item, isInterstate, isGstApplicable);

    assert.equal(result.taxable_amount, 150000);
    assert.equal(result.cgst_amount, 0);
    assert.equal(result.sgst_amount, 0);
    assert.equal(result.igst_rate, 18);
    assert.equal(result.igst_amount, 27000);
    assert.equal(result.total_tax, 27000);
    assert.equal(result.total_amount, 177000);
  });

  it("should charge 0 tax on Non-GST commercial invoices", () => {
    const item = {
      quantity: 3,
      unit_price: 25000,
      discount_percent: 0,
      gst_rate: 18,
    };

    const isInterstate = false;
    const isGstApplicable = false; // Non-GST invoice mode

    const result = calculateLineItemTax(item, isInterstate, isGstApplicable);

    assert.equal(result.taxable_amount, 75000);
    assert.equal(result.total_tax, 0);
    assert.equal(result.cgst_amount, 0);
    assert.equal(result.sgst_amount, 0);
    assert.equal(result.igst_amount, 0);
    assert.equal(result.total_amount, 75000);
  });

  it("should calculate document totals with overall discount and round-off", () => {
    const items: any[] = [
      {
        quantity: 1,
        unit_price: 33333.33,
        taxable_amount: 33333.33,
        cgst_amount: 3000,
        sgst_amount: 3000,
        igst_amount: 0,
        total_amount: 39333.33,
      },
    ];

    const totals = calculateDocumentTotals(items, "percentage", 0, true);

    assert.equal(totals.total_tax, 6000);
    assert.equal(totals.total_amount, 39333); // rounded to nearest whole rupee
    assert.equal(totals.round_off, -0.33);
  });
});

describe("2. Indian Currency & Number-to-Words Converter", () => {
  it("converts Lakhs and Thousands accurately to words", () => {
    const words = numberToIndianWords(154250);
    assert.equal(
      words,
      "Rupees One Lakh Fifty Four Thousand Two Hundred and Fifty Only"
    );
  });

  it("converts Crores accurately", () => {
    const words = numberToIndianWords(25000000);
    assert.equal(words, "Rupees Two Crore Fifty Lakh Only");
  });

  it("formats Paise correctly", () => {
    const words = numberToIndianWords(100.75);
    assert.equal(words, "Rupees One Hundred and Seventy Five Paise Only");
  });

  it("formats Indian currency string with Indian comma grouping", () => {
    const formatted = formatINR(1500000);
    assert.equal(formatted, "₹ 15,00,000.00");
  });
});

describe("3. Financial Year Numbering & Prefixes", () => {
  it("determines correct Financial Year (April 1st to March 31st)", () => {
    // Oct 2026 => FY 2026-2027 (26-27)
    const dateOct = new Date("2026-10-15T00:00:00Z");
    const fyOct = getFinancialYear(dateOct);
    assert.equal(fyOct.full, "2026-2027");
    assert.equal(fyOct.short, "26-27");

    // Feb 2026 => FY 2025-2026 (25-26)
    const dateFeb = new Date("2026-02-15T00:00:00Z");
    const fyFeb = getFinancialYear(dateFeb);
    assert.equal(fyFeb.full, "2025-2026");
    assert.equal(fyFeb.short, "25-26");
  });

  it("generates sequential document number using configurable prefix", () => {
    const fy = { full: "2026-2027", short: "26-27" };
    const prefix = "QORVA/TAX/{FY}/";
    const docNumber = generateNextDocumentNumber(prefix, 1, fy);
    assert.equal(docNumber, "QORVA/TAX/26-27/001");

    const nonGstPrefix = "QORVA/INV/{FY}/";
    const nonGstNumber = generateNextDocumentNumber(nonGstPrefix, 12, fy);
    assert.equal(nonGstNumber, "QORVA/INV/26-27/012");
  });
});
