import React from "react";
import { Row, Col } from "react-bootstrap";

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

export const DetailsRow = ({ title, value }: { title: string; value: any }) => {
    return (
        <Row className="row custom-personal-row">
            <label className="col custom-personal-row-title">{title}</label>
            <label className="col custom-personal-row-value">{(value === undefined || value === "" || value === null) ? "-" : value}</label>
        </Row>
    );
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
