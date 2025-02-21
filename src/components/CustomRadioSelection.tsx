import React, { useState, useEffect } from "react";
import { FieldErrors, UseFormSetValue } from "react-hook-form";
import { Form } from "react-bootstrap";

interface Option {
  label: string;
  value: string | boolean;
  containerClass?: string;
}

interface CustomRadioSelectionProps {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string | boolean | null;
  isEditable?: boolean;
  setValue: UseFormSetValue<any>;
}

export const CustomRadioSelection: React.FC<CustomRadioSelectionProps> = ({
  label,
  name,
  options,
  defaultValue,
  isEditable = false,
  setValue,
}) => {
  const [selectedValue, setSelectedValue] = useState<string | boolean | null>(
    defaultValue || null
  );

  useEffect(() => {
    if (isEditable && defaultValue !== undefined) {
      setSelectedValue(defaultValue);
      setValue(name, defaultValue);
    }
  }, [defaultValue, isEditable, name, setValue]);

  const flexDirection = options.length === 2 ? "row" : "column";

  return (
    <Form.Group className="mb-3">
      <Form.Label className="custom-radio-label">{label}</Form.Label>
      <div className={`d-flex`} style={{ flexDirection, gap: "8px" }}>
        {options.map((option, index) => (
          <Form.Check
            key={`${name}_${index}`}
            type="radio"
            id={`${name}_${index}`}
            label={
              <span className="custom-radio-text">{option.label}</span>
            }
            value={option.value.toString()}
            checked={selectedValue === option.value}
            onChange={() => {
              setSelectedValue(option.value);
              setValue(name, option.value);
            }}
            className={`custom-radio-check ${option.containerClass || ''}`}
          />
        ))}
      </div>
    </Form.Group>
  );
};
