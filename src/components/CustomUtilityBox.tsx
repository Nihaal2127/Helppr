import React, { useState } from "react";
import { Form } from "react-bootstrap";
import addIcon from "../assets/icons/add.svg";
import searchIcon from "../assets/icons/search.svg";
import downloadIcon from "../assets/icons/download.svg";
import sortIcon from "../assets/icons/sort.svg";
import actionIcon from "../assets/icons/3_dots.svg";


type CustomUtilityBoxProps = {
    title: string;
    searchHint: string;
    onDownloadClick: () => void;
    onSortClick: () => void;
    onMoreClick: () => void;
    onSearch: (value: string) => void;
};

const CustomUtilityBox: React.FC<CustomUtilityBoxProps> = ({
    title,
    searchHint,
    onDownloadClick,
    onSortClick,
    onMoreClick,
    onSearch,
}) => {
    const [searchValue, setSearchValue] = useState("");

    const handleEnterKey = (e: any) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSearch(searchValue);
        }
    }
    return (
        <div className="custom-utilty-box">
            <span className="custom-utilty-box-title">{title}</span>
            {/* <Button className="custom-add-button" onClick={onAddClick}>
                <img src={addIcon} />
                {addButtonLable}
            </Button> */}
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

                <div className="custom-icon-container">
                    <img src={downloadIcon} alt="download" onClick={onDownloadClick} />
                    <img src={sortIcon} alt="sort" onClick={onSortClick} />
                    <img src={actionIcon} alt="more options" onClick={onMoreClick} />
                </div>
            </div>
        </div>
    );
};

export default CustomUtilityBox;
