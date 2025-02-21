import React from "react";

let navigate: (path: string) => void;

export const setNavigate = (nav: (path: string) => void) => {
    navigate = nav;
};

export const getNavigate = () => navigate;

export const capitalizeString = (str: string) =>
    str.replace(/\b\w/g, char => char.toUpperCase());

export const getStatusOptions = () => [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" }
];

export const textUnderlineCell = (field: string, onClick: () => void) => ({ row, }: { row: any; }) => (
    <span
        style={{
            textDecoration: "underline",
            textDecorationThickness: "1px",
            cursor: "pointer",
        }}
        onClick={onClick}
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