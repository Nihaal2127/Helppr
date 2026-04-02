import { apiRequest } from "../remote/apiHelper";
import { ApiPaths } from "../remote/apiPaths";
import { showLog } from "../helper/utility";

export type PartnerWalletPayoutHistoryRow = {
  _id: string;
  created_at?: string;
  amount: number;
  payment_method: string;
  description?: string;
};

export type PartnerWalletPayoutPayload = {
  partner_id: string;
  amount: number;
  payment_method: "cash" | "razorpay";
  description?: string;
};

/** Records a manual payout against partner wallet. Backend should deduct wallet, update pending lines, and store history. */
export async function submitPartnerWalletPayout(
  payload: PartnerWalletPayoutPayload
): Promise<boolean> {
  try {
    const response = await apiRequest(ApiPaths.PARTNER_WALLET_PAYOUT, "POST", {
      partner_id: payload.partner_id,
      amount: payload.amount,
      payment_method: payload.payment_method,
      ...(payload.description ? { description: payload.description } : {}),
    });
    if (response.success) {
      return true;
    }
    showLog(response.message || "Payout failed");
    return false;
  } catch (e) {
    showLog(e);
    return false;
  }
}

/**
 * Admin-initiated wallet payouts (Cash / Razorpay). Tolerates common response shapes; returns empty if API missing.
 */
export async function fetchPartnerWalletPayoutHistory(
  partnerId: string,
  page: number,
  limit: number
): Promise<{
  response: boolean;
  rows: PartnerWalletPayoutHistoryRow[];
  totalPages: number;
}> {
  try {
    const params = new URLSearchParams({
      partner_id: partnerId,
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest(
      `${ApiPaths.PARTNER_WALLET_PAYOUT_HISTORY()}?${params.toString()}`,
      "GET",
      undefined,
      false,
      true
    );
    if (!response.success) {
      return { response: false, rows: [], totalPages: 0 };
    }
    const d = response.data ?? {};
    const inner =
      d.data != null && typeof d.data === "object" && !Array.isArray(d.data) ? d.data : null;
    const rawRecords = inner?.records ?? d.records ?? (Array.isArray(d.data) ? d.data : null);
    const list = Array.isArray(rawRecords) ? rawRecords : Array.isArray(d) ? d : [];
    const totalPagesVal = inner?.totalPages ?? d.totalPages ?? 1;
    const rows: PartnerWalletPayoutHistoryRow[] = list.map((r: any, i: number) => ({
      _id: String(r._id ?? r.id ?? `p-${i}`),
      created_at: r.created_at ?? r.date ?? r.payout_date ?? "",
      amount: Number(r.amount ?? r.payout_amount ?? 0),
      payment_method: String(r.payment_method ?? r.method ?? "—"),
      description: r.description != null ? String(r.description) : undefined,
    }));
    return { response: true, rows, totalPages: Math.max(1, Number(totalPagesVal) || 1) };
  } catch {
    return { response: false, rows: [], totalPages: 0 };
  }
}

/** Loads every page of payout history (bounded) for a unified wallet ledger. */
export async function fetchAllPartnerWalletPayoutHistory(
  partnerId: string,
  opts?: { pageSize?: number; maxPages?: number }
): Promise<PartnerWalletPayoutHistoryRow[]> {
  const pageSize = opts?.pageSize ?? 100;
  const maxPages = opts?.maxPages ?? 30;
  const all: PartnerWalletPayoutHistoryRow[] = [];
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const { response, rows, totalPages } = await fetchPartnerWalletPayoutHistory(partnerId, page, pageSize);
    if (!response) break;
    all.push(...rows);
    if (rows.length < pageSize || page >= totalPages) break;
    page += 1;
  }
  return all;
}
