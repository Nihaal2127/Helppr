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
}

const CustomTextField: React.FC<CustomTextFieldProps> = ({
    label,
    controlId,
    placeholder = "Enter value",
    register,
    error,
    validation,
    labelSize = 4,
}) => {
    return (
        <Row className={`align-items-${error ? "start" : "center"} ${labelSize !== 4 ? "mb-4" : ""}`}>
            <Col sm={labelSize} className={`d-flex ${error ? "align-items-start" : "align-items-center"}`}>
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col >
                <CustomFormInput
                    label=""
                    controlId={controlId}
                    placeholder={placeholder}
                    register={register}
                    error={error}
                    asCol={false}
                    validation={validation}
                />
            </Col>
        </Row>
    );
};

export default CustomTextField;
