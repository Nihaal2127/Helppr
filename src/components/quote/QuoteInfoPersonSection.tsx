import React from "react";
import { AppConstant } from "../../lib/global/AppConstant";
import profileIcon from "../../assets/icons/profile.svg";
import { QUOTE_SECTION_TITLE_CLASS } from "../../lib/quote/quoteHelpers";

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
  longText = false,
}: {
  label: string;
  value: React.ReactNode;
  longText?: boolean;
}) {
  const isLong =
    longText || String(label).toLowerCase().includes("email");
  return (
    <div
      className={`info-detail-inline-row custom-personal-row${
        isLong ? " info-detail-inline-row--long-text" : ""
      }`}
    >
      <span className="info-detail-inline-label custom-personal-row-title">
        {label}
      </span>
      <span className="info-detail-inline-value custom-personal-row-value text-break">
        {displayValue(value)}
      </span>
    </div>
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
  const leftFields = fields.filter(
    (f) => !f.fullWidth && (f.column ?? "left") === "left"
  );
  const rightFields = fields.filter(
    (f) => !f.fullWidth && f.column === "right"
  );

  return (
    <section className="border rounded p-3 mb-3 quote-info-person-section">
      <h6 className={QUOTE_SECTION_TITLE_CLASS}>{title}</h6>
      <div className="d-flex flex-column flex-md-row align-items-start gap-3">
        <div className="flex-shrink-0 text-center text-md-start">
          <img
            src={resolveQuoteProfileSrc(profileUrl)}
            alt=""
            width={72}
            height={72}
            className={`rounded-circle object-fit-cover border border-2 ${PROFILE_BORDER_CLASS[role]}`}
          />
        </div>
        <div className="flex-grow-1 min-w-0 w-100 quote-info-person-fields">
          {leftFields.length > 0 || rightFields.length > 0 ? (
            <div className="quote-info-person-fields-row">
              <div className="quote-info-person-fields-col info-detail-fields-col">
                {leftFields.map((field) => (
                  <PersonFieldRow
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>
              {rightFields.length > 0 ? (
                <div className="quote-info-person-fields-col info-detail-fields-col">
                  {rightFields.map((field) => (
                    <PersonFieldRow
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {fullWidthFields.length > 0 ? (
            <div className="info-detail-fields-col">
              {fullWidthFields.map((field) => (
                <PersonFieldRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  longText
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
