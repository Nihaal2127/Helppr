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
  labelSize?: number;
  /** Align radios on same row as label (e.g. Gender on Add Partner). */
  alignItemsCenter?: boolean;
}

const CustomTextFieldRadio: React.FC<CustomTextFieldRadioProps> = ({
  label,
  name,
  options,
  defaultValue,
  isEditable = false,
  setValue,
  labelSize = 4,
  alignItemsCenter = false,
}) => {
  const alignClass = alignItemsCenter ? "center" : "start";
  return (
    <Row className={`align-items-${alignClass}`}>
      <Col
        sm={labelSize}
        className={`d-flex align-items-${alignClass}`}
      >
        <label className="custom-profile-lable mb-0">{label}</label>
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
