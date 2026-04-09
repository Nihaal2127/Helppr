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

type EditOrderDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderDialog: React.FC<EditOrderDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const { register, handleSubmit, setValue } = useForm<OrderModel>({
        defaultValues: {
            is_paid: orderDetails.is_paid ?? false,
            payment_mode_id: orderDetails.payment_mode_id ?? "2",
        },
    });

    const statuses: { value: string; label: string }[] = Array.from(OrderStatusEnum.entries())
        .map(([key, value]) => ({
            value: key.toString(),
            label: value.label,
        }));

    const paymentStatusOptions = orderPaymentModeSelectOptions;

    const onSubmitEvent = async (data: OrderModel) => {

        const paymentModeId = Number(data.payment_mode_id ?? orderDetails.payment_mode_id ?? 2);
        const isPaidFromStatus = paymentModeId === 1 || paymentModeId === 3; // Paid / Partially paid

        const payload = {
            order_status: Number(data.order_status),
            is_paid: isPaidFromStatus,
            payment_mode_id: paymentModeId,
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
                        <Row>
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
                            <CustomTextFieldSelect
                                label="Payment Status"
                                controlId="payment_status"
                                options={paymentStatusOptions}
                                register={register}
                                fieldName="payment_mode_id"
                                requiredMessage="Please select payment status"
                                defaultValue={
                                    orderDetails?.payment_mode_id
                                        ? String(orderDetails.payment_mode_id)
                                        : "2"
                                }
                                setValue={setValue as (name: string, value: any) => void}
                            />
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
