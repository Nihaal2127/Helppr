import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { DetailsRow, formatDate, } from "../../helper/utility";
import { fetchOrderById, cancelOrderService } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import AssignPartnerDialog from "./AssignPartnerDialog";
import EditOrderServiceDialog from "./EditOrderServiceDialog";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { OrderStatusEnum } from "../../constant/OrderStatusEnum";

type OrderInfoDialogProps = {
    orderId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const OrderInfoDialog: React.FC<OrderInfoDialogProps> & {
    show: (orderId: string, onRefreshData: () => void) => void;
} = ({ orderId, onClose, onRefreshData }) => {
    const [orderDetails, setOrderDetails] = useState<OrderModel>();
    const fetchRef = useRef(false);

    const fetchDataFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, order } = await fetchOrderById(orderId);
            if (response) {
                setOrderDetails(order!!);
            }
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    const cancleService = async (serviceId: string) => {
        openConfirmDialog(
            "Are you sure you want to cancle this service?",
            "Yes",
            "No",
            async () => {
                const response = await cancelOrderService(serviceId);
                if (response) {
                    onRefreshData();
                }
            },
        );

    };

    return (
        <Modal show={true} onHide={onClose} centered>
            <div className="custom-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Order Information
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <section className="custom-other-details" style={{ padding: "10px" }}>

                        <h3>Order</h3>
                        <Row>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order ID" value={orderDetails?.unique_id} />
                                <DetailsRow title="Payment Mode" value={orderDetails?.payment_mode} />
                                <DetailsRow title="Payment Status" value={orderDetails?.is_paid === true ? "Paid" : "Unpaid"} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order Date" value={formatDate(orderDetails?.order_date ? orderDetails?.order_date : "")} />
                                <DetailsRow title="City ID" value={orderDetails?.city_info.city_id} />
                                <DetailsRow title="Categoty ID" value={orderDetails?.category_info.category_id} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order Status" value={OrderStatusEnum.get(orderDetails?.order_status!)?.label} />
                                <DetailsRow title="City Name" value={orderDetails?.city_info.name} />
                                <DetailsRow title="Categoty Name" value={orderDetails?.category_info.name} />
                            </Col>
                        </Row>

                    </section>

                    <div className="custom-info mt-3">
                        <div>
                            <p>User</p>
                            <img src={orderDetails?.user_info.profile_url
                                ? `${AppConstant.IMAGE_BASE_URL}${orderDetails?.user_info.profile_url}?t=${Date.now()}`
                                : profileIcon} alt=" Profile Picture" width="80px" height="80px" />
                        </div>

                        <div className="custom-personal-details">

                            <Col className="custom-helper-column">
                                <DetailsRow title="User ID" value={orderDetails?.user_info.user_id} />
                                <DetailsRow title="Location" value={orderDetails?.user_info.city_name} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="User Name" value={orderDetails?.user_info.name} />
                                <DetailsRow title="Phone Number" value={orderDetails?.user_info.phone_number} />
                            </Col>
                        </div>

                    </div>

                    {orderDetails?.service_items.map((service, index) => (
                        <section className="custom-other-details mt-3" style={{ padding: "10px" }}>

                            <Row className="d-flex justify-content-between align-items-center">
                                <Col>
                                    <h3 className="mb-0">Service</h3>
                                </Col>
                                <Col className="text-end">
                                    <label onClick={(e) => {
                                        e.preventDefault();
                                        cancleService(service._id);
                                    }} className="custom-document-add me-4">Cancel</label>
                                    <img src={editIcon} alt="edit" onClick={() => {
                                        EditOrderServiceDialog.show(service, onRefreshData)
                                    }} />
                                </Col>
                            </Row>
                            <Row className="mt-3">
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service ID" value={service.service_info?.service_id} />
                                    <DetailsRow title="Service Price" value={`\$${service.service_price}`} />
                                    <DetailsRow title="Total Price" value={`\$${service.total_price}`} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service Name" value={service.service_info?.name} />
                                    <DetailsRow title="From Time" value={service.service_from_time} />
                                    <DetailsRow title="To Time" value={service.service_to_time} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service Date" value={formatDate(service.service_date ? service.service_date : "")} />
                                    <DetailsRow title="Service Status" value={OrderStatusEnum.get(service.service_status!)} />
                                    <DetailsRow title="Payment Status" value={service.service_payment_status === true ? "Paid" : "Unpaid"} />
                                </Col>
                            </Row>

                            <Row className="d-flex justify-content-between align-items-center mt-3">
                                <Col>
                                    <h3 className="mb-0">Partner</h3>
                                </Col>
                                <Col className="text-end">
                                    <img src={editIcon} alt="edit" onClick={() => {
                                        AssignPartnerDialog.show(service.partner_info?._id!, onRefreshData)
                                    }} />
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Partner ID" value={service.partner_info?.user_id} />
                                    <DetailsRow title="Location" value={service.partner_info?.city_name} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Partner Name" value={service.partner_info?.name} />
                                    <DetailsRow title="Phone Number" value={service.partner_info?.phone_number} />
                                </Col>
                            </Row>
                        </section>
                    ))}

                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>

                        <h3>Employee</h3>
                        <Row>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Employee ID" value={orderDetails?.created_by_info.user_id} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Employee Name" value={orderDetails?.created_by_info.name} />
                            </Col>
                        </Row>

                    </section>

                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                        <h3>Payment</h3>
                        <Row>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Service Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`\$${orderDetails?.sub_total}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Tax Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`\$${orderDetails?.tax}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Platform Charges: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`\$${orderDetails?.user_paltform_fee}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>Total Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>{`\$${orderDetails?.total_price}`}</label>
                            </Col>
                        </Row>
                    </section>
                </Modal.Body>
            </div>
        </Modal>
    );
};

OrderInfoDialog.show = (orderId: string, onRefreshData: () => void) => {
    const existingModal = document.getElementById("order-details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "order-details-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <OrderInfoDialog
            orderId={orderId}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default OrderInfoDialog;