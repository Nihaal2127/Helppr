import React, { useState } from "react";
import addIcon from "../assets/icons/add.svg";

type CustomSummaryBoxProps = {
  divId: string;
  title: string;
  data: Record<string, number>;
  onSelect: (divId: string) => void;
  isSelected: boolean;
  onFilterChange: (filters: {
    status?: string
  }) => void;
  isAddShow?: boolean;
  addButtonLable?: string;
  onAddClick?: () => void;
};

const CustomSummaryBox: React.FC<CustomSummaryBoxProps> =
  ({
    divId,
    title,
    data,
    onSelect,
    isSelected,
    onFilterChange,
    isAddShow = false,
    addButtonLable = "Add",
    onAddClick
  }) => {
    return (
      <div
        className={`box ${isSelected ? "selected-box" : ""}`}
        id={divId}
        onClick={() => onSelect(divId)}
      >
        <div className="box-row">
          <h6>{title}</h6>
          {isAddShow && (
            <div
              className="box-column box-right-column"
              style={{ cursor: "pointer" }}
              onClick={onAddClick}
            >
              <img src={addIcon} width="15px" />
              <span style={{ textDecoration: "underline", color: "var(--primary-txt-color)" }}>
                {addButtonLable}
              </span>
            </div>
          )}
        </div>
        {Object.entries(data).map(([key, value], index) => (
          <div className="box-row" key={key}
            onClick={(e) => {
              // e.stopPropagation();
              let status;
              if (key === "Total") {
                status = undefined;
              } else if (key === "Active") {
                status = "true";
              } else if (key === "Inactive") {
                status = "false";
              }
              onFilterChange({ status });
            }}
          >
            <div className={`box-column box-left-column box-rw-clr${index + 1}`}>{key}</div>
            <div className="box-column box-right-column">{value}</div>
          </div>
        ))}
      </div>
    );
  };

export default React.memo(CustomSummaryBox);
