import React from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { createOrUpdateOrder } from "../../services/orderService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { OrderModel } from "../../models/OrderModel";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";
import CustomTextFieldSwitch from "../../components/CustomTextFieldSwitch";

type EditOrderDialogProps = {
    orderDetails: OrderModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderDialog: React.FC<EditOrderDialogProps> & {
    show: (orderDetails: OrderModel, onRefreshData: () => void) => void;
} = ({ orderDetails, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
    } = useForm<OrderModel>({
        defaultValues: {
            is_paid: orderDetails.is_paid ? orderDetails.is_paid : false
        }
    });

    const statuses: { value: string; label: string }[] = Array.from(OrderStatusEnum.entries())
        .map(([key, value]) => ({
            value: key.toString(),
            label: value.label,
        }));

    const onSubmitEvent = async (data: OrderModel) => {

        const payload = {
            order_status: data.order_status,
            is_paid: data.is_paid,
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
                            <CustomTextFieldSwitch
                                label="Is Paid"
                                controlId="formIsPaid"
                                register={register}
                                fieldName="is_paid"
                            />
                        </Row>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    Update
                                </Button>
                            </Col>
                            <Col xs={6} className="text-center" onClick={onClose}>
                                <Button className="custom-btn-secondary">
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
    const existingModal = document.getElementById("edit-order-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "edit-order-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <EditOrderDialog
            orderDetails={orderDetails}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default EditOrderDialog;
