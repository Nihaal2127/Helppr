import { AppConstant } from "../global/AppConstant";
import { extractMinDepositTypeKey } from "../service/serviceMinDepositDisplay";
import type { ServiceDropDownOption } from "../../services/servicesService";

export type QuotePriceBreakdown = {
  base: number;
  commissionPct: number;
  commissionAmount: number;
  subtotalBeforeTax: number;
  taxPct: number;
  taxAmount: number;
  grandTotal: number;
  minDepositTitle: string;
  minDepositAmount: number;
  minDepositNote: string;
};

function roundQuoteMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatQuoteRupees(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const s = rounded.toFixed(2).replace(/\.00$/, "");
  return `${AppConstant.currencySymbol}${s}`;
}

export function computeQuotePriceBreakdown(
  servicePrice: string | number | undefined | null,
  opt: ServiceDropDownOption | undefined
): QuotePriceBreakdown | null {
  const base = Number.parseFloat(String(servicePrice ?? "").trim());
  if (!Number.isFinite(base) || base < 0) return null;
  const taxPct = Math.max(0, Number(opt?.tax ?? 0) || 0);
  const commissionPct = Math.max(0, Number(opt?.commission ?? 0) || 0);
  const commissionAmount = roundQuoteMoney(base * (commissionPct / 100));
  const subtotalBeforeTax = roundQuoteMoney(base + commissionAmount);
  const taxAmount = roundQuoteMoney(subtotalBeforeTax * (taxPct / 100));
  const grandTotal = roundQuoteMoney(subtotalBeforeTax + taxAmount);

  const typeKey = extractMinDepositTypeKey(
    String(opt?.min_deposit_type ?? opt?.payment_type ?? "")
  );
  let minDepositAmount = 0;
  let minDepositTitle = "Minimum deposit";
  let minDepositNote = "";

  if (typeKey === "per_consultancy") {
    const flat = Number(opt?.min_deposit_value ?? opt?.minimum_deposit ?? 0);
    minDepositAmount = Number.isFinite(flat) ? roundQuoteMoney(flat) : 0;
    minDepositNote = "(fixed amount for this billing type)";
  } else {
    let pct =
      Number(opt?.min_deposit_value ?? opt?.minimum_deposit ?? NaN) || 0;
    if (!Number.isFinite(pct) || pct <= 0) {
      const rawType = String(opt?.min_deposit_type ?? opt?.payment_type ?? "");
      const m = rawType.match(/\(\s*([\d.]+)\s*%?\s*\)/);
      if (m) pct = Number(m[1]) || 0;
    }
    pct = Math.max(0, pct);
    minDepositAmount = roundQuoteMoney(grandTotal * (pct / 100));
    minDepositNote =
      pct > 0
        ? `(${pct}${AppConstant.percentageSymbol} of total incl. tax)`
        : "";
  }

  return {
    base,
    commissionPct,
    commissionAmount,
    subtotalBeforeTax,
    taxPct,
    taxAmount,
    grandTotal,
    minDepositTitle,
    minDepositAmount,
    minDepositNote,
  };
}
