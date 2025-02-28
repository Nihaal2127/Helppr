import React, { useState } from "react";
import { Col, Form, InputGroup } from "react-bootstrap";
import { Eye, EyeOff } from "react-feather";
import classNames from "classnames";

interface CustomFormInputProps {
  label: string;
  controlId: string;
  placeholder: string;
  register: any;
  validation?: any;
  error?: any;
  asCol?: boolean;
  value?: string | string[] | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputType?: string;
  isEditable?: boolean;
  maxLength?: number;
  as?: string;
  rows?: number;
}

export const CustomFormInput: React.FC<CustomFormInputProps> = ({
  label,
  controlId,
  placeholder,
  register,
  validation,
  error,
  asCol = true,
  onChange,
  value,
  inputType = "text",
  isEditable = true,
  maxLength,
  as,
  rows,
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return inputType === "password" ? (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
    >
      {label?.trim() && <Form.Label>{label}</Form.Label>}
      <InputGroup className="mb-0">
        <Form.Control
          className="custom-form-input"
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          {...register(controlId, validation)}
          isInvalid={!!error}
          value={value}
          onChange={onChange}
          readOnly={!isEditable}
          maxLength={maxLength}
          style={{
            boxShadow: "none",
            borderRadius: "8px",
            borderColor:"var(--primary-color)",
            fontSize: "14px",
            fontWeight: "normal",
            width: "100%",
            height: as !== "textarea" ? "2.62rem" : "auto",
            lineHeight: "18px",
            backgroundColor: "var(--bg-color)",
            fontFamily: "'Inter'",
            color: "var(--content-txt-color)",
            marginBottom : "10px"
          }}
        />
        <div
          className={classNames("input-group-text", "input-group-password", {
            "show-password": showPassword,
          })}
          data-password={showPassword ? "true" : "false"}
        >
          <span
            className="password-eye"
            onClick={() => {
              setShowPassword(!showPassword);
            }} >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </span>
        </div>

        {error && <Form.Control.Feedback type="invalid">{error.message}</Form.Control.Feedback>}
      </InputGroup>

    </Form.Group>
  ) : (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
    >
     {label?.trim() && <Form.Label>{label}</Form.Label>}
      <Form.Control
        className="custom-form-input"
        type={inputType}
        placeholder={placeholder}
        {...register(controlId, validation)}
        isInvalid={!!error}
        value={value}
        onChange={onChange}
        readOnly={!isEditable}
        maxLength={maxLength}
        as={as}
        rows={as === "textarea" ? rows : undefined}
        style={{
          boxShadow: "none",
          borderRadius: "8px",
          borderColor:"var(--primary-color)",
          fontSize: "14px",
          fontWeight: "normal",
          width: "100%",
          height: as !== "textarea" ? "2.62rem" : "auto",
          lineHeight: "18px",
          backgroundColor: "var(--bg-color)",
          fontFamily: "'Inter'",
          color: "var(--content-txt-color)",
          marginBottom : "10px"
        }}
      />
      {error && <Form.Control.Feedback type="invalid">{error.message}</Form.Control.Feedback>}
    </Form.Group>
  );
};
