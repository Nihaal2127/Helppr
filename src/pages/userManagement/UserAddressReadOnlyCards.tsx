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
    onEdit: () => void;
};

/**
 * Profile address (read-only, edit) plus an empty placeholder card — aligned with create-order service address cards.
 */
const UserAddressReadOnlyCards: React.FC<UserAddressReadOnlyCardsProps> = ({ user, onEdit }) => {
    const stateLabel = (user.state_name ?? "").trim() || "—";
    const cityLabel = (user.city_name ?? "").trim() || "—";
    const postal = (user.pincode ?? "").trim() || "—";
    const line = (user.address ?? "").trim() || "—";

    return (
        <Row className="g-3">
            <Col xs={12} md={6} lg={4}>
                <div style={savedCardShell}>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="fw-semibold" style={{ color: "var(--primary-color)" }}>
                                Address 1
                            </span>
                            <span
                                className="small fw-semibold"
                                style={{ color: "var(--bs-success, #198754)", letterSpacing: "0.02em" }}>
                                (Active)
                            </span>
                        </div>
                        <span
                            className="p-0 border-0 bg-transparent"
                            style={{ cursor: "pointer" }}
                            onClick={onEdit}
                            title="Edit address"
                            aria-label="Edit address">
                            <img src={editIcon} alt="" width={20} height={20} />
                        </span>
                    </div>
                    <DetailStack label="State" value={stateLabel} />
                    <DetailStack label="City" value={cityLabel} />
                    <DetailStack label="Postal Code" value={postal} />
                    <DetailStack label="Address" value={line} />
                </div>
            </Col>
            <Col xs={12} md={6} lg={4}>
                <div style={emptyCardShell}>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="fw-semibold" style={{ color: "var(--content-txt-color, #6c757d)" }}>
                            Address 2
                        </span>
                    </div>
                    <DetailStack label="State" value="—" muted />
                    <DetailStack label="City" value="—" muted />
                    <DetailStack label="Postal Code" value="—" muted />
                    <DetailStack label="Address" value="Empty slot — use + Add address to save another." muted />
                </div>
            </Col>
        </Row>
    );
};

export default UserAddressReadOnlyCards;
