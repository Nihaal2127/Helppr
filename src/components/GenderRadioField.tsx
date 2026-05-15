import React from "react";
import { Form } from "react-bootstrap";
import { GENDER_OPTIONS } from "../lib/user/genderOptions";

type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];

type GenderRadioFieldProps = {
  value: GenderValue | "";
  onChange: (next: GenderValue) => void;
  className?: string;
};

const GenderRadioField: React.FC<GenderRadioFieldProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <Form.Group className={className} style={{ marginTop: "6px" }}>
      <Form.Label className="fw-medium mb-1">Gender</Form.Label>
      <div className="d-flex flex-wrap" style={{ gap: "12px" }}>
        {GENDER_OPTIONS.map((opt) => (
          <Form.Check
            key={opt.value}
            type="radio"
            id={`gender_${opt.value}`}
            name="gender"
            label={<span className="custom-radio-text">{opt.label}</span>}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="custom-radio-check"
          />
        ))}
      </div>
    </Form.Group>
  );
};

export default GenderRadioField;
