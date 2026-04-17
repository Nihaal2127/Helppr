import React, { useEffect, useState } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";
import { DetailsRow, getStatusOptions } from "../../helper/utility";
import { openDialog } from "../../helper/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import type { EmployeeRow } from "../../services/myFranchiseService";
import { createFranchiseEmployee, updateFranchiseEmployee } from "../../services/myFranchiseService";

type EmployeeFormValues = {
  name: string;
  phone: string;
  email: string;
  is_active: string;
  chat_enabled: boolean;
};

type FranchiseEmployeeDialogProps = {
  onClose: () => void;
  onRefreshData: () => void;
} & (
  | { mode: "add"; employee: null }
  | { mode: "view-edit"; employee: EmployeeRow }
);

const FranchiseEmployeeDialog: React.FC<FranchiseEmployeeDialogProps> & {
  showAdd: (onRefreshData: () => void) => void;
  showView: (employee: EmployeeRow, onRefreshData: () => void) => void;
} = (props) => {
  const { onClose, onRefreshData } = props;
  const isAdd = props.mode === "add";
  const employee = isAdd ? null : props.employee;

  const [isEditing, setIsEditing] = useState(isAdd);

  useEffect(() => {
    setIsEditing(isAdd);
  }, [isAdd, employee?._id]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      is_active: "true",
      chat_enabled: true,
    },
  });

  const isActiveStr = watch("is_active");
  const isActiveBool = String(isActiveStr ?? "") === "true";
  const chatEnabled = watch("chat_enabled");

  useEffect(() => {
    if (isAdd) {
      reset({
        name: "",
        phone: "",
        email: "",
        is_active: "true",
        chat_enabled: true,
      });
      return;
    }
    if (employee && isEditing) {
      reset({
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        is_active: String(employee.is_active),
        chat_enabled: Boolean(employee.is_active && (employee.chat_enabled ?? true)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use employee?._id so parent re-fetch (new object ref) does not reset the form mid-edit; fields match that id
  }, [isAdd, employee?._id, isEditing, reset]);

  const modalTitle = isAdd
    ? "Add Employee"
    : isEditing
      ? "Edit Employee"
      : "Employee Information";

  const parseSubmitPayload = (data: EmployeeFormValues) => {
    const is_active = String(data.is_active ?? "") === "true";
    const chat_enabled = is_active ? Boolean(data.chat_enabled) : false;
    return {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      is_active,
      chat_enabled,
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
    if (!payload.name) {
      showErrorAlert("Name is required");
      return;
    }
    if (!payload.email) {
      showErrorAlert("Email is required");
      return;
    }
    if (!payload.phone) {
      showErrorAlert("Phone is required");
      return;
    }

    if (isAdd) {
      const ok = await createFranchiseEmployee(payload);
      if (ok) {
        showSuccessAlert("Employee added");
        onRefreshData();
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
      onRefreshData();
      onClose();
    }
  };

  const renderViewBody = () => {
    if (!employee) return null;
    const chatOn = Boolean(employee.is_active && (employee.chat_enabled ?? true));
    return (
      <section className="custom-other-details" style={{ padding: "10px" }}>
        <Row className="d-flex justify-content-between align-items-center mb-2">
          <Col>
            <h3 className="mb-0">Employee Details</h3>
          </Col>
          <Col className="text-end">
            <i
              className="bi bi-pencil-fill fs-6 text-danger"
              style={{ cursor: "pointer" }}
              onClick={() => setIsEditing(true)}
            />
          </Col>
        </Row>
        <div className="row">
          <div className="col-md-12 custom-helper-column">
            <DetailsRow title="Name" value={employee.name} />
            <DetailsRow title="Phone" value={employee.phone} />
            <DetailsRow title="Email" value={employee.email} />
            <DetailsRow title="Chat" value={chatOn ? "Enabled" : "Disabled"} />
            <Row className="row custom-personal-row">
              <label className="col custom-personal-row-title">Status</label>
              <label className="col custom-personal-row-value text-truncate">
                <span className={employee.is_active ? "custom-active" : "custom-inactive"}>
                  {employee.is_active ? "Active" : "Inactive"}
                </span>
              </label>
            </Row>
          </div>
        </div>
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
          validation={{ required: "Name is required" }}
        />
        <CustomTextField
          label="Phone"
          controlId="phone"
          placeholder="Enter Phone"
          register={register}
          error={errors.phone}
          validation={{ required: "Phone is required" }}
        />
        <CustomTextField
          label="Email"
          controlId="email"
          placeholder="Enter Email"
          register={register}
          error={errors.email}
          validation={{ required: "Email is required" }}
          inputType="email"
        />
        <Row className="align-items-center mb-3">
          <Col sm={4} className="d-flex align-items-center">
            <label className="custom-profile-lable">Chat</label>
          </Col>
          <Col>
            <Form.Check
              type="switch"
              id="franchise-employee-form-chat"
              className="franchise-chat-switch"
              checked={isActiveBool ? Boolean(chatEnabled) : false}
              disabled={!isActiveBool}
              title={isActiveBool ? "Chat on / off" : "Inactive employees cannot use chat"}
              onChange={(e) => {
                setValue("chat_enabled", e.target.checked, { shouldValidate: true });
              }}
            />
          </Col>
        </Row>
        <CustomTextFieldRadio
          key={`emp-status-${employee?._id ?? "new"}-${isEditing}`}
          label="Status"
          name="is_active"
          options={getStatusOptions()}
          defaultValue={isAdd ? "true" : employee ? String(employee.is_active) : "true"}
          isEditable
          setValue={setValue}
        />
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
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
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

FranchiseEmployeeDialog.showAdd = (onRefreshData: () => void) => {
  openDialog("franchise-employee-modal", (close) => (
    <FranchiseEmployeeDialog mode="add" employee={null} onClose={close} onRefreshData={onRefreshData} />
  ));
};

FranchiseEmployeeDialog.showView = (employee: EmployeeRow, onRefreshData: () => void) => {
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
