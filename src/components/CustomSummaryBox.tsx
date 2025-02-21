import React, { useState } from "react";

type CustomSummaryBoxProps = {
  divId: string;
  title: string;
  data: Record<string, number>;
  onSelect: (divId: string) => void;
  isSelected: boolean;
  onFilterChange: (filters: {
    status?: string
  }) => void;
};

const CustomSummaryBox: React.FC<CustomSummaryBoxProps> = ({ divId, title, data, onSelect, isSelected, onFilterChange }) => {
  return (
    <div
      className={`box ${isSelected ? "selected-box" : ""}`}
      id={divId}
      onClick={() => onSelect(divId)}
    >
      <h6>{title}</h6>
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
