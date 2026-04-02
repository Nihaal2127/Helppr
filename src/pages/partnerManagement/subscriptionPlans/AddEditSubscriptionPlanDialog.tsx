import React, { useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { capitalizeString } from "../../../helper/utility";
import { openDialog } from "../../../helper/DialogManager";

export type SubscriptionPlanModel = {
  _id: string;
  plan_name: string;
  plan_description: string;
  price: string;
  duration: string;
  duration_type: string;
  is_active: boolean;
};

type AddEditSubscriptionPlanDialogProps = {
  isEditable: boolean;
  plan: SubscriptionPlanModel | null;
  onClose: () => void;
  onRefreshData: () => void;
};

const planOptions = [
  { value: "basic", label: "Basic" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const durationTypeOptions = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
];

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#2b2b2b",
  fontSize: "15px",
  marginBottom: "6px",
};

const valueStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "15px",
  lineHeight: "22px",
  wordBreak: "break-word",
};

const AddEditSubscriptionPlanDialog: React.FC<AddEditSubscriptionPlanDialogProps> & {
  show: (
    isEditable: boolean,
    plan: SubscriptionPlanModel | null,
    onRefreshData: () => void
  ) => void;
} = ({ isEditable, plan, onClose, onRefreshData }) => {
  const initialData: SubscriptionPlanModel = useMemo(
    () =>
      plan || {
        _id: "PLAN001",
        plan_name: "gold",
        plan_description: "Premium subscription plan with advanced features.",
        price: "4999",
        duration: "6",
        duration_type: "months",
        is_active: true,
      },
    [plan]
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SubscriptionPlanModel>({
    defaultValues: initialData,
  });

  const [viewData, setViewData] = useState<SubscriptionPlanModel>(initialData);

  useEffect(() => {
    reset(initialData);
    setViewData(initialData);
  }, [initialData, reset]);

  const handleEditClick = (): void => {
    onClose();
    AddEditSubscriptionPlanDialog.show(true, viewData, onRefreshData);
  };

  const onSubmitEvent = async (data: SubscriptionPlanModel) => {
    const updatedData: SubscriptionPlanModel = {
      ...data,
      is_active:
        typeof data.is_active === "string"
          ? data.is_active === "true"
          : data.is_active,
    };

    console.log("Submitted Plan Data:", updatedData);
    setViewData(updatedData);
    onClose();
    onRefreshData();
  };

  const statusClass = viewData.is_active
    ? "text-success fw-semibold text-capitalize"
    : "text-warning fw-semibold text-capitalize";

  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Subscription Plan Information
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>

      <Modal.Body className="px-4 pb-4 pt-0">
        <div className="custom-other-details" style={{ padding: "16px" }}>
          <Row className="align-items-center mb-4">
            <Col>
              <h3 className="mb-0" style={{ color: "#000" }}>
                Plan
              </h3>
            </Col>

            <Col className="text-end">
              {!isEditable && (
                <i
                  className="bi bi-pencil-fill"
                  onClick={handleEditClick}
                  style={{
                    cursor: "pointer",
                    color: "var(--primary-color)",
                  }}
                />
              )}
            </Col>
          </Row>

          {!isEditable ? (
            <Row className="g-4">
              <Col md={6}>
                <div style={labelStyle}>Plan ID</div>
                <div style={valueStyle}>{viewData._id || "-"}</div>
              </Col>

              <Col md={6}>
                <div style={labelStyle}>Plan Name</div>
                <div style={valueStyle}>{capitalizeString(viewData.plan_name) || "-"}</div>
              </Col>

              <Col md={6}>
                <div style={labelStyle}>Price</div>
                <div style={valueStyle}>{viewData.price || "-"}</div>
              </Col>

              <Col md={6}>
                <div style={labelStyle}>Duration</div>
                <div style={valueStyle}>{viewData.duration || "-"}</div>
              </Col>

              <Col md={6}>
                <div style={labelStyle}>Duration Type</div>
                <div style={valueStyle}>
                  {capitalizeString(viewData.duration_type) || "-"}
                </div>
              </Col>

              <Col md={6}>
                <div style={labelStyle}>Status</div>
                <div style={valueStyle} className={statusClass}>
                  {viewData.is_active ? "Active" : "Inactive"}
                </div>
              </Col>

              <Col md={12}>
                <div style={labelStyle}>Plan Description</div>
                <div style={valueStyle}>{viewData.plan_description || "-"}</div>
              </Col>
            </Row>
          ) : (
            <Form noValidate id="subscription-plan-form" onSubmit={handleSubmit(onSubmitEvent)}>
              <Row className="g-3">
                <Col md={6}>
                  <CustomFormInput
                    label="Plan ID"
                    controlId="_id"
                    placeholder="Enter Plan ID"
                    register={register}
                    error={errors._id}
                    asCol={false}
                    validation={{ required: "Plan ID is required" }}
                  />
                </Col>

                <Col md={6}>
                  <CustomFormSelect
                    label="Plan Name"
                    controlId="plan_name"
                    options={planOptions}
                    register={register as unknown as UseFormRegister<any>}
                    fieldName="plan_name"
                    error={errors.plan_name as any}
                    asCol={false}
                    requiredMessage="Please select plan"
                    defaultValue={viewData.plan_name || ""}
                    setValue={(name: string, value: any) =>
                      setValue(name as keyof SubscriptionPlanModel, value)
                    }
                  />
                </Col>

                <Col md={6}>
                  <CustomFormInput
                    label="Price"
                    controlId="price"
                    placeholder="Enter Price"
                    register={register}
                    error={errors.price}
                    asCol={false}
                    validation={{ required: "Price is required" }}
                  />
                </Col>

                <Col md={6}>
                  <CustomFormInput
                    label="Duration"
                    controlId="duration"
                    placeholder="Enter Duration"
                    register={register}
                    error={errors.duration}
                    asCol={false}
                    validation={{ required: "Duration is required" }}
                  />
                </Col>

                <Col md={6}>
                  <CustomFormSelect
                    label="Duration Type"
                    controlId="duration_type"
                    options={durationTypeOptions}
                    register={register as unknown as UseFormRegister<any>}
                    fieldName="duration_type"
                    error={errors.duration_type as any}
                    asCol={false}
                    requiredMessage="Please select duration type"
                    defaultValue={viewData.duration_type || ""}
                    setValue={(name: string, value: any) =>
                      setValue(name as keyof SubscriptionPlanModel, value)
                    }
                  />
                </Col>

                <Col md={6}>
                  <CustomFormSelect
                    label="Status"
                    controlId="is_active"
                    options={statusOptions}
                    register={register as unknown as UseFormRegister<any>}
                    fieldName="is_active"
                    error={errors.is_active as any}
                    asCol={false}
                    requiredMessage="Please select status"
                    defaultValue={viewData.is_active ? "true" : "false"}
                    setValue={(name: string, value: any) =>
                      setValue(
                        name as keyof SubscriptionPlanModel,
                        (value === "true") as any
                      )
                    }
                  />
                </Col>

                <Col md={12}>
                  <CustomFormInput
                    label="Plan Description"
                    controlId="plan_description"
                    placeholder="Enter Plan Description"
                    register={register}
                    error={errors.plan_description}
                    asCol={false}
                    validation={{ required: "Plan description is required" }}
                    as="textarea"
                    rows={3}
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="light" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  style={{
                    backgroundColor: "var(--primary-color)",
                    borderColor: "var(--primary-color)",
                  }}
                >
                  Update
                </Button>
              </div>
            </Form>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

AddEditSubscriptionPlanDialog.show = (
  isEditable: boolean,
  plan: SubscriptionPlanModel | null,
  onRefreshData: () => void
) => {
  openDialog("details-modal", (close) => (
    <AddEditSubscriptionPlanDialog
      isEditable={isEditable}
      plan={plan}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default AddEditSubscriptionPlanDialog;