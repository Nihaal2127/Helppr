import React from "react";
import { Row, Col } from "react-bootstrap";
import { AppConstant } from "../../lib/global/AppConstant";
import profileIcon from "../../assets/icons/profile.svg";
import QuoteInfoFieldRow from "./QuoteInfoFieldRow";
import { QUOTE_SECTION_TITLE_CLASS } from "../../lib/quote/quoteModalLayout";

export type QuoteInfoPersonRole = "customer" | "partner" | "employee";

export type QuoteInfoPersonField = {
  label: string;
  value: React.ReactNode;
  column?: "left" | "right";
  fullWidth?: boolean;
};

type QuoteInfoPersonSectionProps = {
  title: string;
  role: QuoteInfoPersonRole;
  profileUrl?: string | null;
  fields: QuoteInfoPersonField[];
};

const PROFILE_BORDER_CLASS: Record<QuoteInfoPersonRole, string> = {
  customer: "border-primary",
  partner: "border-success",
  employee: "border-info",
};

function displayValue(value: React.ReactNode): React.ReactNode {
  if (value === undefined || value === null || value === "") return "-";
  return value;
}

function PersonFieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Row className="mb-2 g-1">
      <Col xs={5} sm={4} className="fw-semibold text-secondary">
        {label}
      </Col>
      <Col xs={7} sm={8} className="text-break">
        {displayValue(value)}
      </Col>
    </Row>
  );
}

export function resolveQuoteProfileSrc(profileUrl?: string | null): string {
  const s = String(profileUrl ?? "").trim();
  if (!s) return profileIcon;
  return `${AppConstant.IMAGE_BASE_URL}${s}?t=${Date.now()}`;
}

export default function QuoteInfoPersonSection({
  title,
  role,
  profileUrl,
  fields,
}: QuoteInfoPersonSectionProps) {
  const fullWidthFields = fields.filter((f) => f.fullWidth);
  const gridFields = fields.filter((f) => !f.fullWidth);
  const leftFields = gridFields.filter((f) => (f.column ?? "left") === "left");
  const rightFields = gridFields.filter((f) => f.column === "right");

  return (
    <section className="border rounded p-3 mb-3">
      <h6 className={QUOTE_SECTION_TITLE_CLASS}>{title}</h6>
      <Row className="g-3">
        <Col xs={12} md="auto" className="text-center text-md-start">
          <img
            src={resolveQuoteProfileSrc(profileUrl)}
            alt=""
            width={72}
            height={72}
            className={`rounded-circle object-fit-cover border border-2 ${PROFILE_BORDER_CLASS[role]}`}
          />
        </Col>
        <Col xs={12} md>
          <Row className="g-3">
            <Col xs={12} md={6}>
              {leftFields.map((field) => (
                <PersonFieldRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </Col>
            {rightFields.length > 0 ? (
              <Col xs={12} md={6}>
                {rightFields.map((field) => (
                  <PersonFieldRow
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </Col>
            ) : null}
          </Row>
          {fullWidthFields.length > 0 ? (
            <div className="border-top pt-3 mt-2">
              {fullWidthFields.map((field) => (
                <QuoteInfoFieldRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                />
              ))}
            </div>
          ) : null}
        </Col>
      </Row>
    </section>
  );
}
