import React from "react";
import { Row, Col } from "react-bootstrap";
import { UseFormSetValue } from "react-hook-form";
import CustomTimePicker from "./CustomTimePicker";

interface CustomTextFieldTimePicketProps {
    labelSize?: number;
    label: string;
    controlId: string;
    selectedTime: string | null;
    onChange: (date: Date | null) => void;
    placeholderText?: string;
    filterTime?: (date: Date) => boolean;
    register: any;
    validation?: any;
    error?: any;
    asCol?: boolean;
    setValue: UseFormSetValue<any>;
}

const CustomTextFieldTimePicket: React.FC<CustomTextFieldTimePicketProps> = ({
    labelSize = 4,
    label,
    controlId,
    selectedTime,
    onChange,
    placeholderText = "Select a time",
    filterTime,
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
                <CustomTimePicker
                    label=""
                    controlId={controlId}
                    selectedTime={selectedTime}
                    onChange={onChange}
                    placeholderText={placeholderText}
                    error={error}
                    register={register}
                    validation={validation}
                    setValue={setValue}
                    asCol={asCol}
                    filterTime={filterTime}
                />
            </Col>
        </Row>
    );
};

export default CustomTextFieldTimePicket;
