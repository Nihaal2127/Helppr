import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldIndiaMobile from "../../components/CustomTextFieldIndiaMobile";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";
import { FullDetailsRow, getStatusOptions } from "../../helper/utility";
import { openDialog } from "../../lib/global/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";
import {
  getFranchiseEmployeeScreenMenuItems,
  isFranchiseEmployeeExcludedScreenKey,
} from "../../lib/layout/franchiseEmployeeScreenPermissions";
import { menuKeysFromAvailablePages } from "../../services/userService";
import type { EmployeeRow } from "../../services/myFranchiseService";
import {
  createFranchiseEmployee,
  updateFranchiseEmployee,
} from "../../services/myFranchiseService";
import {
  isNonEmptyName,
  isValidUserEmail,
  isValidE164StylePhone,
  fullPhoneFromIndiaNational,
  nationalDigitsWithoutIndia91,
  sanitizeIndiaNationalPhoneInput,
  validateStrongPassword,
  passwordsMatch,
} from "../../lib/user/userFormValidation";

type EmployeeFormValues = {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  is_active: string;
  chat_enabled: boolean;
};

type FranchiseEmployeeDialogProps = {
  onClose: () => void;
  /** Return a Promise so add/update can await getCount + list reload before closing. */
  onRefreshData: () => void | Promise<void>;
} & (
  | { mode: "add"; employee: null }
  | { mode: "view-edit"; employee: EmployeeRow }
);

const FranchiseEmployeeDialog: React.FC<FranchiseEmployeeDialogProps> & {
  showAdd: (onRefreshData: () => void | Promise<void>) => void;
  showView: (
    employee: EmployeeRow,
    onRefreshData: () => void | Promise<void>
  ) => void;
} = (props) => {
  const { onClose, onRefreshData } = props;
  const isAdd = props.mode === "add";
  const employee = isAdd ? null : props.employee;

  /** Explicit tuple (avoids rare HMR / legacy `ReactDOM.render` issues with destructured setter). */
  const screenPermissionState = useState<string[]>(["dashboards"]);
  const screenPermissionKeys = screenPermissionState[0];
  const setScreenPermissionKeys = screenPermissionState[1];

  const [isEditing, setIsEditing] = useState(isAdd);

  const franchiseScreenMenuItems = useMemo(
    () => getFranchiseEmployeeScreenMenuItems(),
    []
  );

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      is_active: "true",
      chat_enabled: true,
    },
  });

  const isActiveStr = watch("is_active");
  const isActiveBool = String(isActiveStr ?? "") === "true";
  const chatEnabled = watch("chat_enabled");

  useEffect(() => {
    setIsEditing(isAdd);
  }, [isAdd, employee?._id]);

  useEffect(() => {
    if (isAdd) {
      reset({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        is_active: "true",
        chat_enabled: true,
      });
      setScreenPermissionKeys(["dashboards"]);
      return;
    }
    if (employee && isEditing) {
      reset({
        name: employee.name,
        phone: nationalDigitsWithoutIndia91(String(employee.phone ?? "")),
        email: employee.email,
        password: "",
        confirmPassword: "",
        is_active: String(employee.is_active),
        chat_enabled: Boolean(
          employee.is_active && (employee.chat_enabled ?? true)
        ),
      });
      const fromKeys = employee.screenPermissionKeys?.length
        ? employee.screenPermissionKeys
        : menuKeysFromAvailablePages(employee.accessible_screens);
      setScreenPermissionKeys(fromKeys.length ? fromKeys : ["dashboards"]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use employee?._id so parent re-fetch (new object ref) does not reset the form mid-edit; fields match that id
  }, [isAdd, employee?._id, isEditing, reset]);

  const modalTitle = isAdd
    ? "Add Employee"
    : isEditing
    ? "Edit Employee"
    : "Employee Details";

  const parseSubmitPayload = (data: EmployeeFormValues & { phone?: string }) => {
    const is_active = String(data.is_active ?? "") === "true";
    const chat_enabled = is_active ? Boolean(data.chat_enabled) : false;
    const keys = screenPermissionKeys.filter(
      (k) => !isFranchiseEmployeeExcludedScreenKey(k)
    );
    const national = sanitizeIndiaNationalPhoneInput(
      String(data.phone ?? "").trim()
    );
    const phone = fullPhoneFromIndiaNational(national);
    return {
      name: data.name.trim(),
      phone,
      email: data.email.trim(),
      is_active,
      chat_enabled,
      screenPermissionKeys: keys,
    };
  };

  const onSubmitForm = async (data: EmployeeFormValues) => {
    const activeWatch = watch("is_active");
    const isActiveStr =
      typeof activeWatch === "boolean"
        ? String(activeWatch)
        : (activeWatch as string | undefined) ?? data.is_active ?? "true";

    const payload = parseSubmitPayload({
      ...data,
      is_active: isActiveStr,
      chat_enabled: Boolean(watch("chat_enabled")),
    });
    if (!isNonEmptyName(payload.name)) {
      showErrorAlert("Please enter a name.");
      return;
    }
    if (!isValidUserEmail(payload.email)) {
      showErrorAlert("Please enter a valid email address.");
      return;
    }
    if (!isValidE164StylePhone(payload.phone)) {
      showErrorAlert("Please enter a valid mobile number (digits after +91).");
      return;
    }
    if (isAdd) {
      const pwErr = validateStrongPassword(data.password ?? "");
      if (pwErr) {
        showErrorAlert(pwErr);
        return;
      }
      if (!passwordsMatch(data.password ?? "", data.confirmPassword ?? "")) {
        showErrorAlert("Password and confirm password do not match.");
        return;
      }
    }
    if (payload.screenPermissionKeys.length === 0) {
      showErrorAlert("Select at least one screen permission.");
      return;
    }

    if (isAdd) {
      const ok = await createFranchiseEmployee({
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        is_active: payload.is_active,
        chat_enabled: payload.chat_enabled,
        screenPermissionKeys: payload.screenPermissionKeys,
        password: data.password.trim(),
      });
      if (ok) {
        showSuccessAlert("Employee added");
        await Promise.resolve(onRefreshData());
        onClose();
      }
      return;
    }

    if (!employee?._id) {
      showErrorAlert("Unable to update. ID is missing.");
      return;
    }

    const ok = await updateFranchiseEmployee(employee._id, payload);
    if (ok) {
      showSuccessAlert("Employee updated");
      await Promise.resolve(onRefreshData());
      onClose();
    }
  };

  const renderViewBody = () => {
    if (!employee) return null;
    const screenPermissionLabels: string[] = employee.accessible_screens?.length
      ? employee.accessible_screens.map((s) => String(s.page ?? "").trim()).filter(Boolean)
      : employee.screenPermissionKeys?.length
        ? employee.screenPermissionKeys.map(
            (k) =>
              franchiseScreenMenuItems.find((i) => i.key === k)?.label ?? k
          )
        : [];
    const chatOn = Boolean(
      employee.is_active && (employee.chat_enabled ?? true)
    );
    return (
      <section
        className="custom-other-details modal-readonly-details"
        style={{ padding: "14px 16px", borderRadius: 12 }}
      >
        <div className="d-flex justify-content-end align-items-center mb-3">
          <i
            className="bi bi-pencil-fill fs-6 text-danger"
            style={{ cursor: "pointer" }}
            role="button"
            aria-label="Edit employee"
            onClick={() => setIsEditing(true)}
          />
        </div>

        <Row className="g-3">
          <Col xs={12} md={6}>
            <FullDetailsRow title="Name" value={employee.name ?? "-"} />
          </Col>
          <Col xs={12} md={6}>
            <FullDetailsRow title="Phone" value={employee.phone ?? "-"} />
          </Col>
          <Col xs={12} md={6}>
            <FullDetailsRow title="Email" value={employee.email ?? "-"} />
          </Col>
          <Col xs={12} md={6}>
            <FullDetailsRow
              title="Chat"
              value={chatOn ? "Enabled" : "Disabled"}
            />
          </Col>
          <Col xs={12} md={6}>
            <FullDetailsRow
              title="Status"
              value={
                <span
                  className={
                    employee.is_active ? "custom-active" : "custom-inactive"
                  }
                >
                  {employee.is_active ? "Active" : "Inactive"}
                </span>
              }
            />
          </Col>
        </Row>

        <Row className="g-3 mt-1">
          <Col xs={12}>
            <p
              className="mb-2 small text-uppercase fw-semibold"
              style={{
                color: "var(--primary-color)",
                letterSpacing: "0.04em",
              }}
            >
              Screen permissions
            </p>
            <div
              style={{
                border: "1px solid var(--txtfld-border)",
                borderRadius: 8,
                padding: "10px 12px",
                background: "var(--bs-body-bg, #fff)",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {screenPermissionLabels.length > 0 ? (
                <ul
                  className="mb-0 ps-3"
                  style={{
                    listStyleType: "disc",
                    color: "var(--content-txt-color)",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  {screenPermissionLabels.map((label, i) => (
                    <li key={`${label}-${i}`} className="text-start mb-1">
                      {label}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted small">—</span>
              )}
            </div>
          </Col>
        </Row>
      </section>
    );
  };

  const renderFormBody = () => (
    <form
      noValidate
      id="franchise-employee-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmitForm)(e);
      }}
    >
      <Row>
        <CustomTextField
          label="Name"
          controlId="name"
          placeholder="Enter Name"
          register={register}
          error={errors.name}
          validation={{
            validate: (v: string) =>
              isNonEmptyName(v) || "Name cannot be empty.",
          }}
          value={watch("name") ?? ""}
          onChange={(v) =>
            setValue("name", v, { shouldDirty: true, shouldValidate: false })
          }
        />
        <CustomTextFieldIndiaMobile
          label="Phone"
          controlId="phone"
          placeholder="Mobile number"
          register={register}
          value={watch("phone") ?? ""}
          onChange={(v) =>
            setValue("phone", v, { shouldDirty: true, shouldValidate: false })
          }
        />
        <CustomTextField
          label="Email"
          controlId="email"
          placeholder="Enter Email"
          register={register}
          error={errors.email}
          validation={{
            validate: (v: string) =>
              isValidUserEmail(v) || "Enter a valid email address.",
          }}
          inputType="email"
          value={watch("email") ?? ""}
          onChange={(v) =>
            setValue("email", v, { shouldDirty: true, shouldValidate: false })
          }
        />
        {isAdd ? (
          <>
            <CustomTextField
              label="Password"
              controlId="password"
              placeholder="Enter Password"
              register={register}
              error={errors.password}
              inputType="password"
              autoComplete="new-password"
              validation={{
                validate: (v: string) =>
                  validateStrongPassword(v) ?? true,
              }}
              value={watch("password") ?? ""}
              onChange={(v) =>
                setValue("password", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <CustomTextField
              label="Confirm password"
              controlId="confirmPassword"
              placeholder="Re-enter password"
              register={register}
              error={errors.confirmPassword}
              inputType="password"
              autoComplete="new-password"
              validation={{
                validate: (v: string) =>
                  passwordsMatch(getValues("password"), v) ||
                  "Passwords do not match.",
              }}
              value={watch("confirmPassword") ?? ""}
              onChange={(v) =>
                setValue("confirmPassword", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </>
        ) : null}
        <Row className="align-items-center mb-3">
          <Col sm={4} className="d-flex align-items-center">
            <label className="custom-profile-lable">Chat</label>
          </Col>
          <Col>
            <Form.Check
              type="switch"
              id="franchise-employee-form-chat"
              className={`franchise-chat-switch franchise-status-switch${
                isActiveBool && chatEnabled ? " franchise-status-switch--on" : ""
              }`}
              checked={isActiveBool ? Boolean(chatEnabled) : false}
              disabled={!isActiveBool}
              aria-label={
                !isActiveBool
                  ? "Chat unavailable when employee is inactive"
                  : chatEnabled
                  ? "Chat on, switch to turn off"
                  : "Chat off, switch to turn on"
              }
              title={
                isActiveBool
                  ? "Chat on / off"
                  : "Inactive employees cannot use chat"
              }
              onChange={(e) => {
                setValue("chat_enabled", e.target.checked, {
                  shouldValidate: true,
                });
              }}
            />
          </Col>
        </Row>
        <CustomTextFieldRadio
          key={`emp-status-${employee?._id ?? "new"}-${isEditing}`}
          label="Status"
          name="is_active"
          options={getStatusOptions()}
          defaultValue={
            isAdd ? "true" : employee ? String(employee.is_active) : "true"
          }
          isEditable
          setValue={setValue}
        />
        <Col xs={12} className="mb-1">
          <div className="staff-permission-section">
            <div className="staff-permission-section__head fw-medium mb-1 mt-3">
              Screen permissions
            </div>
            <div className="staff-permission-section__body">
              <div
                className="d-grid"
                style={{
                  gap: "10px 20px",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                {franchiseScreenMenuItems.map(({ key, label }) => (
                  <Form.Check
                    key={key}
                    type="checkbox"
                    id={`franchise_emp_screen_${key}`}
                    className="custom-checkbox-check"
                    label={<span className="custom-radio-text">{label}</span>}
                    checked={screenPermissionKeys.includes(key)}
                    onChange={() => {
                      setScreenPermissionKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return Array.from(next);
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col xs={12} className="text-center d-flex justify-content-end gap-3">
          <Button type="submit" className="custom-btn-primary">
            {isAdd ? "Add" : "Update"}
          </Button>
          <Button
            type="button"
            className="custom-btn-secondary"
            onClick={() => {
              if (!isAdd && isEditing) {
                setIsEditing(false);
                return;
              }
              onClose();
            }}
          >
            Cancel
          </Button>
        </Col>
      </Row>
    </form>
  );

  return (
    <Modal
      show={true}
      size="lg"
      onHide={onClose}
      centered
      scrollable
      dialogClassName="custom-big-modal"
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          {modalTitle}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        {!isAdd && !isEditing && renderViewBody()}
        {(isAdd || isEditing) && renderFormBody()}
      </Modal.Body>
    </Modal>
  );
};

FranchiseEmployeeDialog.showAdd = (
  onRefreshData: () => void | Promise<void>
) => {
  openDialog("franchise-employee-modal", (close) => (
    <FranchiseEmployeeDialog
      mode="add"
      employee={null}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

FranchiseEmployeeDialog.showView = (
  employee: EmployeeRow,
  onRefreshData: () => void | Promise<void>
) => {
  openDialog("franchise-employee-modal", (close) => (
    <FranchiseEmployeeDialog
      mode="view-edit"
      employee={employee}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default FranchiseEmployeeDialog;
