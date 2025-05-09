import React from "react";
import { Row, Col } from "react-bootstrap";
import { CustomFormInput } from "./CustomFormInput";

interface CustomTextFieldProps {
    label: string;
    controlId: string;
    placeholder?: string;
    register: any;
    error?: any;
    validation?: object;
    labelSize?: number;
    inputType?: string;
    asCol?: boolean;
    isEditable?: boolean;
    value?: string | string[] | number;
    onChange?: (value: string) => void;
    as?: string;
    rows?: number;
}

const CustomTextField: React.FC<CustomTextFieldProps> = ({
    label,
    controlId,
    placeholder = "Enter value",
    register,
    error,
    validation,
    labelSize = 4,
    inputType = "text",
    asCol = false,
    isEditable = true,
    onChange,
    value,
    as,
    rows
}) => {
    return (
        <Row className={`align-items-${error ? "start" : "center"} ${labelSize !== 4 ? "mb-4" : ""}`}>
            <Col sm={labelSize} className={`d-flex ${error ? "align-items-start" : "align-items-center"}`}>
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
                <CustomFormInput
                    label=""
                    controlId={controlId}
                    placeholder={placeholder}
                    register={register}
                    error={error}
                    asCol={asCol}
                    validation={validation}
                    inputType={inputType}
                    isEditable={isEditable}
                    onChange={onChange}
                    value={value}
                    as={as}
                    rows={rows}
                />
            </Col>
        </Row>
    );
};

export default CustomTextField;
