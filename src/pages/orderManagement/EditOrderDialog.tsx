import React from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { createOrUpdateOrder } from "../../services/orderService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { OrderModel } from "../../models/OrderModel";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";
import { orderPaymentModeSelectOptions } from "../../constant/PaymentEnum";
import { openDialog } from "../../helper/DialogManager";
import { getCustomerPaymentStatusLabel, getPartnerPaymentStatusLabel } from "../../helper/orderDisplayHelpers";

type EditOrderDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderDialog: React.FC<EditOrderDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const paymentStatusLabels = ["Paid", "Unpaid", "Partial"] as const;
    const paymentLabelOptions = paymentStatusLabels.map((l) => ({ value: l, label: l }));

    const { register, handleSubmit, setValue } = useForm<OrderModel & { customer_payment_status: string; partner_payment_status: string }>({
        defaultValues: {
            is_paid: orderDetails.is_paid ?? false,
            payment_mode_id: orderDetails.payment_mode_id ?? "2",
            order_status: orderDetails.order_status,
            customer_payment_status: getCustomerPaymentStatusLabel(orderDetails),
            partner_payment_status: getPartnerPaymentStatusLabel(orderDetails),
        },
    });

    const statuses: { value: string; label: string }[] = Array.from(OrderStatusEnum.entries())
        .filter(([key]) => key !== 5)
        .map(([key, value]) => ({
            value: key.toString(),
            label: value.label,
        }));

    const paymentStatusOptions = orderPaymentModeSelectOptions;

    const onSubmitEvent = async (data: OrderModel & { customer_payment_status: string; partner_payment_status: string }) => {

        const paymentModeId = Number(data.payment_mode_id ?? orderDetails.payment_mode_id ?? 2);
        const isPaidFromStatus = paymentModeId === 1 || paymentModeId === 3; // Paid / Partially paid
        const customerPay = (data.customer_payment_status || "").trim();
        const partnerPay = (data.partner_payment_status || "").trim();
        const is_paid =
            customerPay === "Paid" || (customerPay !== "Unpaid" && isPaidFromStatus);

        const payload = {
            order_status: Number(data.order_status),
            is_paid,
            payment_mode_id: paymentModeId,
            customer_payment_status: customerPay,
            partner_payment_status: partnerPay,
        };

        const responseUser = await createOrUpdateOrder(payload, true, orderDetails._id);

        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Update Order
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="assign-partner-form"
                        id="assign-partner-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row className="g-3">
                            <Col xs={12}>
                                <CustomTextFieldSelect
                                    label="Order Status"
                                    controlId="order_status"
                                    options={statuses}
                                    register={register}
                                    fieldName="order_status"
                                    error="order_status"
                                    requiredMessage="Please select order Status"
                                    defaultValue={orderDetails?.order_status ? String(orderDetails?.order_status) : "1"}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>
                            <Col xs={12}>
                                <CustomTextFieldSelect
                                    label="Customer Payment Status"
                                    controlId="Customer Payment Status"
                                    options={paymentLabelOptions}
                                    register={register}
                                    fieldName="customer_payment_status"
                                    error="customer_payment_status"
                                    requiredMessage="Please select customer payment status"
                                    defaultValue={getCustomerPaymentStatusLabel(orderDetails)}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>
                            <Col xs={12}>
                                <CustomTextFieldSelect
                                    label="Partner Payment Status"
                                    controlId="partner Payment Status"
                                    options={paymentLabelOptions}
                                    register={register}
                                    fieldName="partner_payment_status"
                                    error="partner_payment_status"
                                    requiredMessage="Please select partner payment status"
                                    defaultValue={getPartnerPaymentStatusLabel(orderDetails)}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>
                            {/* <Col xs={12} md={6}>
                                <CustomTextFieldSelect
                                    label="Payment model"
                                    controlId="payment_mode_id"
                                    options={paymentStatusOptions}
                                    register={register}
                                    fieldName="payment_mode_id"
                                    requiredMessage="Please select payment mode"
                                    defaultValue={
                                        orderDetails?.payment_mode_id
                                            ? String(orderDetails.payment_mode_id)
                                            : "2"
                                    }
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col> */}
                        </Row>
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
        </>
    );
};

EditOrderDialog.show = (orderDetails: OrderModel, onRefreshData: () => void) => {
    openDialog("edit-order-modal", (close) => (
        <EditOrderDialog
            orderDetails={orderDetails}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default EditOrderDialog;
