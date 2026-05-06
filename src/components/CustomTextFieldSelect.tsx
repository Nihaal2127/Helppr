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
  /** Omit default `mb-4` on the label row (e.g. dense stacks in modals). */
  noRowBottomMargin?: boolean;
  /** Passed to `CustomFormSelect` — removes control bottom margin. */
  noBottomMargin?: boolean;
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
  noRowBottomMargin = false,
  noBottomMargin = false,
}) => {
  const rowMarginClass = noRowBottomMargin ? "" : labelSize !== 4 ? "mb-4" : "";
  return (
    <Row
      className={["align-items-start", rowMarginClass]
        .filter(Boolean)
        .join(" ")}
    >
      <Col sm={labelSize} className="d-flex align-items-start">
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
          noBottomMargin={noBottomMargin}
        />
      </Col>
    </Row>
  );
};

export default CustomTextFieldSelect;
