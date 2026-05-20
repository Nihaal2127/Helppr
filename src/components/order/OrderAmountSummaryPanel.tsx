import React from "react";
import { AppConstant } from "../../lib/global/AppConstant";
import type { OrderAmountSummaryDisplay } from "../../lib/order/orderAmountSummary";
import type { OtherChargeRow } from "../../lib/order/orderPaymentRows";

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

const sym = () => AppConstant.currencySymbol;

function money(n: number): string {
  return `${sym()}${n.toFixed(2)}`;
}

function AmountRow({
  label,
  amount,
  original,
  showStrike,
  valueClassName = "",
  labelExtra,
}: {
  label: React.ReactNode;
  amount: number;
  original?: number;
  showStrike?: boolean;
  valueClassName?: string;
  labelExtra?: React.ReactNode;
}) {
  const struck =
    showStrike &&
    original != null &&
    Math.abs(original - amount) > 0.009;

  return (
    <div style={orderPaymentSummaryRow}>
      <span style={orderPaymentSummaryLabel}>
        {label}
        {labelExtra}
      </span>
      <span
        style={{
          ...orderPaymentSummaryValue,
          ...(valueClassName ? { color: valueClassName } : {}),
        }}
      >
        {struck ? (
          <>
            <span
              className="text-decoration-line-through text-muted me-2"
              style={{ fontSize: "0.92em", fontWeight: 500 }}
            >
              {money(original!)}
            </span>
            <span>{money(amount)}</span>
          </>
        ) : (
          money(amount)
        )}
      </span>
    </div>
  );
}

function DeductionRow({
  label,
  amount,
}: {
  label: React.ReactNode;
  amount: number;
}) {
  if (amount <= 0.009) return null;
  return (
    <div style={orderPaymentSummaryRow}>
      <span style={{ ...orderPaymentSummaryLabel, fontSize: "1.05rem" }}>
        {label}
      </span>
      <span
        style={{
          ...orderPaymentSummaryValue,
          color: "#198754",
          fontSize: "1.05rem",
        }}
      >
        −{money(amount)}
      </span>
    </div>
  );
}

export type OrderAmountSummaryPanelProps = {
  display: OrderAmountSummaryDisplay;
  title?: string;
  finalTotalLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export default function OrderAmountSummaryPanel({
  display,
  title = "Amount summary",
  finalTotalLabel = "Total Price",
  className = "",
  style,
  children,
}: OrderAmountSummaryPanelProps) {
  const { lines, otherCharges, offer, orderDiscount, refund, refundTotal, finalTotal } =
    display;
  const pctSym = AppConstant.percentageSymbol;

  const serviceStrike =
    offer.partnerContribution > 0.009 ||
    Math.abs(lines.serviceBefore - lines.serviceAfter) > 0.009;
  const commissionStrike =
    offer.adminContribution > 0.009 ||
    Math.abs(lines.commissionBefore - lines.commissionAfter) > 0.009;

  const showPartnerOffer = offer.partnerContribution > 0.009;
  const showAdminOffer = offer.adminContribution > 0.009;
  const showOfferBlock =
    showPartnerOffer ||
    showAdminOffer ||
    offer.appliedDiscount > 0.009 ||
    Boolean(offer.offerCode?.trim()) ||
    Boolean(offer.offerName?.trim());

  const otherSum = otherCharges.reduce(
    (a: number, c: OtherChargeRow) => a + Math.max(0, Number(c.amount) || 0),
    0
  );

  const showRefund =
    refund.refundAmount > 0 ||
    refund.adminCommission > 0 ||
    refund.partnerWallet > 0 ||
    refundTotal > 0;

  const refundAmount = Math.max(refund.refundAmount, refundTotal);

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

      <AmountRow
        label="Service amount"
        original={lines.serviceBefore}
        amount={lines.serviceAfter}
        showStrike={serviceStrike}
      />

      {otherCharges.map((c: OtherChargeRow) => (
        <div key={c.id} style={orderPaymentSummaryRow}>
          <div style={{ minWidth: 0, flex: "1 1 auto", paddingRight: "8px" }}>
            <div style={{ ...orderPaymentSummaryLabel, fontSize: "1.05rem" }}>
              {c.serviceName?.trim() ||
                c.description?.trim() ||
                "Additional charge"}
            </div>
            {c.serviceName?.trim() && c.description?.trim() ? (
              <div className="text-muted small mt-1">{c.description.trim()}</div>
            ) : null}
          </div>
          <span style={orderPaymentSummaryValue}>
            {money(Number(c.amount || 0))}
          </span>
        </div>
      ))}

      {otherCharges.length > 1 ? (
        <AmountRow
          label="Additional charges (total)"
          amount={otherSum}
        />
      ) : null}

      <AmountRow
        label={
          <>
            Admin commission ({lines.commissionPct}
            {pctSym} on service
            {otherSum > 0.009 ? " + additional charges" : ""})
          </>
        }
        original={lines.commissionBefore}
        amount={lines.commissionAfter}
        showStrike={commissionStrike}
      />

      <AmountRow label="Subtotal (before tax)" amount={lines.subtotalBeforeTax} />

      <AmountRow
        label={
          <>
            Tax ({lines.taxPct}
            {pctSym} on subtotal)
          </>
        }
        amount={lines.taxAmount}
      />

      <AmountRow
        label="Total (incl. tax)"
        amount={lines.totalInclTax}
        labelExtra={undefined}
      />

      {showOfferBlock ? (
        <div style={orderPaymentSummaryRow}>
          <span
            style={{
              ...orderPaymentSummaryLabel,
              fontSize: "1.05rem",
              minWidth: 0,
              flex: "1 1 auto",
              paddingRight: "8px",
            }}
          >
            <span>Offer</span>
            {offer.offerCode ? (
              <span
                className="rounded-pill border px-2 py-0 ms-2"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  verticalAlign: "middle",
                }}
              >
                {offer.offerCode}
              </span>
            ) : null}
            {offer.offerName?.trim() ? (
              <span className="text-muted fw-normal ms-2">
                {offer.offerName.trim()}
              </span>
            ) : null}
            {(showPartnerOffer || showAdminOffer) && (
              <span
                className="text-muted fw-normal ms-2"
                style={{ fontSize: "0.9rem" }}
              >
                {showPartnerOffer
                  ? `Partner −${money(offer.partnerContribution)}`
                  : ""}
                {showPartnerOffer && showAdminOffer ? " · " : ""}
                {showAdminOffer
                  ? `Admin −${money(offer.adminContribution)}`
                  : ""}
              </span>
            )}
          </span>
          <span
            style={{
              ...orderPaymentSummaryValue,
              color: "#198754",
              fontSize: "1.05rem",
            }}
          >
            −
            {money(
              offer.appliedDiscount > 0.009
                ? offer.appliedDiscount
                : offer.partnerContribution + offer.adminContribution
            )}
          </span>
        </div>
      ) : null}

      {orderDiscount > 0.009 ? (
        <div style={orderPaymentSummaryRow}>
          <span style={{ ...orderPaymentSummaryLabel, fontSize: "1.05rem" }}>
            Discount
          </span>
          <span style={{ ...orderPaymentSummaryValue, color: "#198754" }}>
            −{money(orderDiscount)}
          </span>
        </div>
      ) : null}

      {showRefund ? (
        <div style={orderPaymentSummaryRow}>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <span style={orderPaymentSummaryLabel}>Refund</span>
            <div
              className="text-muted small mt-1"
              style={{ fontWeight: 500 }}
            >
              Admin commission {money(refund.adminCommission)}
              <span className="mx-1">·</span>
              Partner wallet {money(refund.partnerWallet)}
            </div>
          </div>
          <span style={{ ...orderPaymentSummaryValue, color: "#dc3545" }}>
            −{money(refundAmount)}
          </span>
        </div>
      ) : null}

      <div style={orderPaymentSummaryTotalWrap}>
        <span style={orderPaymentSummaryTotalLabel}>{finalTotalLabel}</span>
        <span style={orderPaymentSummaryTotalValue}>{money(finalTotal)}</span>
      </div>

      {children}
    </div>
  );
}
