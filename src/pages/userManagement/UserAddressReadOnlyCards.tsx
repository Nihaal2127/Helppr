import React from "react";
import { Row, Col } from "react-bootstrap";
import type { UserModel } from "../../models/UserModel";
import editIcon from "../../assets/icons/edit_red.svg";

/** Matches dashed “saved” card in `ServiceAddressCardsPanel` (customer on file). */
const savedCardShell: React.CSSProperties = {
  borderRadius: "10px",
  padding: "12px 14px",
  backgroundColor: "var(--bg-color)",
  height: "100%",
  border: "1px dashed var(--primary-color)",
  boxShadow: "none",
};

const emptyCardShell: React.CSSProperties = {
  borderRadius: "10px",
  padding: "12px 14px",
  backgroundColor: "var(--bg-color)",
  height: "100%",
  border: "1px dashed var(--txtfld-border, rgba(0, 0, 0, 0.2))",
  boxShadow: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--content-txt-color, #6c757d)",
  marginBottom: "4px",
  letterSpacing: "0.02em",
};

const valueStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 500,
  fontFamily: "Inter, sans-serif",
  color: "var(--txt-color)",
  wordBreak: "break-word",
};

const mutedValueStyle: React.CSSProperties = {
  ...valueStyle,
  color: "var(--content-txt-color, #6c757d)",
  fontStyle: "italic",
};

type RowProps = { label: string; value: string; muted?: boolean };
const DetailStack: React.FC<RowProps> = ({ label, value, muted }) => (
  <div className="mb-2">
    <div style={labelStyle}>{label}</div>
    <div style={muted ? mutedValueStyle : valueStyle}>{value}</div>
  </div>
);

export type UserAddressReadOnlyCardsProps = {
  user: UserModel;
  stateOptions?: { value: string; label: string }[];
  cityOptions?: { value: string; label: string }[];
  areaOptions?: { value: string; label: string }[];
  onEdit: (index: number) => void;
};

/**
 * Profile address (read-only, edit) plus an empty placeholder card — aligned with create-order service address cards.
 */
const UserAddressReadOnlyCards: React.FC<UserAddressReadOnlyCardsProps> = ({
  user,
  stateOptions = [],
  cityOptions = [],
  areaOptions = [],
  onEdit,
}) => {
  const toText = (value: unknown) => String(value ?? "").trim();
  const normalizeAddressStatus = (value: unknown): "true" | "false" =>
    value === true || String(value ?? "").toLowerCase() === "true"
      ? "true"
      : "false";

  const findLabel = (
    options: { value: string; label: string }[],
    idLike: unknown,
    nameLike?: unknown
  ) => {
    const nameText = toText(nameLike);
    if (nameText) return nameText;
    const idText = toText(idLike);
    if (!idText) return "—";
    return options.find((x) => x.value === idText)?.label ?? idText;
  };

  const rawAddress = (user as unknown as { address?: unknown }).address;
  const addressArray = Array.isArray(rawAddress) ? rawAddress : [];
  const baseRows = addressArray.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      state: findLabel(stateOptions, row?.state_id, row?.state_name),
      city: findLabel(cityOptions, row?.city_id, row?.city_name),
      area: findLabel(areaOptions, row?.area_id, row?.area_name),
      postal: toText(row?.pincode) || "—",
      line: toText(row?.address) || "—",
      status: normalizeAddressStatus(row?.address_status),
    };
  }) as {
    state: string;
    city: string;
    area: string;
    postal: string;
    line: string;
    status: "true" | "false";
  }[];

  const fallbackRows =
    baseRows.length > 0
      ? baseRows
      : [
          {
            state: findLabel(stateOptions, user.state_id, user.state_name),
            city: findLabel(cityOptions, user.city_id, user.city_name),
            area: findLabel(
              areaOptions,
              (user as { area_id?: unknown }).area_id,
              (user as { area_name?: unknown }).area_name
            ),
            postal: toText(user.pincode) || "—",
            line: toText(user.address) || "—",
            status: "true" as const,
          },
          ...((user.extra_addresses ?? []).map((row) => ({
            state: findLabel(stateOptions, row?.state_id, row?.state_name),
            city: findLabel(cityOptions, row?.city_id, row?.city_name),
            area: findLabel(
              areaOptions,
              (row as { area_id?: unknown })?.area_id,
              row?.area_name
            ),
            postal: toText(row?.pincode) || "—",
            line: toText(row?.address) || "—",
            status: normalizeAddressStatus(
              (row as { address_status?: unknown })?.address_status
            ),
          })) as {
            state: string;
            city: string;
            area: string;
            postal: string;
            line: string;
            status: "true" | "false";
          }[]),
        ].filter(
          (row) =>
            row.state !== "—" ||
            row.city !== "—" ||
            row.area !== "—" ||
            row.postal !== "—" ||
            row.line !== "—"
        );

  const hasActive = fallbackRows.some((row) => row.status === "true");
  const rows = fallbackRows.map((row, index) => ({
    ...row,
    status: hasActive ? row.status : index === 0 ? "true" : "false",
  }));

  return (
    <Row className="g-3">
      {rows.map((row, index) => (
        <Col key={`addr-${index}`} xs={12} md={6} lg={4}>
          <div style={savedCardShell}>
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span
                  className="fw-semibold"
                  style={{ color: "var(--primary-color)" }}
                >
                  {`Address ${index + 1}`}
                </span>
                <span
                  className="small fw-semibold"
                  style={{
                    color:
                      row.status === "true"
                        ? "var(--bs-success, #198754)"
                        : "var(--content-txt-color, #6c757d)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {row.status === "true" ? "(Active)" : "(Inactive)"}
                </span>
              </div>
              <span
                className="p-0 border-0 bg-transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onEdit(index)}
                title="Edit address"
                aria-label="Edit address"
              >
                <img src={editIcon} alt="" width={20} height={20} />
              </span>
            </div>
            <DetailStack label="State" value={row.state} />
            <DetailStack label="City" value={row.city} />
            <DetailStack label="Area" value={row.area} />
            <DetailStack label="Postal Code" value={row.postal} />
            <DetailStack label="Address" value={row.line} />
          </div>
        </Col>
      ))}
      <Col xs={12} md={6} lg={4}>
        <div style={emptyCardShell}>
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span
              className="fw-semibold"
              style={{ color: "var(--content-txt-color, #6c757d)" }}
            >
              {`Address ${rows.length + 1}`}
            </span>
          </div>
          <DetailStack label="State" value="—" muted />
          <DetailStack label="City" value="—" muted />
          <DetailStack label="Area" value="—" muted />
          <DetailStack label="Postal Code" value="—" muted />
          <DetailStack
            label="Address"
            value="Empty slot — use + Add address to save another."
            muted
          />
        </div>
      </Col>
    </Row>
  );
};

export default UserAddressReadOnlyCards;
