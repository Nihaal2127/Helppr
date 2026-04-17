import React from "react";
import { Row, Col } from "react-bootstrap";
import CustomFormSelect from "./CustomFormSelect";

interface CustomTextFieldSelectProps {
    label: string;
    controlId: string;
    options: { value: string; label: string }[];
    register: any;
    fieldName: string;
    error?: any;
    requiredMessage?: string;
    defaultValue?: string;
    setValue?: (name: string, value: any) => void;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    labelSize?: number;
    asCol?: boolean;
    /** Passed to react-select (e.g. "Select employee"). */
    placeholder?: string;
    /** Use inside Bootstrap modals so the menu is not clipped. */
    menuPortal?: boolean;
}

const CustomTextFieldSelect: React.FC<CustomTextFieldSelectProps> = ({
    label,
    controlId,
    options,
    register,
    fieldName,
    error,
    requiredMessage,
    defaultValue = "",
    setValue,
    onChange,
    labelSize = 4,
    asCol = false,
    placeholder,
    menuPortal = false,
}) => {
    return (
        <Row className={`align-items-${error ? "start" : "center"} ${labelSize !== 4 ? "mb-4" : ""}`}>
            <Col sm={labelSize} className={`d-flex ${error ? "align-items-start" : "align-items-center"}`}>
                <label className="custom-profile-lable">{label}</label>
            </Col>
            <Col>
                <CustomFormSelect
                    label=""
                    controlId={controlId}
                    options={options}
                    register={register}
                    fieldName={fieldName}
                    error={error}
                    requiredMessage={requiredMessage}
                    defaultValue={defaultValue}
                    setValue={setValue}
                    asCol={asCol}
                    onChange={onChange}
                    placeholder={placeholder}
                    menuPortal={menuPortal}
                />
            </Col>
        </Row>
    );
};

export default CustomTextFieldSelect;
