import React, { useEffect, useState } from "react";
import { Form, Col } from "react-bootstrap";
import Select from "react-select";
import { UseFormRegister, FieldError } from "react-hook-form";

interface CustomFormSelectProps {
  label: string;
  controlId: string;
  register: UseFormRegister<any>;
  options: { value: string; label: string }[];
  fieldName: string;
  error?: FieldError;
  requiredMessage?: string;
  defaultValue?: string;
  isValue?: boolean;
  setValue?: (name: string, value: any) => void;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  asCol?: boolean;
}

const CustomFormSelect: React.FC<CustomFormSelectProps> = ({
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
  isValue = false,
  asCol = true,
}) => {

  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    const defaultOption = options.find((option) =>
      isValue ? option.label === defaultValue : option.value === defaultValue) || null;
    setSelectedOption(defaultOption);
    if (setValue && defaultOption) {
      if (isValue) {
        setValue(`${fieldName}_label`, defaultOption.label);
        setValue(fieldName, defaultOption.label,);
      } else {
        setValue(fieldName, defaultOption.value);
      }
    }
  }, [defaultValue, options, setValue, fieldName, isValue]);

  const handleChange = (option: { value: string; label: string } | null) => {
    setSelectedOption(option);
    const value = option?.value || "";
    const label = option?.label || "";
    if (setValue) {
      if (isValue) {
        setValue(`${fieldName}_label`, label);
        setValue(fieldName, label);
      } else {
        setValue(fieldName, value);
      }
    }

    const fakeEvent = { target: { value, }, };
    onChange?.(fakeEvent as React.ChangeEvent<HTMLSelectElement>);
  };

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
      height: "2.62rem",
      lineHeight: "18px",
      backgroundColor: "var(--bg-color)",
      fontFamily: "'Inter'",
      color: "var(--content-txt-color)",
      marginBottom : "10px"
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
      color:"var(--content-txt-color)",
    }),
    placeholder: (provided: any) => ({
      ...provided,
     // color: AppColor.selectPlaceholderColor,
      fontSize: "14px",
      color: "var(--placeholder-txt)",
      fontFamily: "Inter",
    }),
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
        {...register(fieldName, { required: requiredMessage })}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={`Select ${controlId}`}
        onBlur={() => {
          if (!selectedOption && setValue) {
            setValue(fieldName, "");
          }
        }}
        styles={customStyles}
      />
      {error && (
        <Form.Control.Feedback type="invalid" style={{ display: "block" }}>
          {error.message}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default CustomFormSelect;