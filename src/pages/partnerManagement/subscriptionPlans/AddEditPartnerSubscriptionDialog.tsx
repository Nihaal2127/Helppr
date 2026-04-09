import React, { useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { DetailsRow, FullDetailsRow } from "../../../helper/utility";
import { openDialog } from "../../../helper/DialogManager";

export type PartnerSubscriptionModel = {
    _id?: string;
    partner_id: string;
    partner_name: string;
    subscription_plan: string;
    subscription_start_date: string;
    subscription_end_date: string;
    rating: string;
    location?: string;
    address?: string;
    is_active: boolean;
};

type AddEditPartnerSubscriptionDialogProps = {
    isEditable: boolean;
    subscription: PartnerSubscriptionModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

type PartnerInfoModel = {
    partner_id: string;
    partner_name: string;
    email: string;
    phone: string;
    location: string;
    joined_date: string;
    status: string;
    description: string;
};

type PartnerInfoDialogProps = {
    partner: PartnerInfoModel;
    onClose: () => void;
};

const subscriptionPlanOptions = [
    { value: "basic", label: "Basic" },
    { value: "silver", label: "Silver" },
    { value: "gold", label: "Gold" },
    { value: "platinum", label: "Platinum" },
];

const locationOptions = [
    { value: "Hyderabad", label: "Hyderabad" },
    { value: "Vijayawada", label: "Vijayawada" },
    { value: "Visakhapatnam", label: "Visakhapatnam" },
    { value: "Warangal", label: "Warangal" },
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

const inputStyle: React.CSSProperties = {
    boxShadow: "none",
    borderRadius: "8px",
    borderColor: "var(--primary-color)",
    fontSize: "14px",
    height: "2.62rem",
    backgroundColor: "var(--bg-color)",
    color: "var(--content-txt-color)",
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    height: "110px",
    resize: "none",
};

const PartnerInfoDialog: React.FC<PartnerInfoDialogProps> & {
    show: (partner: PartnerInfoModel) => void;
} = ({ partner, onClose }) => {
    const statusClass =
        partner.status === "Active"
            ? "text-success fw-semibold text-capitalize"
            : "text-warning fw-semibold text-capitalize";

    return (
        <Modal show={true} onHide={onClose} centered size="lg">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Partner Information
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0">
                <div className="custom-other-details" style={{ padding: "16px" }}>
                    <Row className="align-items-center mb-4">
                        <Col>
                            <h3 className="mb-0" style={{ color: "#000" }}>
                                Partner
                            </h3>
                        </Col>

                        <Col className="text-end">
                            <i
                                className="bi bi-pencil-fill"
                                style={{
                                    cursor: "pointer",
                                    color: "var(--primary-color)",
                                }}
                            />
                        </Col>
                    </Row>

                    <Row className="g-4">     

                        <Col md={6}>
                            <div style={labelStyle}>Partner Name</div>
                            <div style={valueStyle}>{partner.partner_name || "-"}</div>
                        </Col>

                        <Col md={6}>
                            <div style={labelStyle}>Email</div>
                            <div style={valueStyle}>{partner.email || "-"}</div>
                        </Col>

                        <Col md={6}>
                            <div style={labelStyle}>Phone</div>
                            <div style={valueStyle}>{partner.phone || "-"}</div>
                        </Col>

                        <Col md={6}>
                            <div style={labelStyle}>Location</div>
                            <div style={valueStyle}>{partner.location || "-"}</div>
                        </Col>

                        <Col md={6}>
                            <div style={labelStyle}>Joined Date</div>
                            <div style={valueStyle}>{partner.joined_date || "-"}</div>
                        </Col>

                        <Col md={6}>
                            <div style={labelStyle}>Status</div>
                            <div style={valueStyle} className={statusClass}>
                                {partner.status || "-"}
                            </div>
                        </Col>

                        <Col md={12}>
                            <div style={labelStyle}>Description</div>
                            <div style={valueStyle}>{partner.description || "-"}</div>
                        </Col>
                    </Row>
                </div>
            </Modal.Body>
        </Modal>
    );
};

PartnerInfoDialog.show = (partner: PartnerInfoModel) => {
    openDialog("partner-info-dialog", (close) => (
        <PartnerInfoDialog partner={partner} onClose={close} />
    ));
};

const AddEditPartnerSubscriptionDialog: React.FC<AddEditPartnerSubscriptionDialogProps> & {
    show: (
        isEditable: boolean,
        subscription: PartnerSubscriptionModel | null,
        onRefreshData: () => void
    ) => void;
} = ({ isEditable, subscription, onClose, onRefreshData }) => {
    const isStatusOnlyEdit = isEditable && !!subscription;
    const initialData: PartnerSubscriptionModel = useMemo(
        () =>
            subscription || {
                _id: "",
                partner_id: "",
                partner_name: "",
                subscription_plan: "",
                subscription_start_date: "",
                subscription_end_date: "",
                rating: "",
                location: "",
                address: "",
                is_active: undefined as any,
            },
        [subscription]
    );

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
        reset,
    } = useForm<PartnerSubscriptionModel>({
        defaultValues: initialData,
    });

    const [viewData, setViewData] = useState<PartnerSubscriptionModel>(initialData);

    useEffect(() => {
        reset(initialData);
        setViewData(initialData);
    }, [initialData, reset]);

    // const handleEditClick = (): void => {
    //     onClose();
    //     AddEditPartnerSubscriptionDialog.show(true, viewData, onRefreshData);
    // };

    const onSubmitEvent = async (data: PartnerSubscriptionModel) => {
        const updatedData: PartnerSubscriptionModel = {
            ...viewData,
            ...data,
            is_active:
                typeof data.is_active === "string"
                    ? data.is_active === "true"
                    : data.is_active,
        };
        console.log("Submitted Partner Subscription:", updatedData);
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
                    {isEditable
                        ? subscription
                            ? "Edit Partner Subscription"
                            : "Add Partner Subscription"
                        : "Partner Subscription Information"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <div className={isEditable ? "" : "custom-other-details"} style={{ padding: isEditable ? "0px" : "10px" }}>
                  
                        <Row className="align-items-center mb-2">
                            <Col>
                                <h3 className="mb-0">
                                    Partner
                                </h3>
                            </Col>
                            {/* <Col className="text-end">
                                <i
                                    className="bi bi-pencil-fill fs-6 text-danger"
                                    onClick={handleEditClick}
                                    style={{
                                        cursor: "pointer",
                                    }}
                                />
                            </Col> */}
                        </Row>
           

                    {!isEditable ? (
                        <Form noValidate id="partner-subscription-status-form" onSubmit={handleSubmit(onSubmitEvent)}>
                            <Row>
                                <Col md={6} className="custom-helper-column">
                                    <DetailsRow title="Partner Name" value={viewData.partner_name || "-"} />
                                    <DetailsRow title="Subscription Plan" value={viewData.subscription_plan || "-"} />
                                    <DetailsRow title="Start Date" value={viewData.subscription_start_date || "-"} />
                                </Col>
                                <Col md={6} className="custom-helper-column">
                                    <DetailsRow title="End Date" value={viewData.subscription_end_date || "-"} />
                                    <FullDetailsRow title="Address" value={viewData.address || viewData.location || "-"} />
                                    <div className="mb-2">
                                        <div className="fw-medium mb-1">Status</div>
                                        <div className="d-flex" style={{ flexDirection: "row", gap: "8px" }}>
                                            <Form.Check
                                                type="radio"
                                                id="partner_subscription_info_status_active"
                                                label={<span className="custom-radio-text">Active</span>}
                                                value="true"
                                                checked={!!viewData.is_active}
                                                onChange={() => {
                                                    setValue("is_active", true as any, { shouldValidate: true });
                                                    setViewData((prev) => ({ ...prev, is_active: true }));
                                                }}
                                                className="custom-radio-check"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="partner_subscription_info_status_inactive"
                                                label={<span className="custom-radio-text">Inactive</span>}
                                                value="false"
                                                checked={!viewData.is_active}
                                                onChange={() => {
                                                    setValue("is_active", false as any, { shouldValidate: true });
                                                    setViewData((prev) => ({ ...prev, is_active: false }));
                                                }}
                                                className="custom-radio-check"
                                            />
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Form>
                    ) : (
                        <Form noValidate id="partner-subscription-form" onSubmit={handleSubmit(onSubmitEvent)}>
                            <Row className="gx-3 gy-2">

                                <Col md={6}>
                                    {isStatusOnlyEdit ? (
                                        <CustomFormInput
                                            label="Partner Name"
                                            controlId="partner_name"
                                            placeholder="Partner Name"
                                            register={register}
                                            error={errors.partner_name}
                                            asCol={false}
                                            value={viewData.partner_name || ""}
                                            isEditable={false}
                                        />
                                    ) : (
                                        <CustomFormInput
                                            label="Partner Name"
                                            controlId="partner_name"
                                            placeholder="Enter Partner Name"
                                            register={register}
                                            error={errors.partner_name}
                                            asCol={false}
                                            validation={{ required: "Partner name is required" }}
                                        />
                                    )}
                                </Col>

                                <Col md={6}>
                                    {isStatusOnlyEdit ? (
                                        <CustomFormInput
                                            label="Subscription Plan"
                                            controlId="subscription_plan"
                                            placeholder="Subscription Plan"
                                            register={register}
                                            error={errors.subscription_plan}
                                            asCol={false}
                                            value={viewData.subscription_plan || ""}
                                            isEditable={false}
                                        />
                                    ) : (
                                        <CustomFormSelect
                                            label="Subscription Plan"
                                            controlId="subscription_plan"
                                            options={subscriptionPlanOptions}
                                            register={register as unknown as UseFormRegister<any>}
                                            fieldName="subscription_plan"
                                            error={errors.subscription_plan as any}
                                            asCol={false}
                                            requiredMessage="Please select subscription plan"
                                            defaultValue={viewData.subscription_plan || ""}
                                            setValue={(name: string, value: any) =>
                                                setValue(name as keyof PartnerSubscriptionModel, value)
                                            }
                                        />
                                    )}
                                </Col>

                                <Col md={6}>
                                    <Form.Label className="fw-semibold">Subscription Start Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        {...register("subscription_start_date", {
                                            required: "Subscription start date is required",
                                        })}
                                        style={inputStyle}
                                        disabled={isStatusOnlyEdit}
                                    />
                                    {errors.subscription_start_date && (
                                        <small className="text-danger">
                                            {errors.subscription_start_date.message}
                                        </small>
                                    )}
                                </Col>

                                <Col md={6}>
                                    <Form.Label className="fw-semibold">Subscription End Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        {...register("subscription_end_date", {
                                            required: "Subscription end date is required",
                                        })}
                                        style={inputStyle}
                                        disabled={isStatusOnlyEdit}
                                    />
                                    {errors.subscription_end_date && (
                                        <small className="text-danger">
                                            {errors.subscription_end_date.message}
                                        </small>
                                    )}
                                </Col>
 
                                <Col md={6}>
                                    {isStatusOnlyEdit ? (
                                        <CustomFormInput
                                            label="Address"
                                            controlId="address"
                                            placeholder="Address"
                                            register={register}
                                            error={errors.address}
                                            asCol={false}
                                            value={viewData.address || viewData.location || ""}
                                            isEditable={false}
                                        />
                                    ) : (
                                        <CustomFormSelect
                                            label="Address"
                                            controlId="location"
                                            options={locationOptions}
                                            register={register as unknown as UseFormRegister<any>}
                                            fieldName="location"
                                            error={errors.location as any}
                                            asCol={false}
                                            requiredMessage="Please select address"
                                            defaultValue={viewData.location || ""}
                                            setValue={(name: string, value: any) =>
                                                setValue(name as keyof PartnerSubscriptionModel, value)
                                            }
                                        />
                                    )}
                                </Col>
                                
                                <Col md={12}>
                                    <Form.Group style={{ marginTop: "10px" }}>
                                        <Form.Label className="fw-medium mb-1">Status</Form.Label>
                                        <div className="d-flex" style={{ flexDirection: "row", gap: "8px" }}>
                                        <Form.Check
                                                type="radio"
                                                id="partner_subscription_status_active"
                                                label={<span className="custom-radio-text">Active</span>}
                                                value="true"
                                                checked={!!viewData.is_active}
                                                onChange={() => {
                                                    setValue("is_active", true as any, { shouldValidate: true });
                                                    setViewData((prev) => ({ ...prev, is_active: true }));
                                                }}
                                                className="custom-radio-check"
                                            />
                                            <Form.Check
                                                type="radio"
                                                id="partner_subscription_status_inactive"
                                                label={<span className="custom-radio-text">Inactive</span>}
                                                value="false"
                                                checked={!viewData.is_active}
                                                onChange={() => {
                                                    setValue("is_active", false as any, { shouldValidate: true });
                                                    setViewData((prev) => ({ ...prev, is_active: false }));
                                                }}
                                                className="custom-radio-check"
                                            />
                                            
                                        </div>
                                    </Form.Group>
                                </Col>

                                
                            </Row>
                        </Form>
                    )}
                </div>
            </Modal.Body>
            {(isEditable || !isEditable) && (
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="btn-danger"
                        type="submit"
                        form={isEditable ? "partner-subscription-form" : "partner-subscription-status-form"}
                    >
                        {isEditable ? (subscription ? "Update" : "Save") : "Update Status"}
                    </Button>
                </Modal.Footer>
            )}
        </Modal>
    );
};

AddEditPartnerSubscriptionDialog.show = (
    isEditable: boolean,
    subscription: PartnerSubscriptionModel | null,
    onRefreshData: () => void
) => {
    openDialog("details-modal", (close) => (
        <AddEditPartnerSubscriptionDialog
            isEditable={isEditable}
            subscription={subscription}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditPartnerSubscriptionDialog;