import React, { useState } from "react";
import { Form } from "react-bootstrap";
import searchIcon from "../assets/icons/search.svg";
import downloadIcon from "../assets/icons/download.svg";
import sortIcon from "../assets/icons/sort.svg";
import actionIcon from "../assets/icons/3_dots.svg";

type CustomServiceUtilityBoxProps = {
    searchHint: string;
    onDownloadClick: () => void;
    onSortClick: () => void;
    onMoreClick: () => void;
    onSearch: (value: string) => void;
    register: any;
};

const CustomServiceUtilityBox: React.FC<CustomServiceUtilityBoxProps> = ({
    searchHint,
    onDownloadClick,
    onSortClick,
    onMoreClick,
    onSearch,
    register,
}) => {
    const [searchValue, setSearchValue] = useState("");

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
                    />
                    <img src={searchIcon} alt="search" className="custom-search-icon"
                        onClick={() => {
                            onSearch(searchValue);
                            setSearchValue("");
                        }} />
                </div>
            </div>
                

                <div className="custom-icon-container">
                    <img src={downloadIcon} alt="download" onClick={onDownloadClick} />
                    <img src={sortIcon} alt="sort" onClick={onSortClick} />
                    <img src={actionIcon} alt="more options" onClick={onMoreClick} />
                </div>
            </div>
    );
};

export default CustomServiceUtilityBox;
