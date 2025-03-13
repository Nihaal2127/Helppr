import React, { useRef } from "react";
import { Form, Col } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FieldError, UseFormRegister, UseFormSetValue } from "react-hook-form";

interface CustomTimePickerProps {
  label: string;
  controlId: string;
  selectedTime: string | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  filterTime?: (date: Date) => boolean;
  register: UseFormRegister<any>;
  validation?: any;
  error?: string | FieldError;
  asCol?: boolean;
  setValue: UseFormSetValue<any>;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  label,
  controlId,
  selectedTime,
  onChange,
  placeholderText = "Select a time",
  filterTime,
  error,
  asCol = true,
  setValue,
  register,
  validation,
}) => {
  const Wrapper = asCol ? Col : "div";
  const wrapperProps = asCol ? { xs: 12, md: 4 } : {};

  const datePickerRef = useRef<DatePicker | null>(null);

  const handleDateChange = (date: Date | null) => {
    setValue(controlId, date || null, { shouldValidate: true });
    onChange(date);
  };

  const handleIconClick = () => {
    if (datePickerRef.current) {
      datePickerRef.current.setOpen(true);
    }
  };

  return (
    <Wrapper {...wrapperProps}>
      <Form.Group controlId={controlId} className="mb-3 w-100">
        <Form.Label>{label}</Form.Label>
        <div className="position-relative w-100">
          <DatePicker
            ref={datePickerRef}
            selected={selectedTime ? new Date(selectedTime) : null}
            onChange={handleDateChange}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={120}
            dateFormat="h:mm aa"
            placeholderText={placeholderText}
            className={`form-control ${error ? "is-invalid" : ""} full-width-date-picker`}
            showPopperArrow={false}
            {...(filterTime && { filterTime })}
          />
          <span
            className="position-absolute top-50 end-0 translate-middle-y me-3"
            style={{ cursor: "pointer" }}
            onClick={handleIconClick}
          >
            <i className="bi bi-calendar"></i>
          </span>
        </div>
        {error && (
          <Form.Control.Feedback type="invalid" className="d-block">
            {typeof error === "string" ? error : error.message || "This field is required."}
          </Form.Control.Feedback>
        )}
      </Form.Group>
      <input
        type="hidden"
        {...register(controlId, validation)}
        value={selectedTime || ""}
      />
    </Wrapper>
  );
};

export default CustomTimePicker;
