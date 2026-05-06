import React, { useState } from "react";
import { Form } from "react-bootstrap";
import searchIcon from "../assets/icons/search.svg";

type CustomServiceUtilityBoxProps = {
  searchHint: string;
  onDownloadClick?: () => void;
  onSortClick?: (sortValue: "-1" | "1") => void;
  onMoreClick?: () => void;
  onSearch: (value: string) => void;
  /** When false, download / sort / more icons are not shown. Default true. */
  showExtraActions?: boolean;
};

const CustomServiceUtilityBox: React.FC<CustomServiceUtilityBoxProps> = ({
  searchHint,
  onDownloadClick: _onDownloadClick,
  onSortClick: _onSortClick,
  onMoreClick: _onMoreClick,
  onSearch,
  showExtraActions: _showExtraActions = true,
}) => {
  const [searchValue, setSearchValue] = useState("");

  const handleEnterKey = (e: any) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(searchValue);
    }
  };

  return (
    <div className="custom-utilty-box">
      <div>
        <div className="custom-search-container">
          <Form.Control
            className="custom-form-input"
            type="text"
            placeholder={searchHint}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              width: "24.25rem",
              fontSize: "14px",
              fontWeight: "normal",
              fontFamily: "Inter",
            }}
            onKeyDown={(e) => {
              handleEnterKey(e);
            }}
          />
          <img
            src={searchIcon}
            alt="search"
            className="custom-search-icon"
            onClick={() => {
              onSearch(searchValue);
              setSearchValue("");
            }}
          />
        </div>
      </div>
      {/* {showExtraActions ? (
                <div className="custom-icon-container">
                    <img src={downloadIcon} alt="download" onClick={() => onDownloadClick?.()} />
                    <img src={sortIcon} alt="sort" onClick={handleSortClick} />
                    <img src={actionIcon} alt="more options" onClick={() => onMoreClick?.()} />
                </div>
            ) : null} */}
    </div>
  );
};

export default CustomServiceUtilityBox;
