import React, { useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { CustomFormInput } from "../../../components/CustomFormInput";
import { CustomRadioSelection } from "../../../components/CustomRadioSelection";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { openDialog } from "../../../helper/DialogManager";

export type PartnerSubscriptionModel = {
    _id?: string;
    partner_id: string;
    partner_name: string;
    subscription_plan: string;
    subscription_start_date: string;
    subscription_end_date: string;
    rating: string;
    location: string;
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

const statusOptions = [
    { label: "Active", value: "true" },
    { label: "Inactive", value: "false" },
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
                            <div style={labelStyle}>Partner ID</div>
                            <div style={valueStyle}>{partner.partner_id || "-"}</div>
                        </Col>

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
    const initialData: PartnerSubscriptionModel = useMemo(
        () =>
            subscription || {
                _id: "1",
                partner_id: "P001",
                partner_name: "Rahul",
                subscription_plan: "gold",
                subscription_start_date: "2026-03-20",
                subscription_end_date: "2026-09-20",
                rating: "4.5",
                location: "Hyderabad",
                is_active: true,
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

    const handleEditClick = (): void => {
        onClose();
        AddEditPartnerSubscriptionDialog.show(true, viewData, onRefreshData);
    };

    const onSubmitEvent = async (data: PartnerSubscriptionModel) => {
        console.log("Submitted Partner Subscription:", data);
        setViewData(data);
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
                    Partner Subscription Information
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
                                <div style={labelStyle}>Partner ID</div>
                                <div style={valueStyle}>{viewData.partner_id || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Partner Name</div>
                                <div style={valueStyle}>{viewData.partner_name || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Subscription Plan</div>
                                <div style={valueStyle}>{viewData.subscription_plan || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Subscription Start Date</div>
                                <div style={valueStyle}>{viewData.subscription_start_date || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Subscription End Date</div>
                                <div style={valueStyle}>{viewData.subscription_end_date || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Rating</div>
                                <div style={valueStyle}>{viewData.rating || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Location</div>
                                <div style={valueStyle}>{viewData.location || "-"}</div>
                            </Col>

                            <Col md={6}>
                                <div style={labelStyle}>Status</div>
                                <div style={valueStyle} className={statusClass}>
                                    {viewData.is_active ? "Active" : "Inactive"}
                                </div>
                            </Col>
                        </Row>
                    ) : (
                        <Form noValidate id="partner-subscription-form" onSubmit={handleSubmit(onSubmitEvent)}>
                            <Row className="g-3">
                                <Col md={6}>
                                    <CustomFormInput
                                        label="Partner ID"
                                        controlId="partner_id"
                                        placeholder="Enter Partner ID"
                                        register={register}
                                        error={errors.partner_id}
                                        asCol={false}
                                        validation={{ required: "Partner ID is required" }}
                                    />
                                </Col>

                                <Col md={6}>
                                    <CustomFormInput
                                        label="Partner Name"
                                        controlId="partner_name"
                                        placeholder="Enter Partner Name"
                                        register={register}
                                        error={errors.partner_name}
                                        asCol={false}
                                        validation={{ required: "Partner name is required" }}
                                    />
                                </Col>

                                <Col md={6}>
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
                                </Col>

                                <Col md={6}>
                                    <Form.Label className="fw-semibold">Subscription Start Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        {...register("subscription_start_date", {
                                            required: "Subscription start date is required",
                                        })}
                                        style={inputStyle}
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
                                    />
                                    {errors.subscription_end_date && (
                                        <small className="text-danger">
                                            {errors.subscription_end_date.message}
                                        </small>
                                    )}
                                </Col>

                                <Col md={6}>
                                    <CustomFormInput
                                        label="Rating"
                                        controlId="rating"
                                        placeholder="Enter Rating"
                                        register={register}
                                        error={errors.rating}
                                        asCol={false}
                                        validation={{ required: "Rating is required" }}
                                    />
                                </Col>

                                <Col md={6}>
                                    <CustomFormSelect
                                        label="Location"
                                        controlId="location"
                                        options={locationOptions}
                                        register={register as unknown as UseFormRegister<any>}
                                        fieldName="location"
                                        error={errors.location as any}
                                        asCol={false}
                                        requiredMessage="Please select location"
                                        defaultValue={viewData.location || ""}
                                        setValue={(name: string, value: any) =>
                                            setValue(name as keyof PartnerSubscriptionModel, value)
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
                                            setValue(name as any, value === "true")
                                        }
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