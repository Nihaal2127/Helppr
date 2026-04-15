import React, { useState } from "react";
import { Form } from "react-bootstrap";
import searchIcon from "../assets/icons/search.svg";
import downloadIcon from "../assets/icons/download.svg";
import sortIcon from "../assets/icons/sort.svg";
import actionIcon from "../assets/icons/3_dots.svg";

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
    onDownloadClick,
    onSortClick,
    onMoreClick,
    onSearch,
    showExtraActions = true,
}) => {
    const [searchValue, setSearchValue] = useState("");
    const [sortDirection, setSortDirection] = useState<"-1" | "1">("-1");

    const handleEnterKey = (e: any) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSearch(searchValue);
        }
    }

    const handleSortClick = () => {
        if (!onSortClick) return;
        const newDirection = sortDirection === "-1" ? "1" : "-1";
        setSortDirection(newDirection);
        onSortClick(newDirection);
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
                        style={{ width: "24.25rem", fontSize: "14px", fontWeight: "normal", fontFamily: "Inter" }}
                        onKeyDown={(e) => { handleEnterKey(e) }}
                    />
                    <img src={searchIcon} alt="search" className="custom-search-icon"
                        onClick={() => {
                            onSearch(searchValue);
                            setSearchValue("");
                        }} />
                </div>
            </div>
            {showExtraActions ? (
                <div className="custom-icon-container">
                    <img src={downloadIcon} alt="download" onClick={() => onDownloadClick?.()} />
                    <img src={sortIcon} alt="sort" onClick={handleSortClick} />
                    <img src={actionIcon} alt="more options" onClick={() => onMoreClick?.()} />
                </div>
            ) : null}
        </div>
    );
};

export default CustomServiceUtilityBox;
