import React from "react";
import { Row, Col } from "react-bootstrap";
import { VerificationStatusEnum } from "../constant/VerificationStatusEnum";
import { RoleEnum } from "../constant/RoleEnum";
import { OrderStatusEnum } from "../constant/OrderStatusEnum";

let navigate: (path: string) => void;

export const setNavigate = (nav: (path: string) => void) => {
    navigate = nav;
};

export const getNavigate = () => navigate;

export const capitalizeString = (str: string) =>
    str.replace(/\b\w/g, char => char.toUpperCase());


export function showLog(message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
}

export const getStatusOptions = () => [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
];

export const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return "-";//"Invalid Date";
    }

    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "short" });
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};


export const textUnderlineCell = (field: string, onClick: (row: any) => void) =>
    ({ row }: { row: any }) => (
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

export const verificationStatusCell = (field: string | number) => {
    return ({ row }: { row?: { original: Record<string, any> } }): JSX.Element => {
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
    return (
        <Row className="row custom-personal-row">
            <label className="col custom-personal-row-title">{title}</label>
            <label className="col custom-personal-row-value">{(value === undefined || value === "" || value === null) ? "-" : value}</label>
        </Row>
    );
};

// export function convertToUTC(timeStr: string): string {
//     const today: string = new Date().toISOString().split('T')[0];
//     const localDateTime: Date = new Date(`${today} ${timeStr}`);
//     return localDateTime.toISOString();
// }

export const formatUtcToLocalTime = (
    utcString: string
): string => {
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

export const DetailsRowLink = ({ title, value, onClick }: { title: string; value: number | null | undefined; onClick: () => void }) => {
    return (
        <Row className="row custom-personal-row">
            <label className="col custom-personal-row-title">{title}</label>
            <label className="col custom-personal-row-value">
                <a href="#" onClick={(e) => {
                    e.preventDefault();
                    onClick();
                }}>{(value === undefined || value === null) ? "0" : value}</a>
            </label>
        </Row>
    );
};

export const DetailsRowStatus = ({ title, isActive }: { title: string; isActive: boolean }) => {
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
    onDeleteClick
}: {
    title: string;
    isEditable: boolean;
    onAddClick: () => void;
    onViewClick: () => void;
    onDeleteClick: () => void;
}) => {
    return (
        <Row className="row custom-personal-row">
            <Col className="custom-document-title">{title}</Col>
            <Col xs={5} >
                {isEditable ? (
                    <>
                        <label onClick={(e) => {
                            e.preventDefault();
                            onViewClick();
                        }} className="custom-document-view">View</label>

                        <label onClick={(e) => {
                            e.preventDefault();
                            onDeleteClick();
                        }} className="custom-document-delete">Delete</label>
                    </>
                ) : (
                    <label onClick={(e) => {
                        e.preventDefault();
                        onAddClick();
                    }} className="custom-document-add">Add</label>
                )}
            </Col>
        </Row>
    );
};

export const getRoleLabel = (roleId: number): string => {
    return RoleEnum.get(roleId)?.label ?? "Unknown Role";
};

export const ShowDetailsRow = ({ title, value }: { title: string; value: any }) => {
    return (
        <Col xs={4}>
            <Row>
                <Col sm={4}>
                    <label className="custom-profile-lable">{title}</label>
                </Col>
                <Col>
                    <label className="custom-personal-row-value">{(value === undefined || value === "" || value === null) ? "-" : value}</label>
                </Col>
            </Row>
        </Col>
    );
};