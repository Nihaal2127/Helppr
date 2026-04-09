import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import { openDialog } from "../../helper/DialogManager";
import { createOrUpdateOrder } from "../../services/orderService";
import { OrderModel } from "../../models/OrderModel";
import { orderPaymentModeSelectOptions } from "../../constant/PaymentEnum";

type EditOrderPaymentDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

type EditOrderPaymentForm = {
    total_price: number | string;
    payment_mode_id: string;
    order_date_user: string;
    order_date_partner: string;
    comments_user: string;
    comments_partner: string;
    sub_total: number | string;
    paid_total_price: number | string;
    paid_sub_total: number | string;
};

const EditOrderPaymentDialog: React.FC<EditOrderPaymentDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const defaultTotalPrice = Number(orderDetails.total_price ?? 0);
    const defaultSubTotal = Number(orderDetails.sub_total ?? 0);

    const defaultPaidTotal = orderDetails.is_paid ? defaultTotalPrice : 0;
    const defaultPaidSub = orderDetails.is_paid ? defaultSubTotal : 0;

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<EditOrderPaymentForm>({
        defaultValues: {
            total_price: defaultTotalPrice,
            payment_mode_id: orderDetails.payment_mode_id ? String(orderDetails.payment_mode_id) : "1",
            order_date_user: orderDetails.order_date ?? "",
            order_date_partner: orderDetails.order_date ?? "",
            comments_user: orderDetails.comment ?? "",
            comments_partner: orderDetails.comment ?? "",
            sub_total: defaultSubTotal,
            paid_total_price: defaultPaidTotal,
            paid_sub_total: defaultPaidSub,
        },
    });

    const [totalPriceState, setTotalPriceState] = useState<number>(defaultTotalPrice);
    const [paidTotalState, setPaidTotalState] = useState<number>(defaultPaidTotal);
    const [subTotalState, setSubTotalState] = useState<number>(defaultSubTotal);
    const [paidSubState, setPaidSubState] = useState<number>(defaultPaidSub);
    const [orderDateUserState, setOrderDateUserState] = useState<string | null>(orderDetails.order_date ?? null);
    const [orderDatePartnerState, setOrderDatePartnerState] = useState<string | null>(orderDetails.order_date ?? null);

    const balanceTotalState = useMemo(() => Math.max(0, totalPriceState - paidTotalState), [totalPriceState, paidTotalState]);
    const balanceSubState = useMemo(() => Math.max(0, subTotalState - paidSubState), [subTotalState, paidSubState]);

    const paymentOptions = useMemo<{ value: string; label: string }[]>(
        () => orderPaymentModeSelectOptions,
        []
    );

    const onSubmitEvent = async (data: EditOrderPaymentForm) => {
        const totalPriceNum = Number(data.total_price ?? 0);
        const subTotalNum = Number(data.sub_total ?? 0);
        const paidTotalNum = Number(data.paid_total_price ?? 0);
        const paidSubNum = Number(data.paid_sub_total ?? 0);

        // This app currently stores payment status as a boolean (`is_paid`), so we normalize paid amounts:
        // - if paid >= total => fully paid
        // - otherwise => unpaid
        const normalizedPaidTotal = paidTotalNum >= totalPriceNum ? totalPriceNum : 0;
        const normalizedPaidSub = paidSubNum >= subTotalNum ? subTotalNum : 0;
        const is_paid = normalizedPaidTotal > 0 && normalizedPaidSub > 0;

        const payload = {
            order_status: orderDetails.order_status,
            is_paid,
            payment_mode_id: Number(data.payment_mode_id),
            order_date: data.order_date_user ?? data.order_date_partner,
            total_price: totalPriceNum,
            sub_total: subTotalNum,
            // Backend naming used in CreateUpdateOrderDialog
            comments: data.comments_user,
        };

        const responseUser = await createOrUpdateOrder(payload, true, orderDetails._id);
        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Edit Payment
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <form noValidate name="edit-order-payment-form" id="edit-order-payment-form" onSubmit={handleSubmit(onSubmitEvent)}>
                    <Col>
                        <Col xs={12}>
                            <h3 className="mb-0">User</h3>

                            <CustomTextField
                                label="Amount"
                                controlId="total_price"
                                placeholder="Enter amount"
                                register={register}
                                error={errors.total_price}
                                validation={{ required: "Amount is required" }}
                                inputType="number"
                                onChange={(val) => {
                                    const n = Number(val ?? 0);
                                    const safe = Number.isFinite(n) ? n : 0;
                                    setTotalPriceState(safe);
                                    setValue("total_price", safe);
                                }}
                            />

                            <CustomTextFieldSelect
                                label="Type"
                                controlId="payment_mode_id"
                                options={paymentOptions}
                                register={register}
                                fieldName="payment_mode_id"
                                error={errors.payment_mode_id}
                                requiredMessage="Please select type"
                                defaultValue={orderDetails.payment_mode_id ? String(orderDetails.payment_mode_id) : "1"}
                                setValue={setValue as (name: string, value: any) => void}
                            />

                            <CustomTextFieldDatePicket
                                label="Date"
                                controlId="order_date_user"
                                selectedDate={orderDateUserState}
                                onChange={(date) => {
                                    const iso = date?.toISOString() || "";
                                    setOrderDateUserState(iso);
                                    setOrderDatePartnerState(iso);
                                    setValue("order_date_user", iso);
                                    setValue("order_date_partner", iso);
                                }}
                                placeholderText="Select date"
                                error={errors.order_date_user}
                                register={register}
                                validation={{ required: "Date is required" }}
                                setValue={setValue}
                            />

                            <CustomTextField
                                label="Description"
                                controlId="comments_user"
                                placeholder="Enter description"
                                register={register}
                                error={errors.comments_user}
                                validation={{ required: "Description is required" }}
                                as="textarea"
                                rows={4}
                                onChange={(val) => {
                                    setValue("comments_user", val);
                                  
                                }}
                            />

                            <div className="mt-3">
                                <CustomTextField
                                    label="paid"
                                    controlId="paid_total_price"
                                    placeholder="Enter paid amount"
                                    register={register}
                                    error={errors.paid_total_price}
                                    validation={{ required: "Paid amount is required" }}
                                    inputType="number"
                                onChange={(val) => {
                                    const n = Number(val ?? 0);
                                    const safe = Number.isFinite(n) ? n : 0;
                                    setPaidTotalState(safe);
                                    setValue("paid_total_price", safe);
                                }}
                                />

                                <div className="d-flex align-items-center" style={{ gap: "6.5rem"}}>
                                    <label className="custom-profile-lable">Balance</label>
                                    <input
                                        type="number"
                                        className="form-control custom-form-input"
                                        value={balanceTotalState}
                                        disabled
                                    />
                                </div>
                            </div>
                        </Col>

                        <Col xs={12} className="mt-4">
                            <h3 className="mb-0">Partner</h3>

                            <CustomTextField
                                label="Amount"
                                controlId="sub_total"
                                placeholder="Enter amount"
                                register={register}
                                error={errors.sub_total}
                                validation={{ required: "Amount is required" }}
                                inputType="number"
                                onChange={(val) => {
                                    const n = Number(val ?? 0);
                                    const safe = Number.isFinite(n) ? n : 0;
                                    setSubTotalState(safe);
                                    setValue("sub_total", safe);
                                }}
                            />

                            <CustomTextFieldDatePicket
                                label="Date"
                                controlId="order_date_partner"
                                selectedDate={orderDatePartnerState}
                                onChange={(date) => {
                                    const iso = date?.toISOString() || "";
                                    setOrderDatePartnerState(iso);
                                    setOrderDateUserState(iso);
                                    setValue("order_date_partner", iso);
                                    setValue("order_date_user", iso);
                                }}
                                placeholderText="Select date"
                                error={errors.order_date_partner}
                                register={register}
                                validation={{ required: "Date is required" }}
                                setValue={setValue}
                            />

                            <CustomTextField
                                label="Description"
                                controlId="comments_partner"
                                placeholder="Enter description"
                                register={register}
                                error={errors.comments_partner}
                                validation={{ required: "Description is required" }}
                                as="textarea"
                                rows={4}
                                onChange={(val) => {
                                    setValue("comments_partner", val);
                                }}
                            />

                            <div className="mt-3">
                                <CustomTextField
                                    label="paid amount"
                                    controlId="paid_sub_total"
                                    placeholder="Enter paid amount"
                                    register={register}
                                    error={errors.paid_sub_total}
                                    validation={{ required: "Paid amount is required" }}
                                    inputType="number"
                                onChange={(val) => {
                                    const n = Number(val ?? 0);
                                    const safe = Number.isFinite(n) ? n : 0;
                                    setPaidSubState(safe);
                                    setValue("paid_sub_total", safe);
                                }}
                                />

                                <div className="d-flex align-items-center" style={{ gap: "6.5rem"}}>
                                    <label className="custom-profile-lable">Balance</label>
                                    <input
                                        type="number"
                                        className="form-control custom-form-input"
                                        value={balanceSubState}
                                        disabled
                                    />
                                </div>
                            </div>
                        </Col>
                    </Col>

                    <Row className="mt-4">
                        <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                            <Button type="submit" className="custom-btn-primary">
                                Update
                            </Button>
                            <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

EditOrderPaymentDialog.show = (orderDetails: OrderModel, onRefreshData: () => void) => {
    openDialog("edit-order-payment-modal", (close) => (
        <EditOrderPaymentDialog orderDetails={orderDetails} onClose={close} onRefreshData={onRefreshData} />
    ));
};

export default EditOrderPaymentDialog;

