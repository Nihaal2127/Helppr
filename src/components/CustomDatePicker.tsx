import React, { useRef } from "react";
import { Form, Col } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FieldError, UseFormRegister, UseFormSetValue } from "react-hook-form";

interface CustomDatePickerProps {
  label?: string;
  controlId: string;
  selectedDate: string | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  filterDate?: (date: Date) => boolean;
  register: UseFormRegister<any>;
  validation?: any;
  error?: string | FieldError;
  asCol?: boolean;
  setValue: UseFormSetValue<any>;
  groupClassName?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label,
  controlId,
  selectedDate,
  onChange,
  placeholderText = "Select a date",
  filterDate,
  error,
  asCol = true,
  setValue,
  register,
  validation,
  groupClassName,
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
      <Form.Group controlId={controlId} className={groupClassName ?? "mb-3 w-100"}>
        {label && <Form.Label>{label}</Form.Label>}
        <div className="position-relative w-100">
          <DatePicker
            ref={datePickerRef}
            selected={selectedDate ? new Date(selectedDate) : null}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            placeholderText={placeholderText}
            className={`form-control ${error ? "is-invalid" : ""} full-width-date-picker`}
            filterDate={filterDate ?? ((date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date >= today;
            })}
            showPopperArrow={false}
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
        value={selectedDate || ""}
      />
    </Wrapper>
  );
};

export default CustomDatePicker;
