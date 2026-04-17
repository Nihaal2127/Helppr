import React, { useState, useEffect, useRef } from "react";
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
  onChange?: (value: string) => void;
  inputType?: string;
  isEditable?: boolean;
  maxLength?: number;
  as?: string;
  rows?: number;
  /** Merged into Form.Control inline style (e.g. border overrides for read-only fields). */
  inputStyle?: React.CSSProperties;
  /** Extra classes on Form.Control (e.g. focus/border overrides that need CSS). */
  inputClassName?: string;
  /** Strip non-digits, max 6 chars; use with `indianPincodeRequiredRules()` from `helper/pincodeValidation`. */
  isIndianPincodeField?: boolean;
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
  inputStyle,
  inputClassName,
  isIndianPincodeField = false,
}) => {
  const isControlled = value !== undefined;
  const [inputValue, setInputValue] = useState<string>(String(value ?? ""));
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (isControlled) {
      setInputValue(String(value ?? ""));
    }
  }, [isControlled, value]);

  return inputType === "password" ? (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
    >
      {label?.trim() && <Form.Label className="fw-medium mb-1">{label}</Form.Label>}
      <InputGroup className="mb-0">
        <Form.Control
          className="custom-form-input"
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          {...register(controlId, validation)}
          isInvalid={!!error}
          value={isControlled ? value : inputValue}
          onChange={(e) => {
            const next = e.target.value;
            if (!isControlled) {
              setInputValue(next);
            }
            onChangeRef.current?.(next);
          }}
          readOnly={!isEditable}
          maxLength={maxLength}
          style={{
            boxShadow: "none",
            // borderRadius: "8px",
            borderRadius: "8px 0 0 8px",
            borderColor: "var(--primary-color)",
            fontSize: "14px",
            fontWeight: "normal",
            width: "80%",
            height: as !== "textarea" ? "35px" : "auto",
            lineHeight: "18px",
            backgroundColor: "var(--bg-color)",
            fontFamily: "'Inter'",
            color: "var(--content-txt-color)",
            marginBottom: "10px"
          }}
        />
        <div
          className={classNames("input-group-text", "input-group-password", {
            "show-password": showPassword,
          })}
          data-password={showPassword ? "true" : "false"}
          style={{
            width: "40px",
            height: as !== "textarea" ? "35px" : "auto",
            borderColor: "var(--primary-color)",
            borderRadius: "0 8px 8px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
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
      {label?.trim() && <Form.Label className="fw-medium mb-1">{label}</Form.Label>}
      <Form.Control
        className={classNames("custom-form-input", inputClassName)}
        type={inputType}
        placeholder={placeholder}
        {...(() => {
          const reg = register(controlId, validation);
          const { onChange: regOnChange, ...regRest } = reg;
          return {
            ...regRest,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              let next = e.target.value;
              if (isIndianPincodeField) {
                next = next.replace(/\D/g, "").slice(0, 6);
                e.target.value = next;
              }
              if (!isControlled) {
                setInputValue(next);
              }
              onChangeRef.current?.(next);
              regOnChange(e);
            },
          };
        })()}
        isInvalid={!!error}
        value={isControlled ? value : inputValue}
        readOnly={!isEditable}
        maxLength={isIndianPincodeField ? 6 : maxLength}
        inputMode={isIndianPincodeField ? "numeric" : undefined}
        autoComplete={isIndianPincodeField ? "postal-code" : undefined}
        as={as}
        rows={as === "textarea" ? rows : undefined}
        style={{
          boxShadow: "none",
          borderRadius: "8px",
          borderColor: "var(--primary-color)",
          fontSize: "14px",
          fontWeight: "normal",
          width: "100%",
          height: as !== "textarea" ? "35px" : "auto",
          lineHeight: "18px",
          backgroundColor: "var(--bg-color)",
          fontFamily: "'Inter'",
          color: "var(--content-txt-color)",
          marginBottom: "10px",
          ...inputStyle,
        }}
      />
      {error && <Form.Control.Feedback type="invalid">{error.message}</Form.Control.Feedback>}
    </Form.Group>
  );
};
