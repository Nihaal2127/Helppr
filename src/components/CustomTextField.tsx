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
    maxLength?: number;
    /** Indian PIN: numeric keyboard hint and optional stricter defaults when used with `maxLength={6}`. */
    isIndianPincodeField?: boolean;
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
    rows,
    maxLength,
    isIndianPincodeField,
}) => {
    const resolvedInputType = isIndianPincodeField ? "tel" : inputType;
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
                    inputType={resolvedInputType}
                    isEditable={isEditable}
                    onChange={onChange}
                    value={value}
                    as={as}
                    rows={rows}
                    maxLength={maxLength}
                />
            </Col>
        </Row>
    );
};

export default CustomTextField;
