import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { DetailsRow, DetailsPaymentStatusRow, formatDate, formatUtcToLocalTime, DetailsOrderStatusRow } from "../../helper/utility";
import { fetchOrderById, cancelOrderService, cancelOrder } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
// import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import AssignPartnerDialog from "./AssignPartnerDialog";
import EditOrderServiceDialog from "./EditOrderServiceDialog";
import EditOrderDialog from "./EditOrderDialog";
import CancleDialog from "./CancleDialog";
import { OrderPaymentModeEnum } from "../../constant/PaymentEnum";
import { openDialog } from "../../helper/DialogManager";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomDatePicker from "../../components/CustomDatePicker";
import { useForm, UseFormRegister } from "react-hook-form";

type OrderInfoDialogProps = {
    orderId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

type PaymentRow = {
    date: string;
    amount: string;
    type: string;
    description: string;
    isEditing: boolean;
};

const OrderInfoDialog: React.FC<OrderInfoDialogProps> & {
    show: (orderId: string, onRefreshData: () => void) => void;
} = ({ orderId, onClose, onRefreshData }) => {
    const [orderDetails, setOrderDetails] = useState<OrderModel>();
    const [userPaymentRows, setUserPaymentRows] = useState<PaymentRow[]>([]);
    const [partnerPaymentRows, setPartnerPaymentRows] = useState<PaymentRow[]>([]);
    const [isUserTotalEditing, setIsUserTotalEditing] = useState(false);
    const [isPartnerTotalEditing, setIsPartnerTotalEditing] = useState(false);
    const [userTotalAmount, setUserTotalAmount] = useState("0.00");
    const [partnerTotalAmount, setPartnerTotalAmount] = useState("0.00");
    const fetchRef = useRef(false);
    const { register, setValue } = useForm<any>();

    const fetchDataFromApi = useCallback(async () => {
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
    }, [orderId]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    const cancleService = async (serviceId: string, reason: string) => {
        const payload = {
            cancellation_reasone: reason,
            service_items_id: serviceId,
        };
        const response = await cancelOrderService(orderId, payload);
        if (response) {
            refreshInfoData();
        }
    };

    const cancleOrder = async (reason: string) => {
        const payload = {
            cancellation_reasone: reason,
        };
        const response = await cancelOrder(orderId, payload);
        if (response) {
            refreshInfoData();
        }
    };

    const refreshInfoData = async () => {
        await fetchDataFromApi();
        onRefreshData();
    };

    const paymentTypeOptions = ["COD", "Razor pay", "UPI"];
    const amountInputStyle: React.CSSProperties = {
        boxShadow: "none",
        borderRadius: "8px",
        borderColor: "var(--primary-color)",
        fontSize: "14px",
        fontWeight: "normal",
        width: "100%",
        height: "2.62rem",
        lineHeight: "18px",
        backgroundColor: "var(--bg-color)",
        fontFamily: "'Inter'",
        color: "var(--content-txt-color)",
        marginBottom: "10px",
    };

    const parseAmount = (value: string) => {
        const parsed = parseFloat((value || "").replace(/,/g, "").trim());
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const toAmountString = (value: number) => value.toFixed(2);

    const resolvePaymentType = (value?: string | null) => {
        const normalized = (value || "").toLowerCase();
        if (normalized.includes("upi")) return "UPI";
        if (normalized.includes("razor")) return "Razor pay";
        if (normalized.includes("cod") || normalized.includes("cash")) return "COD";
        return "";
    };

    useEffect(() => {
        if (!orderDetails) return;

        const rawType =
            OrderPaymentModeEnum.get(Number(orderDetails.payment_mode_id))?.label ??
            orderDetails.payment_mode ??
            "";
        const userType = resolvePaymentType(rawType) || rawType || "";
        const paymentDate = orderDetails.order_date ? new Date(orderDetails.order_date).toISOString().slice(0, 10) : "";
        const paymentComment = orderDetails.comment || "";

        const userTotal = orderDetails.total_price ? orderDetails.total_price.toFixed(2) : "0.00";
        const userPaid = orderDetails.is_paid ? userTotal : "0.00";
        const userBalance = orderDetails.is_paid ? "0.00" : userTotal;

        const partnerTotal = orderDetails.sub_total ? orderDetails.sub_total.toFixed(2) : "0.00";
        const partnerPaid = orderDetails.is_paid ? partnerTotal : "0.00";
        const partnerBalance = orderDetails.is_paid ? "0.00" : partnerTotal;

        setUserPaymentRows([
            { date: paymentDate, amount: userTotal, type: userType, description: paymentComment, isEditing: false },
            { date: paymentDate, amount: userPaid, type: userType, description: "Paid amount", isEditing: false },
            { date: paymentDate, amount: userBalance, type: userType, description: "Balance amount", isEditing: false },
        ]);

        setPartnerPaymentRows([
            { date: paymentDate, amount: partnerTotal, type: "", description: paymentComment, isEditing: false },
            { date: paymentDate, amount: partnerPaid, type: "", description: "Paid amount", isEditing: false },
            { date: paymentDate, amount: partnerBalance, type: "", description: "Balance amount", isEditing: false },
        ]);
        setUserTotalAmount(userTotal);
        setPartnerTotalAmount(partnerTotal);
    }, [orderDetails]);

    const commitUserTotal = () => {
        const normalizedTotal = toAmountString(parseAmount(userTotalAmount));
        setUserTotalAmount(normalizedTotal);
        setUserPaymentRows((prev) =>
            prev.map((row, i) => {
                if (i === 0) return { ...row, amount: normalizedTotal };
                if (i === 2) {
                    const paid = parseAmount(prev[1]?.amount || "0");
                    return { ...row, amount: toAmountString(parseAmount(normalizedTotal) - paid) };
                }
                return row;
            })
        );
        setIsUserTotalEditing(false);
    };

    const commitPartnerTotal = () => {
        const normalizedTotal = toAmountString(parseAmount(partnerTotalAmount));
        setPartnerTotalAmount(normalizedTotal);
        setPartnerPaymentRows((prev) =>
            prev.map((row, i) => {
                if (i === 0) return { ...row, amount: normalizedTotal };
                if (i === 2) {
                    const paid = parseAmount(prev[1]?.amount || "0");
                    return { ...row, amount: toAmountString(parseAmount(normalizedTotal) - paid) };
                }
                return row;
            })
        );
        setIsPartnerTotalEditing(false);
    };

    const updatePaymentRow = (
        setter: React.Dispatch<React.SetStateAction<PaymentRow[]>>,
        index: number,
        key: keyof PaymentRow,
        value: string | boolean
    ) => {
        setter((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    };

    const addPaymentRow = (setter: React.Dispatch<React.SetStateAction<PaymentRow[]>>) => {
        setter((prev) => [...prev, { date: "", amount: "", type: "", description: "", isEditing: true }]);
    };

    const removePaymentRow = (setter: React.Dispatch<React.SetStateAction<PaymentRow[]>>, index: number) => {
        setter((prev) => prev.filter((_, i) => i !== index));
    };

    const rowHasValue = (row: PaymentRow) =>
        !!(row.date.trim() || row.amount.trim() || row.type.trim() || row.description.trim());

    const toIsoDate = (date: Date | null) => {
        if (!date) return "";
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const renderPaymentRows = (
        rows: PaymentRow[],
        setter: React.Dispatch<React.SetStateAction<PaymentRow[]>>,
        section: "user" | "partner",
        showType: boolean
    ) => (
        <>
            {rows.map((row, index) => {
                const isLast = index === rows.length - 1;
                const isFilled = rowHasValue(row);
                const isDisabled = isFilled && !row.isEditing;
                return (
                    <div key={`payment-row-${index}`} className="d-flex align-items-baseline gap-1 mb-2">
                        <div style={{ minWidth: "14px", fontSize: "12px" }}>{index + 1}</div>
                        <div style={{ flex: "0 0 25%", pointerEvents: isDisabled ? "none" : "auto" }}>
                            <CustomDatePicker
                                label=""
                                controlId={`${section}_payment_date_${index}`}
                                selectedDate={row.date || null}
                                onChange={(date) => updatePaymentRow(setter, index, "date", toIsoDate(date))}
                                register={register}
                                setValue={setValue}
                                asCol={false}
                                groupClassName="mb-0 w-100"
                                filterDate={() => true}
                            />
                        </div>
                        <div style={{ flex: showType ? "0 0 16%" : "0 0 18%" }}>
                            <Form.Control
                                className="custom-form-input"
                                type="text"
                                placeholder="Enter amount"
                                value={row.amount}
                                onChange={(e) => updatePaymentRow(setter, index, "amount", e.target.value)}
                                readOnly={isDisabled}
                                style={amountInputStyle}
                            />
                        </div>
                        {showType && (
                            <div style={{ flex: "0 0 25%", pointerEvents: isDisabled ? "none" : "auto" }}>
                                <CustomFormSelect
                                    label=""
                                    controlId="type"
                                    options={paymentTypeOptions.map((type) => ({ value: type, label: type }))}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName={`${section}_payment_type_${index}`}
                                    asCol={false}
                                    noBottomMargin={true}
                                    defaultValue={row.type}
                                    setValue={setValue as (name: string, value: any) => void}
                                    onChange={(e) => updatePaymentRow(setter, index, "type", e.target.value)}
                                />
                            </div>
                        )}
                        <div style={{ flex: showType ? "1 1 auto" : "1 1 35%" }}>
                            <Form.Control
                                className="custom-form-input"
                                type="text"
                                placeholder="Enter description"
                                value={row.description}
                                onChange={(e) => updatePaymentRow(setter, index, "description", e.target.value)}
                                readOnly={isDisabled}
                                style={amountInputStyle}
                            />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            {(isLast || isFilled) &&
                                (row.isEditing ? (
                                    <i
                                        className="bi bi-check-circle-fill text-success"
                                        style={{ fontSize: "14px" }}
                                        role="button"
                                        title="Save"
                                        onClick={() => updatePaymentRow(setter, index, "isEditing", false)}
                                    />
                                ) : (
                                    <i
                                        className="bi bi-pencil-fill text-danger"
                                        style={{ fontSize: "13px" }}
                                        role="button"
                                        title="Edit"
                                        onClick={() => updatePaymentRow(setter, index, "isEditing", true)}
                                    />
                                ))}
                            {isLast && (
                                <i
                                    className="bi bi-plus-circle"
                                    role="button"
                                    style={{ fontSize: "16px", color: "var(--primary-color)" }}
                                    onClick={() => addPaymentRow(setter)}
                                />
                            )}
                            {!isLast && !isFilled && (
                                <i
                                    className="bi bi-trash text-danger"
                                    style={{ fontSize: "13px" }}
                                    role="button"
                                    onClick={() => removePaymentRow(setter, index)}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </>
    );

    function editIcon(onClick: () => void) {
        return <i className="bi bi-pencil-fill fs-6 text-danger" onClick={onClick}></i>;
    }
    return (
        <Modal show={true} onHide={onClose} centered>
            <div className="custom-order-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Order Information
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                    <section className="custom-other-details" style={{ padding: "10px" }}>

                        <Row className="d-flex justify-content-between align-items-center mb-2">
                            <Col>
                                <h3 className="mb-0">Order</h3>
                            </Col>
                            {(orderDetails?.order_status === 1 || orderDetails?.order_status === 2) && (
                                <Col className="text-end">
                                    <label onClick={(e) => {
                                        e.preventDefault();
                                        CancleDialog.show("order", (reason) => {
                                            cancleOrder(reason);
                                        });
                                    }} className="custom-document-add me-4">Cancel</label>
                                    {editIcon(() => {
                                        EditOrderDialog.show(orderDetails!, refreshInfoData)
                                    })}
                                </Col>
                            )}
                        </Row>
                        <Row>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order ID" value={orderDetails?.unique_id} />
                                <DetailsRow title="Payment Mode" value={OrderPaymentModeEnum.get(Number(orderDetails?.payment_mode_id))?.label} />
                                <DetailsPaymentStatusRow title="Payment Status" value={orderDetails?.is_paid === true ? "Paid" : "Unpaid"} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsRow title="Order Date" value={formatDate(orderDetails?.order_date ? orderDetails?.order_date : "")} />
                                <DetailsRow title="Categoty ID" value={orderDetails?.category_info.category_id} />
                                <DetailsRow title="Categoty Name" value={orderDetails?.category_info.name} />
                            </Col>
                            <Col className="custom-helper-column">
                                <DetailsOrderStatusRow title="Order Status" value={orderDetails?.order_status!} />
                                <DetailsRow title="City Name" value={orderDetails?.city_info.name} />

                            </Col>
                        </Row>

                    </section>

                    <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                        <Row className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Service Address</h3>
                            <label
                                className="col custom-personal-row-value mt-2"
                                style={{
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                }}
                            >
                                {orderDetails?.address}
                            </label>
                        </Row>
                    </section>

                    <div className="custom-info mt-3">
                        <div>
                            <p>User</p>
                            <img src={orderDetails?.user_info.profile_url
                                ? `${AppConstant.IMAGE_BASE_URL}${orderDetails?.user_info.profile_url}?t=${Date.now()}`
                                : profileIcon} alt="User profile" width="80px" height="80px" />
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

                    {orderDetails?.service_items.map((service, serviceIndex) => (
                        <section
                            key={service._id ?? `${service.service_id}-${service.service_date}-${serviceIndex}`}
                            className="custom-other-details mt-3"
                            style={{ padding: "10px" }}
                        >

                            <Row className="d-flex justify-content-between align-items-center">
                                <Col>
                                    <h3 className="mb-0">Service</h3>
                                </Col>
                                {(orderDetails?.order_status === 1 || orderDetails?.order_status === 2) && (
                                    <Col className="text-end">
                                        <label onClick={(e) => {
                                            e.preventDefault();
                                            CancleDialog.show("service", (reason) => {
                                                cancleService(service._id!, reason);
                                            });
                                        }} className="custom-document-add me-4">Cancel</label>
                                        {editIcon(() => {
                                            EditOrderServiceDialog.show(service, refreshInfoData)
                                        })}
                                    </Col>
                                )}
                            </Row>
                            <Row className="mt-3">
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service ID" value={service.service_info?.service_id} />
                                    <DetailsRow title="Service Price" value={`${AppConstant.currencySymbol}${service.service_price ? service.service_price : 0}`} />
                                    <DetailsRow title="Total Price" value={`${AppConstant.currencySymbol}${service.total_price ? service.total_price : 0}`} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service Name" value={service.service_info?.name} />
                                    <DetailsRow title="From Time" value={formatUtcToLocalTime(service.service_from_time)} />
                                    <DetailsRow title="To Time" value={formatUtcToLocalTime(service.service_to_time)} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Service Date" value={formatDate(service.service_date ? service.service_date : "")} />
                                    <DetailsOrderStatusRow title="Service Status" value={service.service_status} />
                                    <DetailsPaymentStatusRow title="Payment Status" value={service.is_paid === true ? "Paid" : "Unpaid"} />
                                </Col>
                            </Row>

                            <Row className="d-flex justify-content-between align-items-center mt-3">
                                <Col>
                                    <h3 className="mb-0">Partner</h3>
                                </Col>
                                {(orderDetails?.order_status === 1 || orderDetails?.order_status === 2) && (
                                    <Col className="text-end">
                                        {editIcon(() => {
                                            AssignPartnerDialog.show(service.service_info?._id!!, service._id!!, refreshInfoData)
                                        })}
                                    </Col>
                                )}
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
                        <div className="d-flex justify-content-between">
                            <h3>Payment</h3>
                            {/* {editIcon(() => {
                                if (orderDetails) {
                                    EditOrderPaymentDialog.show(orderDetails, refreshInfoData);
                                }
                            })} */}
                        </div>
                        <Row className="mt-2">
                            <Col xs={6} className="mb-3 border-end border-secondary">
                                 <div className="d-flex justify-content-between align-items-center">
                                 <h3 className="text-black" style={{ fontSize: "16px" }}>User</h3>
                                 <div className="col-4">
                                            <div className="fw-semibold mb-1" style={{ fontSize: "14px" }}>Total Amount</div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Form.Control
                                                    className="custom-form-input"
                                                    type="text"
                                                    value={userTotalAmount}
                                                    readOnly={!isUserTotalEditing}
                                                    onChange={(e) => setUserTotalAmount(e.target.value)}
                                                    style={{ ...amountInputStyle, marginBottom: 0 }}
                                                />
                                                {isUserTotalEditing ? (
                                                    <i
                                                        className="bi bi-check-circle-fill text-success"
                                                        style={{ fontSize: "14px" }}
                                                        role="button"
                                                        title="Save"
                                                        onClick={commitUserTotal}
                                                    />
                                                ) : (
                                                    <i
                                                        className="bi bi-pencil-fill text-danger"
                                                        style={{ fontSize: "13px" }}
                                                        role="button"
                                                        title="Edit"
                                                        onClick={() => setIsUserTotalEditing(true)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                 </div>
                                
                                <div>
                                    <div className="d-flex px-2 py-1 gap-1 fw-semibold mt-3" style={{ fontSize: "14px" }}>
                                        <div style={{ minWidth: "14px" }}></div>
                                        <div style={{ flex: "0 0 25%" }}>Date</div>
                                        <div style={{ flex: "0 0 16%" }}>Total Amount</div>
                                        <div className="px-2"style={{ flex: "0 0 25%" }}>Type</div>
                                        <div style={{ flex: "1 1 auto" }}>Description</div>
                                        <div style={{ minWidth: "42px" }}></div>
                                    </div>
                                    <div className="px-1 py-1">{renderPaymentRows(userPaymentRows, setUserPaymentRows, "user", true)}</div>
                                    <div className="row mt-2 px-4 d-flex justify-content-end">
                                       
                                        <div className="col-4">
                                            <div className="fw-semibold mb-1 text-end" style={{ fontSize: "14px" }}>Total Paid</div>
                                            <div className="text-end" style={{ minHeight: "2.62rem" }}>
                                                {`${AppConstant.currencySymbol}${userPaymentRows[1]?.amount || "0.00"}`}
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="fw-semibold mb-1 text-end" style={{ fontSize: "14px" }}>Balance</div>
                                            <div className="text-end" style={{ minHeight: "2.62rem"}}>
                                                {`${AppConstant.currencySymbol}${toAmountString(parseAmount(userTotalAmount) - parseAmount(userPaymentRows[1]?.amount || "0"))}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={6}>
                            <div className="d-flex justify-content-between align-items-center">
                            <h3 className="text-black" style={{ fontSize: "16px" }}>Partner</h3>
                                <div className="col-4">
                                            <div className="fw-semibold mb-1" style={{ fontSize: "14px" }}>Total Service amount</div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Form.Control
                                                    className="custom-form-input"
                                                    type="text"
                                                    value={partnerTotalAmount}
                                                    readOnly={!isPartnerTotalEditing}
                                                    onChange={(e) => setPartnerTotalAmount(e.target.value)}
                                                    style={{ ...amountInputStyle, marginBottom: 0 }}
                                                />
                                                {isPartnerTotalEditing ? (
                                                    <i
                                                        className="bi bi-check-circle-fill text-success"
                                                        style={{ fontSize: "14px" }}
                                                        role="button"
                                                        title="Save"
                                                        onClick={commitPartnerTotal}
                                                    />
                                                ) : (
                                                    <i
                                                        className="bi bi-pencil-fill text-danger"
                                                        style={{ fontSize: "13px" }}
                                                        role="button"
                                                        title="Edit"
                                                        onClick={() => setIsPartnerTotalEditing(true)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                            </div>
                               
                                <div>
                                    <div className="d-flex px-2 py-1 gap-1 fw-semibold mt-3" style={{ fontSize: "14px" }}>
                                        <div style={{ minWidth: "14px" }}></div>
                                        <div style={{ flex: "0 0 25%" }}>Date</div>
                                        <div style={{ flex: "0 0 18%" }}>Total Amount</div>
                                        <div style={{ flex: "1 1 35%" }}>Description</div>
                                        <div style={{ minWidth: "42px" }}></div>
                                    </div>
                                    <div className="px-1 py-1">{renderPaymentRows(partnerPaymentRows, setPartnerPaymentRows, "partner", false)}</div>

                                    <div className="row mt-2 px-4 d-flex justify-content-end">
                                        <div className="col-4 ">
                                            <div className="fw-semibold mb-1 text-end" style={{ fontSize: "14px" }}>Total Paid</div>
                                            <div className="text-end" style={{ minHeight: "2.62rem" }}>
                                                {`${AppConstant.currencySymbol}${partnerPaymentRows[1]?.amount || "0.00"}`}
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="fw-semibold mb-1 text-end" style={{ fontSize: "14px" }}>Balance</div>
                                            <div className="text-end" style={{ minHeight: "2.62rem"}}>
                                                {`${AppConstant.currencySymbol}${toAmountString(parseAmount(partnerTotalAmount) - parseAmount(partnerPaymentRows[1]?.amount || "0"))}`}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </Col>
                        </Row>
                        <hr className="border border-dark opacity-50 my-3" />
                        <Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Service Amount: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${orderDetails?.sub_total ? orderDetails?.sub_total.toFixed(2) : 0}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Tax: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${orderDetails?.tax ? orderDetails?.tax.toFixed(2) : 0}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Commission: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${orderDetails?.partner_commison_platform_fee ? orderDetails?.partner_commison_platform_fee.toFixed(2) : 0}`}</label>
                            </Col>
                            {/* <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Partner Commission Platform Fee: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${orderDetails?.partner_commison_platform_fee ? orderDetails?.partner_commison_platform_fee.toFixed(2) : 0}`}</label>
                            </Col>
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Admin Earning: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${orderDetails?.admin_earning ? orderDetails?.admin_earning.toFixed(2) : 0}`}</label>
                            </Col> */}
                            <Col xs={12} className="text-end">
                                <label className="col custom-personal-row-title" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>Total Price: </label>
                                <label className="col custom-personal-row-value" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>{`${AppConstant.currencySymbol}${orderDetails?.total_price ? orderDetails?.total_price.toFixed(2) : 0}`}</label>
                            </Col>
                        </Col>
                         
                    </section>
                </Modal.Body>
            </div>
        </Modal>
    );
};

OrderInfoDialog.show = (orderId: string, onRefreshData: () => void) => {
    openDialog("order-details-modal", (close) => (
        <OrderInfoDialog
            orderId={orderId}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default OrderInfoDialog;