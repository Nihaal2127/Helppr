import React from "react";
import { Row, Col } from "react-bootstrap";
import CustomDatePicker from "./CustomDatePicker";
import { UseFormSetValue } from "react-hook-form";

interface CustomTextFieldDatePicketProps {
    labelSize?: number;
    label: string;
    controlId: string;
    groupControlId?: string;
    selectedDate: string | null;
    onChange: (date: Date | null) => void;
    placeholderText?: string;
    filterDate?: (date: Date) => boolean;
    register: any;
    validation?: any;
    error?: any;
    asCol?: boolean;
    setValue: UseFormSetValue<any>;
    suppressHiddenRegister?: boolean;
}

const CustomTextFieldDatePicket: React.FC<CustomTextFieldDatePicketProps> = ({
    labelSize = 4,
    label,
    controlId,
    groupControlId,
    selectedDate,
    onChange,
    placeholderText = "Select a date",
    filterDate,
    error,
    asCol = false,
    setValue,
    register,
    validation,
    suppressHiddenRegister,
}) => {
    return (
        <Row className={`align-items-start ${labelSize !== 4 ? "mb-4" : ""}`}>
            <Col sm={labelSize} className="d-flex align-items-start">
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
                <CustomDatePicker
                    label=""
                    controlId={controlId}
                    groupControlId={groupControlId}
                    selectedDate={selectedDate}
                    onChange={onChange}
                    placeholderText={placeholderText}
                    error={error}
                    register={register}
                    validation={validation}
                    setValue={setValue}
                    asCol={asCol}
                    filterDate={filterDate}
                    suppressHiddenRegister={suppressHiddenRegister}
                />
            </Col>
        </Row>
    );
};

export default CustomTextFieldDatePicket;
