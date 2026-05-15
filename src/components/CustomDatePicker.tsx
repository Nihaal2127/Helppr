import React, { useRef, useState } from "react";
import { Form, Col } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FieldError, UseFormRegister, UseFormSetValue } from "react-hook-form";

interface CustomDatePickerProps {
  label?: string;
  controlId: string;
  /** Optional DOM id for `Form.Group` when the same field is shown twice (avoids duplicate `controlId` in the tree). */
  groupControlId?: string;
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
  /** Second copy of the same field: still calls `setValue(controlId, …)` but skips the hidden `register` input. */
  suppressHiddenRegister?: boolean;
  /** Date of birth: year/month dropdowns, past dates only. */
  birthDatePicker?: boolean;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label,
  controlId,
  groupControlId,
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
  suppressHiddenRegister = false,
  birthDatePicker = false,
}) => {
  const Wrapper = asCol ? Col : "div";
  const wrapperProps = asCol ? { xs: 12, md: 4 } : {};

  const datePickerRef = useRef<DatePicker | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const maxDob = birthDatePicker ? new Date() : undefined;
  const minDob = birthDatePicker
    ? new Date(new Date().getFullYear() - 100, 0, 1)
    : undefined;

  const handleDateChange = (date: Date | null) => {
    setValue(controlId, date || null, { shouldValidate: true });
    onChange(date);
    setIsOpen(false);
  };

  const handleIconClick = () => {
    setIsOpen(true);
  };

  return (
    <Wrapper {...wrapperProps}>
      <Form.Group
        controlId={groupControlId ?? controlId}
        className={groupClassName ?? "mb-3 w-100"}
      >
        {label && <Form.Label>{label}</Form.Label>}
        <div className="position-relative w-100">
          <DatePicker
            ref={datePickerRef}
            open={isOpen}
            selected={selectedDate ? new Date(selectedDate) : null}
            onChange={handleDateChange}
            onSelect={() => setIsOpen(false)}
            onClickOutside={() => setIsOpen(false)}
            onInputClick={() => setIsOpen(true)}
            dateFormat="dd/MM/yyyy"
            placeholderText={placeholderText}
            className={`form-control ${
              error ? "is-invalid" : ""
            } full-width-date-picker`}
            filterDate={
              filterDate ??
              (birthDatePicker
                ? (date) => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    const max = new Date();
                    max.setHours(23, 59, 59, 999);
                    return d <= max;
                  }
                : (date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date >= today;
                  })
            }
            showYearDropdown={birthDatePicker}
            showMonthDropdown={birthDatePicker}
            scrollableYearDropdown={birthDatePicker}
            yearDropdownItemNumber={birthDatePicker ? 100 : undefined}
            maxDate={birthDatePicker ? maxDob : undefined}
            minDate={birthDatePicker ? minDob : undefined}
            showPopperArrow={false}
            shouldCloseOnSelect
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
            {typeof error === "string"
              ? error
              : error.message || "This field is required."}
          </Form.Control.Feedback>
        )}
      </Form.Group>
      {!suppressHiddenRegister ? (
        <input
          type="hidden"
          {...register(controlId, validation)}
          value={selectedDate || ""}
        />
      ) : null}
    </Wrapper>
  );
};

export default CustomDatePicker;
