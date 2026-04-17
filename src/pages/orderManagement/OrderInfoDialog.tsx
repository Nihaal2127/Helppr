import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, Row, Col, Table } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { DetailsRow, formatDate, DetailsOrderStatusRow } from "../../helper/utility";
import { fetchOrderById } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
import profileIcon from "../../assets/icons/profile.svg";
import AssignPartnerDialog from "./AssignPartnerDialog";
import EditOrderDialog from "./EditOrderDialog";
import EditOrderEmployeeDialog from "./EditOrderEmployeeDialog";
import EditOrderUserDialog from "./EditOrderUserDialog";
import OrderPaymentEditModal from "./OrderPaymentEditModal";
import { openDialog } from "../../helper/DialogManager";
import {
    formatServiceScheduleLine,
    getCustomerPaymentStatusLabel,
    getOrderPartnerDisplayName,
    getOrderServiceAddress,
    getPartnerPaymentStatusLabel,
    getPrimaryServiceItem,
    orderRefundAmount,
    orderRefundBreakdown,
    resolveOrderOfferBreakdown,
    serviceNamesJoined,
} from "../../helper/orderDisplayHelpers";
import {
    computeTaxCommissionAmounts,
    customerPaidBalanceHeadline,
    getServiceTaxCommissionPercents,
    otherChargesTotal,
    partnerPaidBalanceHeadline,
    resolvePaymentExtension,
} from "../../helper/orderPaymentStorage";
import { applyOrderPaymentPreviewDummy } from "../../helper/orderPaymentPreviewDummy";

type OrderInfoDialogProps = {
    orderId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const sectionShell: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.08))",
    backgroundColor: "var(--bg-color)",
};

const paymentSubcard: React.CSSProperties = {
    borderRadius: "8px",
    border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.1))",
    backgroundColor: "var(--bg-color)",
};

const paymentSummaryRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid var(--txtfld-border, rgba(0,0,0,0.08))",
};

const paymentSummaryLabel: React.CSSProperties = {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "var(--primary-txt-color, #1a1a1a)",
};

const paymentSummaryValue: React.CSSProperties = {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "var(--primary-txt-color, #1a1a1a)",
    textAlign: "right",
    whiteSpace: "nowrap",
};

const paymentSummaryTotalWrap: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    paddingTop: "14px",
    marginTop: "8px",
    borderTop: "2px solid var(--txtfld-border, rgba(0,0,0,0.14))",
};

const paymentSummaryTotalLabel: React.CSSProperties = {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "var(--primary-color, #0d6efd)",
};

const paymentSummaryTotalValue: React.CSSProperties = {
    fontSize: "1.35rem",
    fontWeight: 700,
    color: "var(--primary-color, #0d6efd)",
    textAlign: "right",
    whiteSpace: "nowrap",
};

/** Parenthetical breakdown on the same row as Service / Tax lines */
const paymentInlineBreakdown: React.CSSProperties = {
    fontSize: "0.88rem",
    fontWeight: 500,
    color: "var(--content-txt-color, #6c757d)",
};

/** Space before offer / discount / refund (no extra top border — avoids double line with row borderBottom) */
const adjustmentBlockTop: React.CSSProperties = {
    marginTop: "8px",
    paddingTop: "4px",
};

const OrderInfoDialog: React.FC<OrderInfoDialogProps> & {
    show: (orderId: string, onRefreshData: () => void) => void;
} = ({ orderId, onClose, onRefreshData }) => {
    const [orderDetails, setOrderDetails] = useState<OrderModel>();
    const fetchRef = useRef(false);

    const fetchDataFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, order } = await fetchOrderById(orderId);
            if (response && order) {
                setOrderDetails(applyOrderPaymentPreviewDummy(order));
            }
        } finally {
            fetchRef.current = false;
        }
    }, [orderId]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    const refreshInfoData = async () => {
        await fetchDataFromApi();
        onRefreshData();
    };

    const editIcon = (onClick: () => void, ariaLabel = "Edit") => (
        <i
            className="bi bi-pencil-fill fs-6 text-danger"
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onClick();
            }}
            style={{ cursor: "pointer" }}
        />
    );

    const primary = getPrimaryServiceItem(orderDetails);

    const paymentExt = useMemo(() => {
        if (!orderDetails) return null;
        return resolvePaymentExtension(orderDetails, primary);
    }, [orderDetails, primary]);

    const taxCommFromService = useMemo(() => {
        if (!orderDetails) return { taxPct: 0, commissionPct: 0 };
        return getServiceTaxCommissionPercents(getPrimaryServiceItem(orderDetails));
    }, [orderDetails]);

    const { viewTax, viewComm } = useMemo(() => {
        if (!paymentExt) return { viewTax: 0, viewComm: 0 };
        const other = otherChargesTotal(paymentExt.otherCharges);
        const taxableBase = Math.max(0, paymentExt.serviceAmount + other);
        const { taxAmount, commissionAmount } = computeTaxCommissionAmounts(
            taxableBase,
            taxCommFromService.taxPct,
            taxCommFromService.commissionPct
        );
        return { viewTax: taxAmount, viewComm: commissionAmount };
    }, [paymentExt, taxCommFromService]);

    const viewOtherSum = paymentExt ? otherChargesTotal(paymentExt.otherCharges) : 0;
    const refundN = orderRefundAmount(orderDetails);
    const offerBreakdown = useMemo(() => resolveOrderOfferBreakdown(orderDetails), [orderDetails]);
    const refundBreakdown = useMemo(() => orderRefundBreakdown(orderDetails), [orderDetails]);

    const showOfferTemplate = useMemo(() => {
        const b = offerBreakdown;
        return b.totalOfferValue > 0 || b.adminContribution > 0 || b.partnerContribution > 0;
    }, [offerBreakdown]);

    /** Real offer amounts or applied discount only (no empty “Offer” block). */
    const showOfferSummary = useMemo(() => {
        return offerBreakdown.appliedDiscount > 0 || showOfferTemplate;
    }, [offerBreakdown, showOfferTemplate]);

    const showRefundSummary = useMemo(() => {
        const r = refundBreakdown;
        return r.refundAmount > 0 || r.adminCommission > 0 || r.partnerWallet > 0;
    }, [refundBreakdown]);
    const orderDiscountView = Math.max(0, Number(orderDetails?.discount_amount ?? 0));
    const viewFinalTotal = paymentExt
        ? Math.max(
              0,
              paymentExt.serviceAmount +
                  viewOtherSum +
                  viewTax +
                  viewComm -
                  refundN -
                  offerBreakdown.appliedDiscount -
                  orderDiscountView
          )
        : 0;

    const paymentHeadlines = useMemo(() => {
        if (!paymentExt || !orderDetails) return null;
        const invoiceTotal = Number(orderDetails.total_price ?? 0) || viewFinalTotal;
        const serviceAmt = Number(orderDetails.sub_total ?? paymentExt.serviceAmount ?? 0);
        const isPaid = !!orderDetails.is_paid;
        return {
            user: customerPaidBalanceHeadline(paymentExt, invoiceTotal, isPaid),
            partner: partnerPaidBalanceHeadline(paymentExt, invoiceTotal, serviceAmt, isPaid),
            serviceAmt,
            taxAmt: Number(orderDetails.tax ?? viewTax),
            commAmt: Number(orderDetails.partner_commison_platform_fee ?? viewComm),
            totalPriceDisp: Number(orderDetails.total_price ?? 0) || viewFinalTotal,
        };
    }, [paymentExt, orderDetails, viewFinalTotal, viewTax, viewComm]);

    /** When service line omits %, infer from stored amounts (tax/commission apply to service + other charges). */
    const taxPctForLabel = useMemo(() => {
        if (taxCommFromService.taxPct > 0) return taxCommFromService.taxPct;
        const s = (paymentHeadlines?.serviceAmt ?? 0) + viewOtherSum;
        const t = paymentHeadlines?.taxAmt ?? 0;
        if (s > 0 && t >= 0) return Math.round((t / s) * 10000) / 100;
        return 0;
    }, [taxCommFromService.taxPct, paymentHeadlines, viewOtherSum]);

    const commissionPctForLabel = useMemo(() => {
        if (taxCommFromService.commissionPct > 0) return taxCommFromService.commissionPct;
        const s = (paymentHeadlines?.serviceAmt ?? 0) + viewOtherSum;
        const c = paymentHeadlines?.commAmt ?? 0;
        if (s > 0 && c >= 0) return Math.round((c / s) * 10000) / 100;
        return 0;
    }, [taxCommFromService.commissionPct, paymentHeadlines, viewOtherSum]);

    const canEditOrderHeader = orderDetails?.order_status === 1 || orderDetails?.order_status === 2;
    const createdBy = orderDetails?.created_by_info;

    const sym = AppConstant.currencySymbol;

    const payLineDate = (d: string) => (d ? formatDate(d) : "—");

    return (
        <Modal show onHide={onClose} centered size="lg" dialogClassName="custom-big-modal">
            <div className="custom-order-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Order Information
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                    {/* Order */}
                    <section className="custom-other-details mt-2" style={sectionShell}>
                        <Row className="align-items-center mb-3 pb-2 border-bottom">
                            <Col>
                                <h3 className="mb-0">Order</h3>
                            </Col>
                            {canEditOrderHeader && (
                                <Col xs="auto" className="text-end d-flex align-items-center justify-content-end">
                                    {editIcon(() => {
                                        if (orderDetails) EditOrderDialog.show(orderDetails, refreshInfoData);
                                    }, "Edit partner / customer payment status and order status")}
                                </Col>
                            )}
                        </Row>
                        <Row className="g-2">
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Order ID" value={orderDetails?.unique_id} />
                                <DetailsRow title="Order Date" value={formatDate(orderDetails?.order_date ?? "")} />
                                <DetailsRow title="Category Name" value={orderDetails?.category_info?.name} />
                                <DetailsRow title="Service Name" value={serviceNamesJoined(orderDetails)} />
                                <DetailsRow title="Service Address" value={getOrderServiceAddress(orderDetails)} />
                            </Col>
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Schedule Date/time" value={formatServiceScheduleLine(primary)} />
                                <DetailsRow
                                    title="Partner Payment Status"
                                    value={getPartnerPaymentStatusLabel(orderDetails)}
                                />
                                <DetailsRow
                                    title="Customer Payment Status"
                                    value={getCustomerPaymentStatusLabel(orderDetails)}
                                />
                                <DetailsOrderStatusRow title="Order Status" value={orderDetails?.order_status!} />
                            </Col>
                        </Row>
                    </section>

                    {/* User */}
                    <section className="custom-other-details mt-3" style={sectionShell}>
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom w-100">
                            <h3 className="mb-0">User</h3>
                            <div className="d-flex align-items-center flex-shrink-0">
                                {editIcon(() => {
                                    if (orderDetails) EditOrderUserDialog.show(orderDetails, refreshInfoData);
                                }, "Change order user")}
                            </div>
                        </div>
                        <Row className="g-3 align-items-start">
                            <Col xs="auto" className="flex-shrink-0">
                                <img
                                    src={
                                        orderDetails?.user_info?.profile_url
                                            ? `${AppConstant.IMAGE_BASE_URL}${orderDetails.user_info.profile_url}?t=${Date.now()}`
                                            : profileIcon
                                    }
                                    alt=""
                                    width={72}
                                    height={72}
                                    className="rounded-circle object-fit-cover"
                                    style={{ border: "1px solid var(--txtfld-border, #dee2e6)" }}
                                />
                            </Col>
                            <Col className="min-w-0">
                                <Row className="g-2">
                                    <Col sm={6}>
                                        <DetailsRow title="User Name" value={orderDetails?.user_info?.name} />
                                        <DetailsRow title="User Email" value={orderDetails?.user_info?.email} />
                                    </Col>
                                    <Col sm={6}>
                                        <DetailsRow title="Phone number" value={orderDetails?.user_info?.phone_number} />
                                        <DetailsRow title="Address" value={orderDetails?.user_info?.address} />
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </section>

                    {/* Partner */}
                    <section className="custom-other-details mt-3" style={sectionShell}>
                        <Row className="align-items-center mb-3 pb-2 border-bottom">
                            <Col>
                                <h3 className="mb-0">Partner</h3>
                            </Col>
                            <Col xs="auto" className="text-end">
                                {canEditOrderHeader &&
                                    editIcon(() => {
                                        if (primary?._id && primary.service_info?._id) {
                                            AssignPartnerDialog.show(
                                                primary.service_info._id,
                                                primary._id,
                                                refreshInfoData
                                            );
                                        }
                                    }, "Edit / assign partner")}
                            </Col>
                        </Row>
                        <Row className="g-2">
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Name" value={getOrderPartnerDisplayName(orderDetails)} />
                                <DetailsRow title="Phone number" value={primary?.partner_info?.phone_number ?? "-"} />
                            </Col>
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Email" value={primary?.partner_info?.email ?? "-"} />
                                <DetailsRow title="Address" value={primary?.partner_info?.address ?? "-"} />
                            </Col>
                        </Row>
                    </section>

                    {/* Employee */}
                    <section className="custom-other-details mt-3" style={sectionShell}>
                        <Row className="align-items-center mb-3 pb-2 border-bottom">
                            <Col>
                                <h3 className="mb-0">Employee</h3>
                            </Col>
                            <Col xs="auto" className="text-end">
                                {editIcon(() => {
                                    if (orderDetails) EditOrderEmployeeDialog.show(orderDetails, refreshInfoData);
                                }, "Edit employee")}
                            </Col>
                        </Row>
                        <Row className="g-2">
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Name" value={createdBy?.name ?? orderDetails?.created_by_name} />
                                <DetailsRow title="Phone number" value={createdBy?.phone_number ?? "-"} />
                            </Col>
                            <Col md={6} className="custom-helper-column">
                                <DetailsRow title="Email" value={createdBy?.email ?? "-"} />
                            </Col>
                        </Row>
                    </section>

                    {/* Payment */}
                    <section className="custom-other-details mt-3" style={sectionShell}>
                        <Row className="align-items-center mb-3 pb-2 border-bottom">
                            <Col>
                                <h3 className="mb-0">Payment</h3>
                            </Col>
                            <Col xs="auto" className="text-end d-flex align-items-center gap-2">
                                {canEditOrderHeader &&
                                    editIcon(() => {
                                        if (orderDetails) {
                                            OrderPaymentEditModal.show(orderDetails, refreshInfoData);
                                        }
                                    }, "Edit payments, charges, and totals")}
                            </Col>
                        </Row>

                        <Row className="g-3 mb-3">
                            <Col lg={6}>
                                <div className="p-3 h-100" style={paymentSubcard}>
                                    <div className="fw-semibold mb-2">Customer payments</div>
                                    <Table responsive bordered size="sm" className="mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: "26%" }}>Date</th>
                                                <th style={{ width: "22%" }}>Paid amount</th>
                                                <th style={{ width: "22%" }}>Type</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(paymentExt?.customerPayments ?? []).map((r) => (
                                                <tr key={r.id}>
                                                    <td>{payLineDate(r.date)}</td>
                                                    <td>
                                                        {sym}
                                                        {Number(r.amount || 0).toFixed(2)}
                                                    </td>
                                                    <td>{r.type?.trim() || "—"}</td>
                                                    <td>{r.description?.trim() || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    {paymentHeadlines && (
                                        <div className="mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Total Paid</span>
                                                <span className="fw-semibold">
                                                    {sym}
                                                    {paymentHeadlines.user.totalPaid.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Balance</span>
                                                <span className="fw-semibold">
                                                    {sym}
                                                    {paymentHeadlines.user.balance.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col lg={6}>
                                <div className="p-3 h-100" style={paymentSubcard}>
                                    <div className="fw-semibold mb-2">Partner payments</div>
                                    <Table responsive bordered size="sm" className="mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: "30%" }}>Date</th>
                                                <th style={{ width: "28%" }}>Paid amount</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(paymentExt?.partnerPayments ?? []).map((r) => (
                                                <tr key={r.id}>
                                                    <td>{payLineDate(r.date)}</td>
                                                    <td>
                                                        {sym}
                                                        {Number(r.amount || 0).toFixed(2)}
                                                    </td>
                                                    <td>{r.description?.trim() || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                    {paymentHeadlines && (
                                        <div className="mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Total Paid</span>
                                                <span className="fw-semibold">
                                                    {sym}
                                                    {paymentHeadlines.partner.totalPaid.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Balance</span>
                                                <span className="fw-semibold">
                                                    {sym}
                                                    {paymentHeadlines.partner.balance.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>

                        {paymentExt && paymentHeadlines && orderDetails && (
                            <div
                                className="p-3 mt-1 rounded-3"
                                style={{ ...paymentSubcard, backgroundColor: "rgba(0,0,0,0.03)" }}
                            >
                                <div
                                    className="fw-semibold text-uppercase small text-muted mb-3"
                                    style={{ letterSpacing: "0.05em" }}
                                >
                                    Amount summary
                                </div>

                                <div style={paymentSummaryRow}>
                                    <span style={paymentSummaryLabel}>Service Amount</span>
                                    <span style={paymentSummaryValue}>
                                        {sym}
                                        {paymentHeadlines.serviceAmt.toFixed(2)}
                                    </span>
                                </div>

                                <div style={paymentSummaryRow}>
                                    <span style={paymentSummaryLabel}>Tax ({taxPctForLabel}%)</span>
                                    <span style={paymentSummaryValue}>
                                        {sym}
                                        {paymentHeadlines.taxAmt.toFixed(2)}
                                    </span>
                                </div>

                                <div style={paymentSummaryRow}>
                                    <span style={paymentSummaryLabel}>Commission ({commissionPctForLabel}%)</span>
                                    <span style={paymentSummaryValue}>
                                        {sym}
                                        {paymentHeadlines.commAmt.toFixed(2)}
                                    </span>
                                </div>

                                {paymentExt.otherCharges.map((c) => (
                                    <div key={c.id} style={paymentSummaryRow}>
                                        <div style={{ minWidth: 0, flex: "1 1 auto", paddingRight: "8px" }}>
                                            <div
                                                style={{
                                                    ...paymentSummaryLabel,
                                                    fontSize: "1.05rem",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {c.serviceName?.trim() ||
                                                    c.description?.trim() ||
                                                    "Other service charge"}
                                            </div>
                                            {c.serviceName?.trim() && c.description?.trim() ? (
                                                <div className="text-muted small mt-1">{c.description.trim()}</div>
                                            ) : null}
                                        </div>
                                        <span style={paymentSummaryValue}>
                                            {sym}
                                            {Number(c.amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                {paymentExt.otherCharges.length > 1 && (
                                    <div style={paymentSummaryRow}>
                                        <span style={{ ...paymentSummaryLabel, fontSize: "1.05rem" }}>
                                            Other service charges (total)
                                        </span>
                                        <span style={paymentSummaryValue}>
                                            {sym}
                                            {viewOtherSum.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {showOfferSummary && (
                                    <div style={{ ...paymentSummaryRow, ...adjustmentBlockTop }}>
                                        <div
                                            style={{
                                                minWidth: 0,
                                                flex: "1 1 auto",
                                                display: "flex",
                                                flexWrap: "wrap",
                                                alignItems: "baseline",
                                                gap: "8px",
                                            }}
                                        >
                                            <span style={paymentSummaryLabel}>Offer</span>
                                            {offerBreakdown.offerCode ? (
                                                <span
                                                    className="rounded-pill border px-2 py-0"
                                                    style={{
                                                        fontSize: "0.75rem",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.02em",
                                                        backgroundColor: "rgba(0,0,0,0.04)",
                                                    }}
                                                >
                                                    {offerBreakdown.offerCode}
                                                </span>
                                            ) : null}
                                            <span style={paymentInlineBreakdown}>
                                                {showOfferTemplate ? (
                                                    <>
                                                        (
                                                        Total offer value {sym}
                                                        {offerBreakdown.totalOfferValue.toFixed(2)}
                                                        <span className="text-secondary"> · </span>
                                                        Admin {sym}
                                                        {offerBreakdown.adminContribution.toFixed(2)}
                                                        <span className="text-secondary"> · </span>
                                                        Partner {sym}
                                                        {offerBreakdown.partnerContribution.toFixed(2)}
                                                        )
                                                    </>
                                                ) : offerBreakdown.offerName?.trim() ? (
                                                    <> ({offerBreakdown.offerName.trim()})</>
                                                ) : null}
                                            </span>
                                        </div>
                                        <span
                                            style={{
                                                ...paymentSummaryValue,
                                                flexShrink: 0,
                                                color:
                                                    offerBreakdown.appliedDiscount > 0
                                                        ? "#198754"
                                                        : "var(--content-txt-color, #6c757d)",
                                            }}
                                        >
                                            {offerBreakdown.appliedDiscount > 0 ? "−" : ""}
                                            {sym}
                                            {offerBreakdown.appliedDiscount.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {Number(orderDetails.discount_amount ?? 0) > 0 && (
                                    <div
                                        style={{
                                            ...paymentSummaryRow,
                                            ...(!showOfferSummary ? adjustmentBlockTop : {}),
                                        }}
                                    >
                                        <span style={{ ...paymentSummaryLabel, fontSize: "1.05rem" }}>Discount</span>
                                        <span style={{ ...paymentSummaryValue, color: "#198754" }}>
                                            −{sym}
                                            {Number(orderDetails.discount_amount).toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {showRefundSummary && (
                                    <div
                                        style={{
                                            ...paymentSummaryRow,
                                            ...(!showOfferSummary && Number(orderDetails.discount_amount ?? 0) <= 0
                                                ? adjustmentBlockTop
                                                : {}),
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: 0,
                                                flex: "1 1 auto",
                                                display: "flex",
                                                flexWrap: "wrap",
                                                alignItems: "baseline",
                                                gap: "8px",
                                            }}
                                        >
                                            <span style={paymentSummaryLabel}>Refund Amount</span>
                                            <span style={paymentInlineBreakdown}>
                                                (
                                                Admin Commission {sym}
                                                {refundBreakdown.adminCommission.toFixed(2)}
                                                <span className="text-secondary"> · </span>
                                                Partner Wallet {sym}
                                                {refundBreakdown.partnerWallet.toFixed(2)}
                                                )
                                            </span>
                                        </div>
                                        <span
                                            style={{
                                                ...paymentSummaryValue,
                                                color: "#dc3545",
                                                flexShrink: 0,
                                            }}
                                        >
                                            −{sym}
                                            {refundBreakdown.refundAmount.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                <div style={paymentSummaryTotalWrap}>
                                    <span style={paymentSummaryTotalLabel}>Total Price</span>
                                    <span style={paymentSummaryTotalValue}>
                                        {sym}
                                        {paymentHeadlines.totalPriceDisp.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>
                </Modal.Body>
            </div>
        </Modal>
    );
};

/** Prefer this over `OrderInfoDialog.show` — stable under HMR and avoids undefined `.show` on default import. */
export function showOrderInfoDialog(orderId: string, onRefreshData: () => void) {
    openDialog("order-details-modal", (close) => (
        <OrderInfoDialog orderId={orderId} onClose={close} onRefreshData={onRefreshData} />
    ));
}

OrderInfoDialog.show = showOrderInfoDialog;

export default OrderInfoDialog;
