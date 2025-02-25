import React from "react";
import { Row, Col } from "react-bootstrap";
import {CustomFormInput} from "./CustomFormInput";

interface CustomTextFieldProps {
    label: string;
    controlId: string;
    placeholder?: string;
    register: any;
    error?: any;
    validation?: object;
}

const CustomTextField: React.FC<CustomTextFieldProps> = ({
    label,
    controlId,
    placeholder = "Enter value",
    register,
    error,
    validation,
}) => {
    return (
        <Row className="align-items-center m-0 p-0">
            <Col sm={4} className="mt-4 ms-2">
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
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
