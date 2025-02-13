import React from "react";
import addIcon from "../assets/icons/add.svg";
import searchIcon from "../assets/icons/search.svg";
import downloadIcon from "../assets/icons/download.svg";
import sortIcon from "../assets/icons/sort.svg";
import actionIcon from "../assets/icons/3_dots.svg";

type CustomUtilityBoxProps = {
    onAddClick: () => void;
    onDownloadClick: () => void;
    onSortClick: () => void;
    onMoreClick: () => void;
    onSearch: (value: string) => void;
};

const CustomUtilityBox: React.FC<CustomUtilityBoxProps> = ({ onAddClick, onDownloadClick, onSortClick, onMoreClick, onSearch }) => {
    return (
        <div className="custom-utilty-box">
            <button type="button" className="custom-add-button" onClick={onAddClick}>
                <img src={addIcon} />
                <span>Add Category</span>
            </button>
            <div>
                <div className="custom-search-container">
                    <input
                        type="text"
                        className="custom-search-field"
                        placeholder="Search Category Name, Id, Description etc."
                        onChange={(e) => onSearch(e.target.value)}
                    />
                    <img src={searchIcon} alt="search" className="custom-search-icon" />
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
