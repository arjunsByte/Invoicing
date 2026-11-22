import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Quotation } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";

export function generateInvoicePDF(docData: Invoice | Quotation, isQuotation: boolean = false) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const company = docData.company_snapshot || {};
  const customer = docData.customer_snapshot || {};
  const isGst = isQuotation 
    ? (docData as Quotation).quotation_type === "gst" 
    : (docData as Invoice).invoice_type === "gst_tax_invoice";

  // Colors
  const primaryColor = [15, 23, 42]; // #0f172a (Deep Slate)
  const secondaryColor = [71, 85, 105]; // #475569
  const accentColor = [30, 41, 59];

  // Document Title Header
  let title = "TAX INVOICE";
  if (isQuotation) {
    title = isGst ? "GST QUOTATION / ESTIMATE" : "COMMERCIAL QUOTATION";
  } else {
    const inv = docData as Invoice;
    if (inv.invoice_type === "non_gst_invoice") title = "COMMERCIAL INVOICE (NON-GST)";
    else if (inv.invoice_type === "bill_of_supply") title = "BILL OF SUPPLY";
  }

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, margin, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, margin + 5.5, { align: "center" });

  let y = margin + 14;

  // Company Information (Left)
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(company.company_name || "QORVA LABS LLP", margin, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  y += 4.5;
  if (company.tagline) {
    doc.text(company.tagline, margin, y);
    y += 4;
  }
  if (company.address_line1) {
    doc.text(`${company.address_line1}, ${company.address_line2 || ""}`, margin, y);
    y += 4;
  }
  doc.text(`${company.city || "Mumbai"}, ${company.state || "Maharashtra"} - ${company.pincode || "400064"}, ${company.country || "India"}`, margin, y);
  y += 4;
  doc.text(`Email: ${company.email || "accounts@qorvalabs.com"} | Phone: ${company.phone || "+91 98200 12345"}`, margin, y);
  y += 4;
  
  if (company.llpin) {
    doc.text(`LLPIN: ${company.llpin} | PAN: ${company.pan || "AABFQ1234K"}`, margin, y);
    y += 4;
  }
  if (isGst && company.gstin) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${company.gstin} (State Code: ${company.state_code || "27"})`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 4;
  }

  // Document Details Box (Right)
  const rightColX = pageWidth / 2 + 10;
  let rightY = margin + 14;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const docNumLabel = isQuotation ? "Quotation No:" : "Invoice No:";
  const docNumVal = isQuotation ? (docData as Quotation).quotation_number : (docData as Invoice).invoice_number;
  doc.text(`${docNumLabel} ${docNumVal}`, rightColX, rightY);
  rightY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const dateLabel = isQuotation ? "Quote Date:" : "Invoice Date:";
  const dateVal = isQuotation ? (docData as Quotation).quotation_date : (docData as Invoice).invoice_date;
  doc.text(`${dateLabel} ${dateVal}`, rightColX, rightY);
  rightY += 4.5;

  const dueLabel = isQuotation ? "Valid Until:" : "Due Date:";
  const dueVal = isQuotation ? (docData as Quotation).valid_until : (docData as Invoice).due_date;
  doc.text(`${dueLabel} ${dueVal}`, rightColX, rightY);
  rightY += 4.5;

  if (isGst) {
    doc.text(`Place of Supply: ${docData.place_of_supply || "Maharashtra (27)"}`, rightColX, rightY);
    rightY += 4.5;
    doc.text(`Reverse Charge Applicable: ${(docData as Invoice).reverse_charge ? "Yes" : "No"}`, rightColX, rightY);
    rightY += 4.5;
  }

  y = Math.max(y, rightY) + 3;

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Customer Details (Billed To)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BILLED TO / CUSTOMER DETAILS:", margin, y);
  y += 4.5;

  doc.setFontSize(9);
  const custName = customer.company_name 
    ? `${customer.company_name} (Attn: ${customer.contact_name})` 
    : customer.contact_name || "Valued Client";
  doc.text(custName, margin, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  if (customer.billing_address) {
    doc.text(`${customer.billing_address}, ${customer.billing_city || ""}`, margin, y);
    y += 4;
  }
  doc.text(`${customer.billing_state || ""}${customer.billing_pincode ? " - " + customer.billing_pincode : ""}, ${customer.billing_country || "India"}`, margin, y);
  y += 4;
  if (customer.email || customer.phone) {
    doc.text(`Email: ${customer.email || "N/A"} | Phone: ${customer.phone || "N/A"}`, margin, y);
    y += 4;
  }
  if (customer.pan) {
    doc.text(`PAN: ${customer.pan}`, margin, y);
    y += 4;
  }
  if (isGst && customer.gstin) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Customer GSTIN: ${customer.gstin} (State Code: ${customer.billing_state_code || "N/A"})`, margin, y);
    y += 4;
  }

  y += 2;

  // Table Items
  const items = docData.items || [];
  const isInterstate = docData.is_interstate;

  let tableHeaders: string[] = [];
  let tableRows: any[][] = [];

  if (isGst) {
    if (isInterstate) {
      tableHeaders = ["#", "Item & Description", "HSN/SAC", "Qty", "Rate", "Taxable", "IGST %", "IGST Amt", "Total"];
      tableRows = items.map((item, idx) => [
        idx + 1,
        item.item_description,
        item.sac_hsn_code || "998314",
        `${item.quantity} ${item.unit || ""}`,
        formatINR(item.unit_price, "₹"),
        formatINR(item.taxable_amount, "₹"),
        `${item.igst_rate}%`,
        formatINR(item.igst_amount, "₹"),
        formatINR(item.total_amount, "₹"),
      ]);
    } else {
      tableHeaders = ["#", "Item & Description", "HSN/SAC", "Qty", "Rate", "Taxable", "CGST", "SGST", "Total"];
      tableRows = items.map((item, idx) => [
        idx + 1,
        item.item_description,
        item.sac_hsn_code || "998314",
        `${item.quantity} ${item.unit || ""}`,
        formatINR(item.unit_price, "₹"),
        formatINR(item.taxable_amount, "₹"),
        `${item.cgst_rate}% (${formatINR(item.cgst_amount, "₹")})`,
        `${item.sgst_rate}% (${formatINR(item.sgst_amount, "₹")})`,
        formatINR(item.total_amount, "₹"),
      ]);
    }
  } else {
    tableHeaders = ["#", "Item & Description", "Qty", "Unit Price", "Discount %", "Total Amount"];
    tableRows = items.map((item, idx) => [
      idx + 1,
      item.item_description,
      `${item.quantity} ${item.unit || ""}`,
      formatINR(item.unit_price, "₹"),
      `${item.discount_percent || 0}%`,
      formatINR(item.total_amount, "₹"),
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [tableHeaders],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate table bottom
  let finalY = ((doc as any).lastAutoTable?.finalY || y + 20) + 6;

  if (finalY > pageHeight - 65) {
    doc.addPage();
    finalY = margin + 10;
  }

  // Amount in Words & Totals Block
  const totalsX = pageWidth - margin - 75;

  // Left side: Amount in Words & Bank details
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Amount in Words:", margin, finalY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(docData.amount_in_words || "Rupees Zero Only", margin, finalY + 4, { maxWidth: totalsX - margin - 5 });

  let bankY = finalY + 12;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Payment & Bank Details:", margin, bankY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  bankY += 4;
  doc.text(`Bank Name: ${company.bank_name || "HDFC Bank Ltd"}`, margin, bankY);
  bankY += 3.8;
  doc.text(`Account Holder: ${company.bank_account_holder || "QORVA LABS LLP"}`, margin, bankY);
  bankY += 3.8;
  doc.text(`Account No: ${company.bank_account_no || "50200088991122"}`, margin, bankY);
  bankY += 3.8;
  doc.text(`IFSC Code: ${company.bank_ifsc || "HDFC0001234"} | Branch: ${company.bank_branch || "Malad West, Mumbai"}`, margin, bankY);
  bankY += 3.8;
  if (company.upi_id) {
    doc.text(`UPI ID: ${company.upi_id}`, margin, bankY);
    bankY += 3.8;
  }

  // Right side: Financial Totals Box
  doc.setFillColor(248, 250, 252);
  doc.rect(totalsX, finalY - 2, 75, 42, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsX, finalY - 2, 75, 42, "S");

  let tY = finalY + 3;
  const printRow = (label: string, val: string, isBold: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    doc.setFontSize(isBold ? 9 : 8);
    doc.text(label, totalsX + 3, tY);
    doc.text(val, totalsX + 72, tY, { align: "right" });
    tY += 4.5;
  };

  printRow("Subtotal:", formatINR(docData.subtotal, "₹"));
  if (docData.discount_amount > 0) {
    printRow("Discount:", `-${formatINR(docData.discount_amount, "₹")}`);
  }
  printRow("Taxable Amount:", formatINR(docData.taxable_amount, "₹"));

  if (isGst) {
    if (docData.is_interstate) {
      printRow("IGST Total:", formatINR(docData.igst_amount, "₹"));
    } else {
      printRow("CGST Total:", formatINR(docData.cgst_amount, "₹"));
      printRow("SGST Total:", formatINR(docData.sgst_amount, "₹"));
    }
  }

  if (docData.round_off !== 0) {
    printRow("Round Off:", formatINR(docData.round_off, "₹"));
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 2, tY - 1, totalsX + 73, tY - 1);
  tY += 2;
  printRow("Total Amount:", formatINR(docData.total_amount, "₹"), true);

  if (!isQuotation) {
    const inv = docData as Invoice;
    printRow("Amount Paid:", formatINR(inv.amount_paid, "₹"));
    printRow("Balance Due:", formatINR(inv.balance_due, "₹"), true);
  }

  // Footer / Signatory
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for your business. Disputes subject to Mumbai jurisdiction.", margin, footerY);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${company.company_name || "QORVA LABS LLP"}`, pageWidth - margin, footerY - 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signatory", pageWidth - margin, footerY, { align: "right" });

  return doc;
}
