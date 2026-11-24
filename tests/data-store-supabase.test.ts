import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";

test("Supabase data-store feature flows", async () => {
  const savedEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const savedFetch = globalThis.fetch;

  const companyId = randomUUID();
  const customerId = randomUUID();
  const tables: Record<string, Record<string, any>[]> = {
    company_settings: [{
      id: companyId,
      company_name: "Smoke Test Company",
      is_gst_registered: false,
      state: "Maharashtra",
      state_code: "27",
      country: "India",
      email: "smoke@example.invalid",
      default_currency: "INR",
      currency_symbol: "Rs.",
      financial_year_start: 4,
      gst_invoice_prefix: "TEST/TAX/{FY}/",
      non_gst_invoice_prefix: "TEST/INV/{FY}/",
      bill_of_supply_prefix: "TEST/BOS/{FY}/",
      quotation_prefix: "TEST/EST/{FY}/",
      credit_note_prefix: "TEST/CN/{FY}/",
      default_payment_terms: "Test terms",
      default_notes: "Test notes",
      terms_and_conditions: "Test conditions",
      updated_at: new Date().toISOString(),
    }],
    customers: [{
      id: customerId,
      customer_type: "business",
      company_name: "Smoke Test Customer",
      contact_name: "Smoke Test Contact",
      preferred_currency: "INR",
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    products_services: [], quotations: [], quotation_items: [], invoices: [], invoice_items: [],
    payments: [], credit_notes: [], expenses: [], audit_logs: [],
  };

  const matches = (row: Record<string, any>, params: URLSearchParams) => {
    for (const [key, filter] of params.entries()) {
      const parseFilter = (value: string) => value === "true" ? true : value === "false" ? false : value;
      if (filter.startsWith("eq.") && row[key] !== parseFilter(filter.slice(3))) return false;
      if (filter.startsWith("neq.") && row[key] === parseFilter(filter.slice(4))) return false;
      if (filter.startsWith("in.(")) {
        const values = filter.slice(4, -1).split(",").map((value) => value.replace(/^"|"$/g, ""));
        if (!values.includes(String(row[key]))) return false;
      }
    }
    return true;
  };

  const respond = (rows: Record<string, any>[], status: number, headers: Headers, bodyAllowed = true) => {
    const contentRange = headers.get("prefer")?.includes("count=exact") ? `*/${rows.length}` : `0-${Math.max(0, rows.length - 1)}/${rows.length}`;
    const responseHeaders = { "content-range": contentRange, "content-type": "application/json" };
    if (!bodyAllowed || status === 204) return new Response(null, { status, headers: responseHeaders });
    if (headers.get("accept")?.includes("application/vnd.pgrst.object+json")) {
      if (rows.length !== 1) return new Response(JSON.stringify({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }), { status: 406, headers: responseHeaders });
      return new Response(JSON.stringify(rows[0]), { status, headers: responseHeaders });
    }
    return new Response(JSON.stringify(rows), { status, headers: responseHeaders });
  };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const table = requestUrl.pathname.split("/").pop() || "";
    const rows = tables[table];
    if (!rows) return new Response(JSON.stringify({ message: `Unknown mock table ${table}` }), { status: 404 });
    const headers = new Headers(init?.headers);
    const method = init?.method || "GET";
    const params = requestUrl.searchParams;
    const matching = rows.filter((row) => matches(row, params));

    if (method === "GET" || method === "HEAD") {
      let result = [...matching];
      const order = params.get("order");
      if (order) {
        const [column, direction] = order.split(".");
        result.sort((a, b) => String(a[column] || "").localeCompare(String(b[column] || "")) * (direction === "desc" ? -1 : 1));
      }
      const limit = Number(params.get("limit"));
      if (limit > 0) result = result.slice(0, limit);
      return respond(method === "HEAD" ? matching : result, 200, headers, method !== "HEAD");
    }

    if (method === "POST") {
      const payload = JSON.parse(String(init?.body || "{}"));
      const inserts = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
        id: row.id || randomUUID(),
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
        ...row,
      }));
      rows.push(...inserts);
      return respond(inserts, 201, headers, headers.get("prefer")?.includes("return=representation") === true);
    }

    if (method === "PATCH") {
      const updates = JSON.parse(String(init?.body || "{}"));
      const updated = matching.map((row) => Object.assign(row, updates, { updated_at: new Date().toISOString() }));
      return respond(updated, headers.get("prefer")?.includes("return=representation") ? 200 : 204, headers, headers.get("prefer")?.includes("return=representation") === true);
    }

    if (method === "DELETE") {
      const deleted = [...matching];
      tables[table] = rows.filter((row) => !matching.includes(row));
      if (table === "invoices") tables.invoice_items = tables.invoice_items.filter((item) => !deleted.some((invoice) => invoice.id === item.invoice_id));
      if (table === "quotations") tables.quotation_items = tables.quotation_items.filter((item) => !deleted.some((quote) => quote.id === item.quotation_id));
      return respond(deleted, headers.get("prefer")?.includes("return=representation") ? 200 : 204, headers, headers.get("prefer")?.includes("return=representation") === true);
    }

    return new Response(JSON.stringify({ message: `Unsupported mock method ${method}` }), { status: 405 });
  }) as typeof fetch;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://qorva-smoke.supabase.co";
  const fakeJwtPayload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  process.env.SUPABASE_SERVICE_ROLE_KEY = `header.${fakeJwtPayload}.signature`;

  try {
    const dataStoreModule = await import("../lib/db/data-store");
    const store = (dataStoreModule as any).default || dataStoreModule;
    assert.equal((await store.getCompanySettings()).company_name, "Smoke Test Company");
    assert.equal((await store.getCustomers()).length, 1);
    assert.equal((await store.getProductsServices()).length, 0);

    const customer = await store.createCustomer({ customer_type: "individual", contact_name: "Temporary", preferred_currency: "INR", is_archived: false });
    assert.equal((await store.getCustomerById(customer.id))?.id, customer.id);
    assert.equal(await store.deleteCustomer(customer.id), true);

    const product = await store.createProductService({ name: "Temporary Service", type: "service", unit: "unit", default_price: 1, gst_rate: 0, is_active: true });
    assert.equal((await store.getProductsServices()).length, 1);
    await store.updateProductService(product.id, { is_active: false });
    assert.equal((await store.getProductsServices()).find((row: any) => row.id === product.id)?.is_active, false);

    const today = new Date().toISOString().slice(0, 10);
    const item = { item_description: "Temporary Service", quantity: 1, unit: "unit", unit_price: 1, discount_percent: 0, gst_rate: 0, taxable_amount: 1, cgst_rate: 0, cgst_amount: 0, sgst_rate: 0, sgst_amount: 0, igst_rate: 0, igst_amount: 0, total_amount: 1, sort_order: 1 };
    const draft = await store.createInvoice({ customer_id: customerId, invoice_type: "non_gst_invoice", invoice_date: today, due_date: today, status: "draft", items: [item] });
    assert.equal((await store.getInvoiceById(draft.id))?.items?.length, 1);
    assert.equal((await store.getCustomerById(customerId))?.total_sales, 1);
    await store.updateInvoice(draft.id, { notes: "updated" });
    assert.equal((await store.getInvoiceById(draft.id))?.notes, "updated");
    assert.equal(await store.deleteInvoice(draft.id), true);

    const payable = await store.createInvoice({ customer_id: customerId, invoice_type: "non_gst_invoice", invoice_date: today, due_date: today, status: "issued", items: [item] });
    const payment = await store.recordPayment({ invoice_id: payable.id, amount: 0.5, payment_date: today, payment_method: "cash" });
    assert.equal((await store.getInvoiceById(payable.id))?.status, "partially_paid");
    assert.equal((await store.getPayments()).length, 1);
    await store.reversePayment(payment.id, "test reversal");
    assert.equal((await store.getInvoiceById(payable.id))?.balance_due, 1);

    const quote = await store.createQuotation({ customer_id: customerId, quotation_type: "non_gst", quotation_date: today, valid_until: today, status: "draft", subtotal: 1, taxable_amount: 1, total_amount: 1, items: [item] });
    assert.equal((await store.getQuotationById(quote.id))?.items?.length, 1);
    const converted = await store.convertQuotationToInvoice(quote.id);
    assert.equal((await store.getQuotationById(quote.id))?.status, "converted");
    assert.ok(converted.id);

    const expense = await store.createExpense({ category: "Test", vendor_name: "Temporary Vendor", expense_date: today, taxable_amount: 1, gst_amount: 0, total_amount: 1, payment_method: "cash" });
    assert.equal((await store.getExpenses()).length, 1);
    assert.equal(await store.deleteExpense(expense.id), true);

    const cancelled = await store.cancelInvoice(payable.id, "test cancellation");
    assert.equal(cancelled.status, "cancelled");
    assert.ok((await store.getAuditLogs()).length >= 2);
    const backup = await store.getFullBackupDump();
    assert.equal(backup.data.invoices.length, 2);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
