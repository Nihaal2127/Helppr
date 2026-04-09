import React from "react";
import { Row, Col } from "react-bootstrap";
import { UseFormSetValue } from "react-hook-form";
import { CustomRadioSelection } from "./CustomRadioSelection";

interface CustomTextFieldRadioProps {
    label: string;
    name: string;
    options: { value: string; label: string }[];
    defaultValue?: string | boolean | null;
    isEditable?: boolean;
    setValue: UseFormSetValue<any>;
}

const CustomTextFieldRadio: React.FC<CustomTextFieldRadioProps> = ({
    label,
    name,
    options,
    defaultValue,
    isEditable = false,
    setValue,
}) => {
    return (
        <Row className="align-items-center">
            <Col sm={4} className="mt-2">
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
                <CustomRadioSelection
                    label=""
                    name={name}
                    options={options}
                    defaultValue={defaultValue}
                    isEditable={isEditable}
                    setValue={setValue}
                />
            </Col>
        </Row>
    );
};

export default CustomTextFieldRadio;
