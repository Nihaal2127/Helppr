import type { ReactNode } from "react";
import { Row, Col } from "react-bootstrap";
import { VerificationStatusEnum } from "../lib/global/VerificationStatusEnum";
import { RoleEnum } from "../lib/global/RoleEnum";
import { ResolveStatusEnum } from "../lib/global/ResolveStatusEnum";
import { AppConstant } from "../lib/global/AppConstant";

export { getNavigate, setNavigate } from "./navigation";

/** Order status labels for `DetailsOrderStatusRow` (kept here to avoid utility ↔ orderTypes cycle). */
const ORDER_STATUS_LABELS = new Map<number, { label: string }>([
  [1, { label: "Pending" }],
  [2, { label: "In Progress" }],
  [3, { label: "Completed" }],
  [4, { label: "Cancelled" }],
  [5, { label: "Refunded" }],
]);

export const capitalizeString = (str: string) =>
  str.replace(/\b\w/g, (char) => char.toUpperCase());

export function showLog(message?: any, ...optionalParams: any[]): void {
  console.log(message, ...optionalParams);
}

/** API fields that are either an id string or a populated `{ _id, … }` document. */
export function apiDocumentId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    const s = String(value).trim();
    return s && s !== "[object Object]" ? s : "";
  }
  if (typeof value === "object") {
    const o = value as { _id?: unknown; id?: unknown };
    const id = String(o._id ?? o.id ?? "").trim();
    if (id) return id;
  }
  return "";
}

export const getStatusOptions = () => [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];

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

/** Two-column personal block: name/DOB, gender/email, phone/registered, optional last service. */
export function PersonalAccountDetailsGrid({
  nameLabel,
  name,
  dateOfBirth,
  genderLabel,
  email,
  phone,
  registeredDate,
  lastServiceDate,
}: {
  nameLabel: string;
  name?: string | null;
  dateOfBirth?: string | null;
  genderLabel?: string;
  email?: string | null;
  phone?: string | null;
  registeredDate?: string | null;
  lastServiceDate?: string | null;
}) {
  const dobRaw = String(dateOfBirth ?? "").trim();
  const dobDisplay = dobRaw ? formatDate(dobRaw) : "—";
  const regRaw = String(registeredDate ?? "").trim();
  const regDisplay = regRaw ? formatDate(regRaw) : "—";
  const lastRaw = String(lastServiceDate ?? "").trim();
  const showLastService =
    Boolean(lastRaw) && !Number.isNaN(new Date(lastRaw).getTime());

  return (
    <div className="w-100">
      <Row className="g-0">
        <Col xs={12} md={6}>
          <DetailsRow title={nameLabel} value={name ?? "—"} />
        </Col>
        <Col xs={12} md={6}>
          <DetailsRow title="Date of Birth" value={dobDisplay} />
        </Col>
      </Row>
      <Row className="g-0">
        <Col xs={12} md={6}>
          <DetailsRow title="Gender" value={genderLabel ?? "—"} />
        </Col>
        <Col xs={12} md={6}>
          <DetailsRow title="Email" value={email ?? "—"} />
        </Col>
      </Row>
      <Row className="g-0">
        <Col xs={12} md={6}>
          <DetailsRow title="Phone Number" value={phone ?? "—"} />
        </Col>
        <Col xs={12} md={6}>
          <DetailsRow title="Registered Date" value={regDisplay} />
        </Col>
      </Row>
      {showLastService ? (
        <Row className="g-0">
          <Col xs={12} md={6}>
            <DetailsRow
              title="Last Service Date"
              value={formatDate(lastRaw)}
            />
          </Col>
        </Row>
      ) : null}
    </div>
  );
}

/** Full-width label + value without `custom-personal-row` (long schedule / address text). */
export function WideLabelValueBlock({
  label,
  children,
  whiteSpace = "normal",
  gap = "3rem",
}: {
  label: string;
  children: ReactNode;
  whiteSpace?: "pre-line" | "normal";
  gap?: string;
}) {
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
  const status = ORDER_STATUS_LABELS.get(value ?? -1)?.label || "-";

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
  uploadedFileName,
}: {
  title: string;
  isEditable: boolean;
  onAddClick: () => void;
  onViewClick: () => void;
  onDeleteClick: () => void;
  /** When false and not editable, hide the Add action (e.g. static verification preview rows). */
  hideAdd?: boolean;
  /** When set (e.g. add-partner flow), show image uploaded plus filename instead of Add; click opens replace upload. */
  uploadedFileName?: string | null;
}) => {
  const trimmedUploaded = String(uploadedFileName ?? "").trim();

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
              className="custom-document-view mb-0"
            >
              View
            </label>
            <span className="text-muted mx-1">|</span>
            <label
              onClick={(e) => {
                e.preventDefault();
                onAddClick();
              }}
              className="custom-document-delete mb-0"
              title="Replace document"
            >
              Update
            </label>
          </>
        ) : hideAdd ? (
          <span className="text-muted small">—</span>
        ) : trimmedUploaded ? (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <label
              onClick={(e) => {
                e.preventDefault();
                onViewClick();
              }}
              className="custom-document-view mb-0 d-inline-flex align-items-center gap-1"
              title="View document"
            >
              <i className="bi bi-eye" aria-hidden />
            </label>
            <span className="text-muted">|</span>
            <label
              onClick={(e) => {
                e.preventDefault();
                onAddClick();
              }}
              className="custom-document-delete mb-0"
              title="Replace document"
            >
              ReUpload
            </label>
          </div>
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
