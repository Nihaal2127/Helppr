import React, { useState } from "react";
import classNames from "classnames";
import { Form } from "react-bootstrap";
import searchIcon from "../assets/icons/search.svg";

type CustomUtilityBoxProps = {
    /** Shown when `titleSlot` is not provided. */
    title?: string;
    /** When set, replaces the title text (e.g. primary action button). */
    titleSlot?: React.ReactNode;
    searchHint?: string;
    onDownloadClick?: () => void;
    onSortClick?: (sortValue: "-1" | "1") => void;
    onMoreClick?: () => void;
    onSearch?: (value: string) => void;
    hideMoreIcon?: boolean;
    controlSlot?: React.ReactNode;
    /** Rendered after search box (same row when toolsInlineRow is true). */
    afterSearchSlot?: React.ReactNode;
    /** When true, category/subcategory (controlSlot), search, download, and sort sit on one row (wraps on small screens). */
    toolsInlineRow?: boolean;
    /** Title row only — no search, download, sort, or more. */
    hideToolbar?: boolean;
    /** Title + search only (same layout as full toolbar, no download / sort / more). */
    searchOnlyToolbar?: boolean;
};

const CustomUtilityBox: React.FC<CustomUtilityBoxProps> = ({
    title,
    titleSlot,
    searchHint = "",
    onSearch = () => {},
    controlSlot,
    afterSearchSlot,
    toolsInlineRow = false,
    hideToolbar = false,
}) => {
    const [searchValue, setSearchValue] = useState("");

    const handleEnterKey = (e: any) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSearch(searchValue);
        }
    }

    if (hideToolbar) {
        return (
            <div className={classNames("custom-utilty-box", "custom-utilty-box--title-only")}>
                {titleSlot != null ? (
                    <div className="custom-utilty-box-title d-flex align-items-center flex-wrap">{titleSlot}</div>
                ) : (
                    <span className="custom-utilty-box-title">{title}</span>
                )}
            </div>
        );
    }

    return (
        <div className="custom-utilty-box">
            {titleSlot != null ? (
                <div className="custom-utilty-box-title d-flex align-items-center flex-wrap">{titleSlot}</div>
            ) : (
                <span className="custom-utilty-box-title">{title}</span>
            )}
            <div className={toolsInlineRow ? "custom-utilty-tools-inline" : undefined}>
                {controlSlot != null && (
                    <div className="custom-utility-control-slot">
                        {controlSlot}
                    </div>
                )}
                <div className="d-flex flex-column">
                <label className="fw-medium">Search</label>
                <div className="custom-search-container">
                    <Form.Control
                        className="custom-form-input"
                        type="text"
                        placeholder={searchHint}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        style={{
                            width: toolsInlineRow ? "100%" : "24.25rem",
                            maxWidth: toolsInlineRow ? "100%" : undefined,
                            fontSize: "14px",
                            fontWeight: "normal",
                            fontFamily: "Inter",
                        }}
                        onKeyDown={(e) => { handleEnterKey(e) }}
                    />
                    <img src={searchIcon} alt="search" className="custom-search-icon"
                        onClick={() => {
                            onSearch(searchValue);
                            setSearchValue("");
                        }} />
                </div>
                </div>
                {afterSearchSlot != null && (
                    <div className="d-flex align-items-end">
                        {afterSearchSlot}
                    </div>
                )}

                {/* {!searchOnlyToolbar && (
                    <div className="custom-icon-container">
                        <img src={downloadIcon} alt="download" onClick={onDownloadClick} />
                        <img src={sortIcon} alt="sort" onClick={handleSortClick} />
                        {!hideMoreIcon && (
                            <img src={actionIcon} alt="more options" onClick={onMoreClick} />
                        )}
                    </div>
                )} */}
            </div>
        </div>
    );
};

export default CustomUtilityBox;
