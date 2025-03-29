import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { DetailsRow, } from "../../helper/utility";
import { fetchOrderById } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import AssignPartnerDialog from "./AssignPartnerDialog";
import EditOrderServiceDialog from "./EditOrderServiceDialog";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";

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
        //fetchDataFromApi();
    }, []);

    const cancleService = async (serviceId: string) => {
        openConfirmDialog(
            "Are you sure you want to cancle this service?",
            "Yes",
            "No",
            async () => {
                // const response = await deletePartnerDocument(document._id);
                // if (response) {
                //     onRefreshuser();
                // }
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
                                <DetailsRow title="Order ID" value={""} />
                                <DetailsRow title="Payment Mode" value={""} />
                                <DetailsRow title="Payment Status" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order Date" value={""} />
                                <DetailsRow title="City ID" value={""} />
                                <DetailsRow title="Categoty ID" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order Status" value={""} />
                                <DetailsRow title="City Name" value={""} />
                                <DetailsRow title="Categoty Name" value={""} />
                            </Col>
                        </Row>

                    </section>

                    <div className="custom-info mt-3">
                        <div>
                            <p>User</p>
                            {/* <img src={orderDetails?.profile_url
                                ? `${AppConstant.IMAGE_BASE_URL}${orderDetails?.profile_url}?t=${Date.now()}`
                                : profileIcon} alt=" Profile Picture" width="80px" height="80px" /> */}
                            <img src={profileIcon} alt=" Profile Picture" width="80px" height="80px" />
                        </div>

                        <div className="custom-personal-details">

                            <Col className="custom-helper-column">
                                <DetailsRow title="User ID" value={""} />
                                <DetailsRow title="Location" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="User Name" value={""} />
                                <DetailsRow title="Phone Number" value={""} />
                            </Col>
                        </div>

                    </div>

                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>

                        <Row className="d-flex justify-content-between align-items-center">
                            <Col>
                                <h3 className="mb-0">Service</h3>
                            </Col>
                            <Col className="text-end">
                                <label onClick={(e) => {
                                    e.preventDefault();
                                    cancleService("");
                                }} className="custom-document-add me-4">Cancel</label>
                                <img src={editIcon} alt="edit" onClick={() => {
                                    EditOrderServiceDialog.show(orderDetails?.order_items[0]!!, onRefreshData)
                                }} />
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col className="custom-helper-column">
                                <DetailsRow title="Service ID" value={""} />
                                <DetailsRow title="Service Date" value={""} />
                                <DetailsRow title="Service Status" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Service Name" value={""} />
                                <DetailsRow title="From Time" value={""} />
                                <DetailsRow title="Pay Status" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Service Price" value={""} />
                                <DetailsRow title="To Time" value={""} />
                            </Col>
                        </Row>

                        <Row className="d-flex justify-content-between align-items-center mt-3">
                            <Col>
                                <h3 className="mb-0">Partner</h3>
                            </Col>
                            <Col className="text-end">
                                <img src={editIcon} alt="edit" onClick={() => {
                                    AssignPartnerDialog.show("", onRefreshData)
                                }} />
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col className="custom-helper-column">
                                <DetailsRow title="Partner ID" value={""} />
                                <DetailsRow title="Location" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Partner Name" value={""} />
                                <DetailsRow title="Phone Number" value={""} />
                            </Col>
                        </Row>
                    </section>
                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>

                        <h3>Employee</h3>
                        <Row>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Employee ID" value={""} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Employee Name" value={""} />
                            </Col>
                        </Row>

                    </section>
                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                        <h3>Payment</h3>
                        <Row>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Service Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{"0"}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Tax Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{"0"}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Platform Charges: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{"0"}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>Total Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>{"0"}</label>
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