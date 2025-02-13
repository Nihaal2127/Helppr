import React from "react";
import customCloseIcon from "../assets/icons/close_button_red.svg"
interface CustomCloseButtonProps {
    onClose: () => void;
    size?: number;
}

const CustomCloseButton: React.FC<CustomCloseButtonProps> = ({ onClose, size = 24 }) => {
    return (
        <img
            src={customCloseIcon}
            alt="Close"
            width={size}
            height={size}
            onClick={onClose}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "absolute",
                top: "15px",
                right: "15px"
            }}
        />
    );
};

export default CustomCloseButton;
