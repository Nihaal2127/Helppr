import React from "react";
import { Row, Col } from "react-bootstrap";
import { UseFormSetValue } from "react-hook-form";
import CustomTimePicker from "./CustomTimePicker";

interface CustomTextFieldTimePicketProps {
  labelSize?: number;
  label: string;
  controlId: string;
  groupControlId?: string;
  selectedTime: string | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  filterTime?: (date: Date) => boolean;
  /** Minutes between times in the picker (passed to react-datepicker). Default 120. */
  timeIntervals?: number;
  register: any;
  validation?: any;
  error?: any;
  asCol?: boolean;
  setValue: UseFormSetValue<any>;
  suppressHiddenRegister?: boolean;
}

const CustomTextFieldTimePicket: React.FC<CustomTextFieldTimePicketProps> = ({
  labelSize = 4,
  label,
  controlId,
  groupControlId,
  selectedTime,
  onChange,
  placeholderText = "Select a time",
  filterTime,
  timeIntervals,
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
        <CustomTimePicker
          label=""
          controlId={controlId}
          groupControlId={groupControlId}
          selectedTime={selectedTime}
          onChange={onChange}
          placeholderText={placeholderText}
          error={error}
          register={register}
          validation={validation}
          setValue={setValue}
          asCol={asCol}
          filterTime={filterTime}
          timeIntervals={timeIntervals}
          suppressHiddenRegister={suppressHiddenRegister}
        />
      </Col>
    </Row>
  );
};

export default CustomTextFieldTimePicket;
