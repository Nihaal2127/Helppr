import React from "react";
import { Row, Col } from "react-bootstrap";
import CustomDatePicker from "./CustomDatePicker";
import { UseFormSetValue } from "react-hook-form";

interface CustomTextFieldDatePicketProps {
    labelSize?: number;
    label: string;
    controlId: string;
    selectedDate: string | null;
    onChange: (date: Date | null) => void;
    placeholderText?: string;
    filterDate?: (date: Date) => boolean;
    register: any;
    validation?: any;
    error?: any;
    asCol?: boolean;
    setValue: UseFormSetValue<any>;
}

const CustomTextFieldDatePicket: React.FC<CustomTextFieldDatePicketProps> = ({
    labelSize = 4,
    label,
    controlId,
    selectedDate,
    onChange,
    placeholderText = "Select a date",
    filterDate,
    error,
    asCol = false,
    setValue,
    register,
    validation,
}) => {
    return (
        <Row className={`align-items-${error ? "start" : "center"} ${labelSize !== 4 ? "mb-4" : ""}`}>
            <Col sm={labelSize} className={`d-flex ${error ? "align-items-start" : "align-items-center"}`}>
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
                <CustomDatePicker
                    label=""
                    controlId={controlId}
                    selectedDate={selectedDate}
                    onChange={onChange}
                    placeholderText={placeholderText}
                    error={error}
                    register={register}
                    validation={validation}
                    setValue={setValue}
                    asCol={asCol}
                    filterDate={filterDate}
                />
            </Col>
        </Row>
    );
};

export default CustomTextFieldDatePicket;
