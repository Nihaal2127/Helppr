import React from "react";
import { Row, Col } from "react-bootstrap";
import { formatQuoteRupees } from "../../lib/quote/quotePriceBreakdown";
import type { QuotePriceBreakdown } from "../../lib/quote/quotePriceBreakdown";
import { AppConstant } from "../../lib/global/AppConstant";
import { QUOTE_SECTION_TITLE_CLASS } from "../../lib/quote/quoteModalLayout";

type QuotePriceBreakdownPanelProps = {
  breakdown: QuotePriceBreakdown;
  className?: string;
  variant?: "default" | "view";
};

type BreakdownLineProps = {
  label: React.ReactNode;
  amount: number;
  labelClassName?: string;
  valueClassName?: string;
  divider?: boolean;
};

function BreakdownLine({
  label,
  amount,
  labelClassName = "",
  valueClassName = "",
  divider = false,
}: BreakdownLineProps) {
  return (
    <Row
      className={`mb-2 align-items-baseline g-1${
        divider ? " border-top pt-2 mt-2" : ""
      }`}
    >
      <Col className={`text-break ${labelClassName}`.trim()}>{label}</Col>
      <Col xs="auto" className={`text-end ${valueClassName}`.trim()}>
        {formatQuoteRupees(amount)}
      </Col>
    </Row>
  );
}

export default function QuotePriceBreakdownPanel({
  breakdown,
  className = "",
  variant = "default",
}: QuotePriceBreakdownPanelProps) {
  const isView = variant === "view";

  return (
    <div
      className={`border rounded p-3 bg-light${
        isView ? "" : " small"
      } ${className}`.trim()}
    >
      <h6 className={QUOTE_SECTION_TITLE_CLASS}>Amount breakdown</h6>
      <BreakdownLine label="Service price" amount={breakdown.base} />
      <BreakdownLine
        label={
          <>
            Admin commission ({breakdown.commissionPct}
            {AppConstant.percentageSymbol} on service)
          </>
        }
        amount={breakdown.commissionAmount}
      />
      <BreakdownLine label="Subtotal (before tax)" amount={breakdown.subtotalBeforeTax} />
      <BreakdownLine
        label={
          <>
            Tax ({breakdown.taxPct}
            {AppConstant.percentageSymbol} on subtotal)
          </>
        }
        amount={breakdown.taxAmount}
      />
      <BreakdownLine
        label="Total (incl. tax)"
        amount={breakdown.grandTotal}
        labelClassName="fw-bold"
        valueClassName="fw-bold"
        divider={!isView}
      />
      <BreakdownLine
        label={
          <>
            {breakdown.minDepositTitle}
            {breakdown.minDepositNote ? <> {breakdown.minDepositNote}</> : null}
          </>
        }
        amount={breakdown.minDepositAmount}
        labelClassName={isView ? "text-muted" : "text-muted small"}
        valueClassName={
          isView ? "text-muted fw-semibold" : "text-muted fw-semibold small"
        }
        divider={!isView}
      />
    </div>
  );
}
