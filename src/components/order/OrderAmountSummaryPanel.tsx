import React, { useMemo } from "react";
import { AppConstant } from "../../lib/global/AppConstant";
import type {
  OrderOfferBreakdown,
  OrderRefundBreakdown,
  OtherChargeRow,
} from "../../lib/order/orders";

/** Match order view / payment editor amount summary. */
export const orderAmountSummaryShell: React.CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.1))",
  backgroundColor: "var(--bg-color)",
};

export const orderAmountSummaryPanelWrap: React.CSSProperties = {
  ...orderAmountSummaryShell,
  padding: "14px 16px",
  backgroundColor: "rgba(0,0,0,0.03)",
};

export const orderPaymentSummaryRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "12px",
  padding: "10px 0",
  fontSize: "1.15rem",
  borderBottom: "1px solid var(--txtfld-border, rgba(0,0,0,0.08))",
};

export const orderPaymentSummaryLabel: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 600,
  color: "var(--primary-txt-color, #1a1a1a)",
};

export const orderPaymentSummaryValue: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 600,
  color: "var(--primary-txt-color, #1a1a1a)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

export const orderPaymentSummaryTotalWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  paddingTop: "14px",
  marginTop: "8px",
  borderTop: "2px solid var(--txtfld-border, rgba(0,0,0,0.14))",
};

export const orderPaymentSummaryTotalLabel: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 700,
  color: "var(--primary-color, #0d6efd)",
};

export const orderPaymentSummaryTotalValue: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 700,
  color: "var(--primary-color, #0d6efd)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const paymentInlineBreakdown: React.CSSProperties = {
  fontSize: "0.88rem",
  fontWeight: 500,
  color: "var(--content-txt-color, #6c757d)",
};

const adjustmentBlockTop: React.CSSProperties = {
  marginTop: "8px",
  paddingTop: "4px",
};

function money(sym: string, n: number): string {
  return `${sym}${n.toFixed(2)}`;
}

/** Gross service amount with optional offer strike (view pattern). */
export function orderServiceAmountOfferDisplay(
  serviceAmount: number,
  offerDiscount: number
): {
  showStrike: boolean;
  before: number;
  after: number;
} {
  const disc = Math.max(0, Number(offerDiscount) || 0);
  const base = Math.max(0, Number(serviceAmount) || 0);
  if (disc <= 0.009) {
    return { showStrike: false, before: base, after: base };
  }
  return {
    showStrike: true,
    before: base,
    after: Math.max(0, base - disc),
  };
}

export type OrderAmountSummaryPanelProps = {
  /** Pre-offer service amount (before offer discount on this line). */
  serviceAmount: number;
  offerDiscount?: number;
  taxPct: number;
  taxAmount: number;
  commissionPct: number;
  commissionAmount: number;
  otherCharges?: OtherChargeRow[];
  offer?: OrderOfferBreakdown;
  orderDiscount?: number;
  refund?: OrderRefundBreakdown;
  /** Extra refund total when breakdown rows are empty (e.g. `orderRefundAmount`). */
  refundTotal?: number;
  finalTotal: number;
  finalTotalLabel?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export default function OrderAmountSummaryPanel({
  serviceAmount,
  offerDiscount = 0,
  taxPct,
  taxAmount,
  commissionPct,
  commissionAmount,
  otherCharges = [],
  offer,
  orderDiscount = 0,
  refund,
  refundTotal = 0,
  finalTotal,
  finalTotalLabel = "Total Price",
  title = "Amount summary",
  className = "",
  style,
  children,
}: OrderAmountSummaryPanelProps) {
  const sym = AppConstant.currencySymbol;

  const serviceDisplay = useMemo(
    () => orderServiceAmountOfferDisplay(serviceAmount, offerDiscount),
    [serviceAmount, offerDiscount]
  );

  const offerBreakdown = offer ?? {
    totalOfferValue: 0,
    adminContribution: 0,
    partnerContribution: 0,
    appliedDiscount: 0,
  };

  const showOfferTemplate = useMemo(() => {
    const b = offerBreakdown;
    return (
      b.totalOfferValue > 0 ||
      b.adminContribution > 0 ||
      b.partnerContribution > 0
    );
  }, [offerBreakdown]);

  const showOfferSummary = useMemo(
    () => offerBreakdown.appliedDiscount > 0 || showOfferTemplate,
    [offerBreakdown.appliedDiscount, showOfferTemplate]
  );

  const refundBreakdown = refund ?? {
    refundAmount: 0,
    adminCommission: 0,
    partnerWallet: 0,
  };

  const refundN = Math.max(
    refundBreakdown.refundAmount,
    Number(refundTotal) || 0
  );

  const showRefundSummary = useMemo(() => {
    const r = refundBreakdown;
    return r.refundAmount > 0 || r.adminCommission > 0 || r.partnerWallet > 0;
  }, [refundBreakdown]);

  const otherSum = useMemo(
    () =>
      otherCharges.reduce(
        (a, c) => a + Math.max(0, Number(c.amount) || 0),
        0
      ),
    [otherCharges]
  );

  const discOrder = Math.max(0, Number(orderDiscount) || 0);

  return (
    <div
      className={`rounded-3 p-3 mt-1 ${className}`.trim()}
      style={{ ...orderAmountSummaryPanelWrap, ...style }}
    >
      <div
        className="fw-semibold text-uppercase small text-muted mb-3"
        style={{ letterSpacing: "0.05em" }}
      >
        {title}
      </div>

      <div style={orderPaymentSummaryRow}>
        <span style={orderPaymentSummaryLabel}>Service Amount</span>
        <span style={orderPaymentSummaryValue}>
          {serviceDisplay.showStrike ? (
            <>
              <span
                className="text-decoration-line-through text-muted me-2"
                style={{ fontSize: "0.92em", fontWeight: 500 }}
              >
                {money(sym, serviceDisplay.before)}
              </span>
              <span>{money(sym, serviceDisplay.after)}</span>
            </>
          ) : (
            money(sym, serviceDisplay.after)
          )}
        </span>
      </div>

      <div style={orderPaymentSummaryRow}>
        <span style={orderPaymentSummaryLabel}>Tax ({taxPct}%)</span>
        <span style={orderPaymentSummaryValue}>{money(sym, taxAmount)}</span>
      </div>

      <div style={orderPaymentSummaryRow}>
        <span style={orderPaymentSummaryLabel}>
          Commission ({commissionPct}%)
        </span>
        <span style={orderPaymentSummaryValue}>
          {money(sym, commissionAmount)}
        </span>
      </div>

      {otherCharges.map((c) => (
        <div key={c.id} style={orderPaymentSummaryRow}>
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              paddingRight: "8px",
            }}
          >
            <div
              style={{
                ...orderPaymentSummaryLabel,
                fontSize: "1.05rem",
              }}
            >
              {c.serviceName?.trim() ||
                c.description?.trim() ||
                "Other service charge"}
            </div>
            {c.serviceName?.trim() && c.description?.trim() ? (
              <div className="text-muted small mt-1">{c.description.trim()}</div>
            ) : null}
          </div>
          <span style={orderPaymentSummaryValue}>
            {money(sym, Number(c.amount || 0))}
          </span>
        </div>
      ))}

      {otherCharges.length > 1 ? (
        <div style={orderPaymentSummaryRow}>
          <span style={{ ...orderPaymentSummaryLabel, fontSize: "1.05rem" }}>
            Other service charges (total)
          </span>
          <span style={orderPaymentSummaryValue}>{money(sym, otherSum)}</span>
        </div>
      ) : null}

      {showOfferSummary ? (
        <div style={{ ...orderPaymentSummaryRow, ...adjustmentBlockTop }}>
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            <span style={orderPaymentSummaryLabel}>Offer</span>
            {offerBreakdown.offerCode ? (
              <span
                className="rounded-pill border px-2 py-0"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  backgroundColor: "rgba(0,0,0,0.04)",
                }}
              >
                {offerBreakdown.offerCode}
              </span>
            ) : null}
            <span style={paymentInlineBreakdown}>
              {showOfferTemplate ? (
                <>
                  ( Total offer value {money(sym, offerBreakdown.totalOfferValue)}
                  <span className="text-secondary"> · </span>
                  Admin {money(sym, offerBreakdown.adminContribution)}
                  <span className="text-secondary"> · </span>
                  Partner {money(sym, offerBreakdown.partnerContribution)})
                </>
              ) : offerBreakdown.offerName?.trim() ? (
                <> ({offerBreakdown.offerName.trim()})</>
              ) : null}
            </span>
          </div>
          <span
            style={{
              ...orderPaymentSummaryValue,
              flexShrink: 0,
              color:
                offerBreakdown.appliedDiscount > 0
                  ? "#198754"
                  : "var(--content-txt-color, #6c757d)",
            }}
          >
            {offerBreakdown.appliedDiscount > 0 ? "−" : ""}
            {money(sym, offerBreakdown.appliedDiscount)}
          </span>
        </div>
      ) : null}

      {discOrder > 0 ? (
        <div
          style={{
            ...orderPaymentSummaryRow,
            ...(!showOfferSummary ? adjustmentBlockTop : {}),
          }}
        >
          <span style={{ ...orderPaymentSummaryLabel, fontSize: "1.05rem" }}>
            Discount
          </span>
          <span style={{ ...orderPaymentSummaryValue, color: "#198754" }}>
            −{money(sym, discOrder)}
          </span>
        </div>
      ) : null}

      {showRefundSummary || refundN > 0 ? (
        <div
          style={{
            ...orderPaymentSummaryRow,
            ...(!showOfferSummary && discOrder <= 0 ? adjustmentBlockTop : {}),
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            <span style={orderPaymentSummaryLabel}>Refund Amount</span>
            <span style={paymentInlineBreakdown}>
              ( Admin Commission {money(sym, refundBreakdown.adminCommission)}
              <span className="text-secondary"> · </span>
              Partner Wallet {money(sym, refundBreakdown.partnerWallet)})
            </span>
          </div>
          <span
            style={{
              ...orderPaymentSummaryValue,
              color: "#dc3545",
              flexShrink: 0,
            }}
          >
            −{money(sym, refundBreakdown.refundAmount || refundN)}
          </span>
        </div>
      ) : null}

      <div style={orderPaymentSummaryTotalWrap}>
        <span style={orderPaymentSummaryTotalLabel}>{finalTotalLabel}</span>
        <span style={orderPaymentSummaryTotalValue}>
          {money(sym, finalTotal)}
        </span>
      </div>

      {children}
    </div>
  );
}
