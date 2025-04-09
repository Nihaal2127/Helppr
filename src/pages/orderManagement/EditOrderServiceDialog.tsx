import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { updateOrderService } from "../../services/orderService";
import { OrderItemModel } from "../../models/OrderItemModel";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";

type EditOrderServiceDialogProps = {
    orderItemModel: OrderItemModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const EditOrderServiceDialog: React.FC<EditOrderServiceDialogProps> & {
    show: (orderItemModel: OrderItemModel, onRefreshData: () => void) => void;
} = ({ orderItemModel, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<OrderItemModel>({
        defaultValues: {
            service_date : orderItemModel.service_date ? orderItemModel.service_date : "",
            service_from_time : orderItemModel.service_from_time ? orderItemModel.service_from_time : "",
            service_to_time : orderItemModel.service_to_time ? orderItemModel.service_to_time : "",
            service_status: orderItemModel.service_status ? orderItemModel.service_status : 1
        }
    });

    const statuses: { value: string; label: string }[] = Array.from(OrderStatusEnum.entries())
        .filter(([_, value]) => value.label !== "Cancelled")
        .map(([key, value]) => ({
            value: key.toString(),
            label: value.label,
        }));

    const onSubmitEvent = async (data: OrderItemModel) => {

        const payload = {
            service_date: data.service_date,
            service_from_time: data.service_from_time,
            service_to_time: data.service_to_time,
            service_status: Number(data.service_status)
        };

        const responseUser = await updateOrderService(payload, orderItemModel._id!);

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
                        Edit Order Service
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="edit-order-service-form"
                        id="edit-order-service-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <CustomTextFieldDatePicket
                                label="Service Date"
                                controlId="service_date"
                                selectedDate={orderItemModel?.service_date}
                                onChange={(date) => {
                                    const serviceDate = date?.toISOString() || "";
                                    if (orderItemModel) {
                                        orderItemModel.service_date = serviceDate;
                                        setValue("service_date", serviceDate)
                                    }
                                }}
                                placeholderText="Select date"
                                error={errors.service_date}
                                register={register}
                                validation={{ required: "Service date is required" }}
                                setValue={setValue}
                            />

                            <CustomTextFieldTimePicket
                                label="From Time"
                                controlId="service_from_time"
                                selectedTime={orderItemModel.service_from_time}
                                onChange={(date) => {
                                    const serviceTime = date?.toISOString() || "";
                                    if (orderItemModel) {
                                        orderItemModel.service_from_time = serviceTime;
                                        setValue("service_from_time", serviceTime)
                                    }
                                }}
                                placeholderText="Select time"
                                error={errors.service_from_time}
                                register={register}
                                validation={{ required: "From time is required" }}
                                setValue={setValue}
                                filterTime={(time) => {
                                    const hour = time.getHours();
                                    return hour >= 8 && hour <= 23;
                                }}
                            />
                            <CustomTextFieldTimePicket
                                label="To Time"
                                controlId="service_to_time"
                                selectedTime={orderItemModel.service_to_time}
                                onChange={(date) => {
                                    const serviceTime = date?.toISOString() || "";
                                    if (orderItemModel) {
                                        orderItemModel.service_to_time = serviceTime;
                                        setValue("service_to_time", serviceTime)
                                    }
                                }}
                                placeholderText="Select time"
                                error={errors.service_to_time}
                                register={register}
                                validation={{ required: "To time is required" }}
                                setValue={setValue}
                                filterTime={(time) => {
                                    const hour = time.getHours();
                                    return hour >= 8 && hour <= 23;
                                }}
                            />

                            <CustomTextFieldRadio
                                label="Order Status"
                                name="service_status"
                                options={statuses}
                                defaultValue={orderItemModel?.service_status ? String(orderItemModel?.service_status) : "1"}
                                setValue={setValue}
                            />
                        </Row>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    Assign
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

EditOrderServiceDialog.show = (orderItemModel: OrderItemModel, onRefreshData: () => void) => {
    const existingModal = document.getElementById("order-edit-service-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "order-edit-service-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <EditOrderServiceDialog
            orderItemModel={orderItemModel}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default EditOrderServiceDialog;
