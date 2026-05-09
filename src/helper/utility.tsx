import type { ReactNode } from "react";
import { Row, Col } from "react-bootstrap";
import { VerificationStatusEnum } from "../constant/VerificationStatusEnum";
import { RoleEnum } from "../constant/RoleEnum";
import { OrderStatusEnum } from "../constant/OrderStatusEnum";
import { NavigateFunction } from "react-router-dom";
import { ResolveStatusEnum } from "../constant/ResolveStatusEnum";
import { AppConstant } from "../constant/AppConstant";

let navigate: NavigateFunction;

export const setNavigate = (nav: NavigateFunction) => {
  navigate = nav;
};

export const getNavigate = () => navigate;

export const capitalizeString = (str: string) =>
  str.replace(/\b\w/g, (char) => char.toUpperCase());

export function showLog(message?: any, ...optionalParams: any[]): void {
  console.log(message, ...optionalParams);
}

export const getStatusOptions = () => [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

/** Keeps only digits and clamps percentage input to 0..100. */
export const sanitizePercentInput = (raw: string): string => {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  const n = Number(digits);
  if (Number.isNaN(n)) return "";
  return String(Math.min(100, Math.max(0, n)));
};

/** react-hook-form validator for required/optional percentage fields. */
export const validatePercentRange = (
  value: string,
  opts?: { required?: boolean; label?: string }
): true | string => {
  const required = opts?.required ?? false;
  const label = opts?.label ?? "Value";
  const text = String(value ?? "").trim();

  if (!text) return required ? `${label} is required` : true;
  if (!/^\d+$/.test(text)) return "Enter a valid number";

  const n = Number(text);
  if (Number.isNaN(n) || n < 0 || n > 100) {
    return `${label} must be between 0 and 100`;
  }
  return true;
};

const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png"];
const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png"];
const SUPPORTED_IMAGE_MAX_SIZE_BYTES = 512 * 1024;

export const getSupportedImageExtensions = (): string[] => [
  ...SUPPORTED_IMAGE_EXTENSIONS,
];
export const getSupportedImageMaxSizeBytes = (): number =>
  SUPPORTED_IMAGE_MAX_SIZE_BYTES;

export const isSupportedImageFile = (file: File): boolean => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.includes(extension);
  const hasSupportedMimeType = SUPPORTED_IMAGE_MIME_TYPES.includes(
    (file.type || "").toLowerCase()
  );
  const isWithinSupportedSize = file.size <= SUPPORTED_IMAGE_MAX_SIZE_BYTES;
  return hasSupportedExtension && hasSupportedMimeType && isWithinSupportedSize;
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "-"; //"Invalid Date";
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

/** Localized date + time (e.g. for ledgers, activity rows). */
export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const textUnderlineCell =
  (field: string, onClick: (row: any) => void) =>
  ({ row }: { row: any }) =>
    (
      <span
        style={{
          textDecoration: "underline",
          textDecorationThickness: "1px",
          cursor: "pointer",
        }}
        onClick={() => onClick(row.original)}
      >
        {row.original[field]}
      </span>
    );

export const statusCell = (field: string) => {
  return ({ row }: { row: { original: Record<string, any> } }): JSX.Element => {
    const value = row.original?.[field];

    return (
      <span className={`custom-${value ? "active" : "inactive"}`}>
        {value ? "Active" : "Inactive"}
      </span>
    );
  };
};

export const paymentStatusCell = (field: string) => {
  return ({ row }: { row: { original: Record<string, any> } }): JSX.Element => {
    const value = row.original?.[field];

    return (
      <span className={`custom-${value ? "active" : "inactive"}`}>
        {value ? "Paid" : "Unpaid"}
      </span>
    );
  };
};

export const verificationStatusCell = (field: string | number) => {
  return ({
    row,
  }: {
    row?: { original: Record<string, any> };
  }): JSX.Element => {
    const value = row?.original?.[field] ?? field;

    const status = VerificationStatusEnum.get(value);
    const label = status ? status.label : "Unknown";

    let className = "";
    let color = "";

    if (value === 1) {
      className = "custom-active";
    } else if (value === 2) {
      className = "custom-inactive";
    } else if (value === 3) {
      className = "custom-active";
      color = "var(--btn-pending)";
    }
    return (
      <span className={className} style={{ color }}>
        {label}
      </span>
    );
  };
};

export const DetailsRow = ({ title, value }: { title: string; value: any }) => {
  const displayValue =
    value === undefined || value === "" || value === null ? "-" : value;

  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label className="col">{displayValue}</label>
    </Row>
  );
};

/** Label above value, both flush-left — avoids indented “value column” for long text. */
export function StackedLabelValueBlock({
  label,
  children,
  whiteSpace = "normal",
}: {
  label: string;
  children: ReactNode;
  whiteSpace?: "pre-line" | "normal";
}) {
  const content =
    children === null || children === undefined || children === ""
      ? "-"
      : children;
  return (
    <div className="w-100">
      <div className="custom-personal-row-title mb-1">{label}</div>
      <div
        className="text-wrap"
        style={{
          fontSize: 16,
          fontWeight: "normal",
          fontFamily: "Inter, sans-serif",
          color: "var(--txt-color)",
          whiteSpace,
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}

/** Full-width label + value without `custom-personal-row` (long schedule / address text). */
export function WideLabelValueBlock({
  label,
  children,
  whiteSpace = "normal",
  gap = "3rem",
  variant = "inline",
}: {
  label: string;
  children: ReactNode;
  whiteSpace?: "pre-line" | "normal";
  gap?: string;
  /** `stacked`: label and body flush-left (used for category/service descriptions). */
  variant?: "inline" | "stacked";
}) {
  if (variant === "stacked") {
    return (
      <StackedLabelValueBlock label={label} whiteSpace={whiteSpace}>
        {children}
      </StackedLabelValueBlock>
    );
  }

  const content =
    children === null || children === undefined || children === ""
      ? "-"
      : children;
  return (
    <div className="w-100" style={{ flex: "1 1 100%", minWidth: "100%" }}>
      <Row className="gx-0 align-items-start" style={{ gap }}>
        <Col
          xs={12}
          sm="auto"
          className="custom-personal-row-title pe-sm-3 mb-1 mb-sm-0 col-sm-auto col-12"
        >
          {label}
        </Col>
        <Col xs={12} sm className="col-12" style={{ minWidth: 0 }}>
          <div
            className="text-wrap"
            style={{
              fontSize: 16,
              fontWeight: "normal",
              fontFamily: "Inter, sans-serif",
              color: "var(--txt-color)",
              whiteSpace,
              wordBreak: "break-word",
            }}
          >
            {content}
          </div>
        </Col>
      </Row>
    </div>
  );
}

export const FullDetailsRow = ({
  title,
  value,
}: {
  title: string;
  value: any;
}) => {
  const displayValue =
    value === undefined || value === "" || value === null ? "-" : value;

  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label className="col custom-personal-row-value text-wrap">
        {displayValue}
      </label>
    </Row>
  );
};

export const DashboardCard = ({
  title,
  count,
  color,
}: {
  title: string;
  count: any;
  color: string;
}) => {
  return (
    <div className="custom-dashboard-border">
      <label className="custom-dashboard-sub-title" style={{ color }}>
        {title}
      </label>
      <label className="custom-dashboard-title-count">{count}</label>
    </div>
  );
};

export const DetailsPaymentStatusRow = ({
  title,
  value,
}: {
  title: string;
  value: any;
}) => {
  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label
        className={`col custom-${value === "Paid" ? "active" : "inactive"}`}
      >
        {value ? value : "-"}
      </label>
    </Row>
  );
};

export const DetailsOrderStatusRow = ({
  title,
  value,
}: {
  title: string;
  value: number | undefined | null;
}) => {
  const status = OrderStatusEnum.get(value ?? -1)?.label || "-";

  let color = "";

  if (value === 1) {
    color = "var(--btn-pending)";
  } else if (value === 2) {
    color = "var(--primary-color)";
  } else if (value === 3) {
    color = "var(--btn-success)";
  } else if (value === 4) {
    color = "var(--btn-danger)";
  }

  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label className={`col custom-personal-row-value`} style={{ color }}>
        {status}
      </label>
    </Row>
  );
};

export const DetailsResolveStatusRow = ({
  title,
  value,
}: {
  title: string;
  value: number | undefined | null;
}) => {
  const status = ResolveStatusEnum.get(value ?? -1)?.label || "-";

  let color = "";

  if (value === 1) {
    color = "var(--btn-pending)";
  } else if (value === 2) {
    color = "var(--btn-success)";
  } else if (value === 3) {
    color = "var(--btn-danger)";
  }

  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label className={`col custom-personal-row-value`} style={{ color }}>
        {status}
      </label>
    </Row>
  );
};

// export function convertToUTC(timeStr: string): string {
//     const today: string = new Date().toISOString().split('T')[0];
//     const localDateTime: Date = new Date(`${today} ${timeStr}`);
//     return localDateTime.toISOString();
// }

export const priceCell = (field: string) => {
  return ({ row }: { row: { original: Record<string, any> } }): JSX.Element => {
    const value = row.original?.[field];

    return (
      <span>
        {value !== undefined && value !== null
          ? `${AppConstant.currencySymbol}${value}`
          : "-"}
      </span>
    );
  };
};

export const formatUtcToLocalTime = (utcString: string): string => {
  try {
    const date = new Date(utcString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Invalid UTC date:", error);
    return "";
  }
};

export const DetailsRowLink = ({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number | null | undefined;
  onClick: () => void;
}) => {
  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <label className="col custom-personal-row-value">
        <button
          type="button"
          className="btn btn-link p-0 align-baseline text-decoration-underline"
          onClick={onClick}
        >
          {value === undefined || value === null ? "0" : value}
        </button>
      </label>
    </Row>
  );
};

export const DetailsRowStatus = ({
  title,
  isActive,
}: {
  title: string;
  isActive: boolean;
}) => {
  return (
    <Row className="row custom-personal-row">
      <label className="col custom-personal-row-title">{title}</label>
      <div className="col custom-personal-row-value custom-radio-button">
        {getStatusOptions().map(({ label, value }) => (
          <label key={value} className="custom-radio">
            <input
              type="radio"
              name={`status-${title}`}
              value={value}
              checked={isActive === (value.toString() === "true")}
              readOnly
            />
            <span className="checkmark"></span> {label}
          </label>
        ))}
      </div>
    </Row>
  );
};

export const DetailsRowLinkDocument = ({
  title,
  isEditable,
  onAddClick,
  onViewClick,
  onDeleteClick,
  hideAdd,
}: {
  title: string;
  isEditable: boolean;
  onAddClick: () => void;
  onViewClick: () => void;
  onDeleteClick: () => void;
  /** When false and not editable, hide the Add action (e.g. static verification preview rows). */
  hideAdd?: boolean;
}) => {
  return (
    <Row className="row custom-personal-row">
      <Col className="custom-document-title">{title}</Col>
      <Col xs={6}>
        {isEditable ? (
          <>
            <label
              onClick={(e) => {
                e.preventDefault();
                onViewClick();
              }}
              className="custom-document-view"
            >
              View
            </label>

            <label
              onClick={(e) => {
                e.preventDefault();
                onDeleteClick();
              }}
              className="custom-document-delete"
            >
              Delete
            </label>
          </>
        ) : hideAdd ? (
          <span className="text-muted small">—</span>
        ) : (
          <label
            onClick={(e) => {
              e.preventDefault();
              onAddClick();
            }}
            className="custom-document-add"
          >
            Add
          </label>
        )}
      </Col>
    </Row>
  );
};

export const getRoleLabel = (roleId: number): string => {
  return RoleEnum.get(roleId)?.label ?? "Unknown Role";
};

export const ShowDetailsRow = ({
  title,
  value,
}: {
  title: string;
  value: any;
}) => {
  return (
    <Col xs={4}>
      <Row>
        <Col sm={4}>
          <label className="custom-profile-lable">{title}</label>
        </Col>
        <Col>
          <label className="custom-personal-row-value">
            {value === undefined || value === "" || value === null
              ? "-"
              : value}
          </label>
        </Col>
      </Row>
    </Col>
  );
};
