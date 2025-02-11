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
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return inputType === "password" ? (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
    >
      <Form.Label>{label}</Form.Label>
      <InputGroup className="mb-0">
        <Form.Control
          className="custom-input"
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          {...register(controlId, validation)}
          isInvalid={!!error}
          value={value}
          onChange={onChange}
          readOnly={!isEditable}
          maxLength={maxLength}
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
      <Form.Label>{label}</Form.Label>
      <Form.Control
        className="custom-input"
        type={inputType}
        placeholder={placeholder}
        {...register(controlId, validation)}
        isInvalid={!!error}
        value={value}
        onChange={onChange}
        readOnly={!isEditable}
        maxLength={maxLength}
      />
      {error && <Form.Control.Feedback type="invalid">{error.message}</Form.Control.Feedback>}
    </Form.Group>
  );
};
