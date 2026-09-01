import type { APIRequestContext } from "@playwright/test";

export interface FinanceClusterFixture {
  invoiceNumber: string;
  rateCardId: string;
  expenseId: string;
  approvalId: string;
  paymentId: string;
}

/** Load first seeded finance records for deterministic E2E deep links. */
export async function loadFinanceClusterFixture(
  request: APIRequestContext,
): Promise<FinanceClusterFixture | null> {
  const [invoicesRes, rateCardsRes, expensesRes, approvalsRes, vouchersRes] =
    await Promise.all([
      request.get("/api/invoices"),
      request.get("/api/rate-cards"),
      request.get("/api/expenses"),
      request.get("/api/approvals"),
      request.get("/api/treasury/vouchers"),
    ]);

  if (!invoicesRes.ok() || !expensesRes.ok() || !approvalsRes.ok()) return null;

  const invoicesBody = (await invoicesRes.json()) as {
    invoices?: { invoiceNumber: string }[];
  };
  const rateCardsBody = rateCardsRes.ok()
    ? ((await rateCardsRes.json()) as { rateCards?: { id: string }[] })
    : { rateCards: [] };
  const expensesBody = (await expensesRes.json()) as { expenses?: { id: string }[] };
  const approvalsBody = (await approvalsRes.json()) as {
    requests?: { id: string }[];
  };
  const vouchersBody = vouchersRes.ok()
    ? ((await vouchersRes.json()) as { vouchers?: { id: string }[] })
    : { vouchers: [] };

  const invoice = invoicesBody.invoices?.[0];
  const expense = expensesBody.expenses?.[0];
  const approval = approvalsBody.requests?.[0];
  if (!invoice || !expense || !approval) return null;

  return {
    invoiceNumber: invoice.invoiceNumber,
    rateCardId: rateCardsBody.rateCards?.[0]?.id ?? "missing-rate-card",
    expenseId: expense.id,
    approvalId: approval.id,
    paymentId: vouchersBody.vouchers?.[0]?.id ?? "missing-payment",
  };
}
