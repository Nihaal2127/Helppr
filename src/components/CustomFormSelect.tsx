import React, { useEffect, useMemo, useRef, useState } from "react";
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
  setValue?: (name: string, value: any, options?: { shouldValidate?: boolean }) => void;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  asCol?: boolean;
  noBottomMargin?: boolean;
  /** Fixed width (e.g. `"220px"`). Constrains the control and stops the inner search input from stretching with flex. */
  selectWidth?: string;
  /** Render menu in document.body — use inside Bootstrap modals (with enforceFocus={false}). */
  menuPortal?: boolean;
  /** Custom placeholder text for the select input. */
  placeholder?: string;
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
  noBottomMargin = false,
  selectWidth,
  menuPortal = false,
  placeholder,
}) => {

  const [selectedOption, setSelectedOption] = useState<{ value: string; label: string } | null>(null);

  // Parents often pass inline `setValue` / `options` — new references each render would re-run the
  // sync effect and reset the controlled value (e.g. clear selection when defaultValue is "").
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;

  const optionsSyncKey = useMemo(
    () =>
      JSON.stringify(
        [...options].sort((a, b) => a.value.localeCompare(b.value)).map((o) => [o.value, o.label])
      ),
    [options]
  );

  useEffect(() => {
    const defaultOption =
      options.find((option) =>
        isValue ? option.label === defaultValue : option.value === defaultValue
      ) || null;
    setSelectedOption(defaultOption);
    const sync = setValueRef.current;
    if (sync && defaultOption) {
      if (isValue) {
        sync(`${fieldName}_label`, defaultOption.label, { shouldValidate: false });
        sync(fieldName, defaultOption.label, { shouldValidate: false });
      } else {
        sync(fieldName, defaultOption.value, { shouldValidate: false });
      }
    }
    // Intentionally omit `options` / `setValue` — keyed by content and ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue, optionsSyncKey, fieldName, isValue]);

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

  const customStyles = useMemo(
    () => ({
      container: (provided: any) => ({
        ...provided,
        ...(selectWidth ? { width: "100%", maxWidth: "100%" } : {}),
      }),
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
        ...(selectWidth ? { minWidth: 0 } : {}),
        height: "35px",
        lineHeight: "18px",
        backgroundColor: "var(--bg-color)",
        fontFamily: "'Inter'",
        color: "var(--content-txt-color)",
        marginBottom: noBottomMargin ? 0 : "10px",
      }),
      valueContainer: (provided: any, state: any) => {
        const filterText = String(state?.selectProps?.inputValue ?? "");
        const typing = Boolean(selectWidth) && filterText.length > 0;
        return {
          ...provided,
          ...(selectWidth
            ? {
                minWidth: 0,
                flexWrap: "nowrap" as const,
                ...(typing
                  ? {
                      display: "flex",
                      alignItems: "center",
                    }
                  : {}),
              }
            : {}),
        };
      },
      input: (provided: any, state: any) => {
        const filterText = String(
          state?.value ?? state?.selectProps?.inputValue ?? ""
        );
        const typing = Boolean(selectWidth) && filterText.length > 0;
        return {
          ...provided,
          ...(selectWidth
            ? typing
              ? {
                  flex: "1 1 auto",
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                }
              : {
                  flex: "0 0 auto",
                  width: "auto",
                  maxWidth: "40px",
                  minWidth: "2px",
                }
            : {}),
        };
      },
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
        ...(selectWidth
          ? {
              maxWidth: "calc(100% - 8px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }
          : {}),
      }),
      placeholder: (provided: any) => ({
        ...provided,
        fontSize: "14px",
        color: "var(--placeholder-txt)",
        fontFamily: "Inter",
        ...(selectWidth
          ? {
              maxWidth: "calc(100% - 8px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }
          : {}),
      }),
      ...(menuPortal
        ? {
            menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
          }
        : {}),
    }),
    [selectWidth, noBottomMargin, menuPortal]
  );

  const formGroupStyle = selectWidth
    ? { width: selectWidth, maxWidth: "100%", flex: "0 0 auto" as const, minWidth: 0 }
    : undefined;

  return (
    <Form.Group
      as={asCol ? Col : "div"}
      {...(asCol ? { xs: 12, md: 4 } : {})}
      controlId={controlId}
      style={formGroupStyle}
    >
       {label?.trim() && <Form.Label className="fw-medium mb-1">{label}</Form.Label>}
      <Select
        className="react-select react-select-container"
        classNamePrefix="react-select"
        {...register(
          fieldName,
          requiredMessage ? { required: requiredMessage } : {}
        )}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder || `Select ${controlId}`}
        onBlur={() => {
          if (!selectedOption && setValue) {
            setValue(fieldName, "", { shouldValidate: false });
          }
        }}
        styles={customStyles}
        menuPortalTarget={menuPortal ? document.body : undefined}
        menuPosition={menuPortal ? "fixed" : undefined}
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