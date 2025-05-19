import React, { useEffect, useState } from "react";
import { Form, Col } from "react-bootstrap";
import Select from "react-select";
import { UseFormRegister, FieldError } from "react-hook-form";

interface CustomMultiSelectProps {
  label: string;
  controlId: string;
  options: { value: string; label: string }[];
  value: { value: string; label: string }[];
  onChange: (selectedOptions: { value: string; label: string }[]) => void;
  error?: FieldError;
  register?: UseFormRegister<any>;
  fieldName?: string;
  requiredMessage?: string;
  setValue?: (name: string, value: any) => void;
  asCol?: boolean;
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  label,
  controlId,
  options,
  value,
  onChange,
  error,
  register,
  fieldName,
  requiredMessage,
  setValue,
  asCol = true,
}) => {

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "var(--primary-color)",
      "&:hover": {
        borderColor: "var(--primary-color)",
      },
      boxShadow: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "normal",
      width: "100%",
      height: "auto",
      lineHeight: "18px",
      backgroundColor: "var(--bg-color)",
      fontFamily: "'Inter'",
      color: "var(--content-txt-color)",
      marginBottom: "10px"
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "var(--txtfld-border)" : state.isFocused ? "var(--primary-color)" : "",
      color: state.isSelected ? "var(--bg-color)" : state.isFocused ? "var(--bg-color)" : "var(--primary-color)",
      "&:hover": {
        backgroundColor: "var(--primary-color)",
        color: "var(--bg-color)",
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "var(--content-txt-color)",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      // color: AppColor.selectPlaceholderColor,
      fontSize: "14px",
      color: "var(--placeholder-txt)",
      fontFamily: "Inter",
    }),
  };

  const handleChange = (selectedOptions: { value: string; label: string }[]) => {
    if (setValue && fieldName) {
      setValue(fieldName, selectedOptions);
    }
    onChange([...selectedOptions]);
  };

  return (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
    >
      {label?.trim() && <Form.Label>{label}</Form.Label>}
      <Select
        className="react-select react-select-container"
        classNamePrefix="react-select"
        isMulti
        {...(register && fieldName ? register(fieldName, { required: requiredMessage }) : {})}
        options={options}
        value={value}
        onChange={handleChange}
        styles={customStyles}
        placeholder={`Select ${controlId}`}
        onBlur={() => {
          if (setValue && fieldName) {
            setValue(fieldName, value || []);
          }
        }}
      />
      {error && (
        <Form.Control.Feedback type="invalid" style={{ display: "block" }}>
          {error.message}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default CustomMultiSelect;
