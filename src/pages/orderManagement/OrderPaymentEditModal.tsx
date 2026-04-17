import React, { useMemo, useState, useEffect } from "react";
import { Modal, Button, Form, Table, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { createOrUpdateOrder } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog } from "../../helper/DialogManager";
import CustomDatePicker from "../../components/CustomDatePicker";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomFormSelect from "../../components/CustomFormSelect";
import { useForm } from "react-hook-form";
import { showErrorAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import type {
    CustomerPaymentRow,
    OrderPaymentExtV1,
    OtherChargeRow,
    PartnerPaymentRow,
} from "../../helper/orderPaymentStorage";
import {
    mergePaymentExtension,
    computeTaxCommissionAmounts,
    otherChargesTotal,
    sumCustomerAmounts,
    sumPartnerAmounts,
    resolvePaymentExtension,
    getServiceTaxCommissionPercents,
    customerPaidBalanceForEdit,
    partnerPaidBalanceForEdit,
} from "../../helper/orderPaymentStorage";
import {
    getPrimaryServiceItem,
    orderRefundAmount,
    orderRefundBreakdown,
    partnerPaymentsEditLocked,
    resolveOrderOfferBreakdown,
} from "../../helper/orderDisplayHelpers";

const PAY_TYPES = ["COD", "Razor pay", "UPI", "Online", "Cash", "—"].map((t) => ({ value: t, label: t }));

type OrderPaymentEditModalProps = {
    order: OrderModel;
    onClose: () => void;
    onSaved: () => void;
};

const nid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Shared typography for payment edit (matches order info density). */
const FONT_BODY = "0.9375rem";
const FONT_LABEL = "14px";
const FONT_TOTAL = "1.125rem";

const moneyTabular: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
};

/** Match `OrderInfoDialog` section panels. */
const sectionShell: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.08))",
    backgroundColor: "var(--bg-color)",
};

/** Match `OrderInfoDialog` payment sub-cards / bordered tables. */
const paymentSubcard: React.CSSProperties = {
    // borderRadius: "8px",
    // border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.1))",
    backgroundColor: "var(--bg-color)",
};

const tableThStyle: React.CSSProperties = {
    color: "var(--primary-txt-color)",
    fontSize: FONT_LABEL,
    // borderColor: "var(--lb1-border, var(--txtfld-border))",
};

const tablePriceInputStyle: React.CSSProperties = {
    ...moneyTabular,
    marginBottom: 0,
    fontSize: FONT_BODY,
    textAlign: "right",
};

const summaryRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "10px 0",
    fontSize: FONT_BODY,
    borderBottom: "1px solid var(--txtfld-border, rgba(0,0,0,0.08))",
};

const summaryLabel: React.CSSProperties = {
    color: "var(--content-txt-color, #6c757d)",
    fontWeight: 500,
    minWidth: 0,
};

const summaryValue: React.CSSProperties = {
    fontWeight: 600,
    textAlign: "right",
    ...moneyTabular,
};

/** Right column in summary rows (top-aligned with multi-line labels). */
const summaryValueTop: React.CSSProperties = {
    ...summaryValue,
    alignSelf: "flex-start",
};

const summaryTotalWrap: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    paddingTop: "12px",
    marginTop: "8px",
    borderTop: "2px solid var(--txtfld-border, rgba(0,0,0,0.14))",
};

const summaryTotalLabel: React.CSSProperties = {
    fontSize: FONT_TOTAL,
    fontWeight: 700,
    color: "var(--primary-txt-color, #1a1a1a)",
};

const summaryTotalValue: React.CSSProperties = {
    fontSize: FONT_TOTAL,
    fontWeight: 700,
    textAlign: "right",
    color: "var(--primary-color, #0d6efd)",
    ...moneyTabular,
};

const offerSubline: React.CSSProperties = {
    fontSize: FONT_LABEL,
    fontWeight: 500,
    color: "var(--content-txt-color, #6c757d)",
    marginTop: "4px",
    lineHeight: 1.35,
};

const OrderPaymentEditModal: React.FC<OrderPaymentEditModalProps> & {
    show: (order: OrderModel, onSaved: () => void) => void;
} = ({ order, onClose, onSaved }) => {
    const primary = getPrimaryServiceItem(order);
    const partnerLock = partnerPaymentsEditLocked(order);
    const refundN = orderRefundAmount(order);
    const sym = AppConstant.currencySymbol;

    const [ext, setExt] = useState<OrderPaymentExtV1>(() => {
        const base = resolvePaymentExtension(order, primary);
        const { taxPct, commissionPct } = getServiceTaxCommissionPercents(primary, order);
        return { ...base, taxPercent: taxPct, commissionPercent: commissionPct };
    });
    const { register, setValue } = useForm<any>();

    useEffect(() => {
        const base = resolvePaymentExtension(order, primary);
        const { taxPct, commissionPct } = getServiceTaxCommissionPercents(primary, order);
        setExt({ ...base, taxPercent: taxPct, commissionPercent: commissionPct });
    }, [
        order._id,
        order.comment,
        order.sub_total,
        order.tax,
        order.partner_commison_platform_fee,
        primary,
    ]);

    const { taxPct, commissionPct } = useMemo(
        () => getServiceTaxCommissionPercents(primary, order),
        [primary, order]
    );

    const otherSum = useMemo(() => otherChargesTotal(ext.otherCharges), [ext.otherCharges]);
    const combinedServiceBase = useMemo(
        () => Math.max(0, ext.serviceAmount + otherSum),
        [ext.serviceAmount, otherSum]
    );
    const { taxAmount, commissionAmount } = useMemo(
        () => computeTaxCommissionAmounts(combinedServiceBase, taxPct, commissionPct),
        [combinedServiceBase, taxPct, commissionPct]
    );

    const offerBreakdown = useMemo(() => resolveOrderOfferBreakdown(order), [order]);
    const refundBreakdown = useMemo(() => orderRefundBreakdown(order), [order]);
    const orderDiscount = useMemo(() => Math.max(0, Number(order.discount_amount ?? 0)), [order.discount_amount]);
    const showOfferTemplate = useMemo(() => {
        const b = offerBreakdown;
        return b.totalOfferValue > 0 || b.adminContribution > 0 || b.partnerContribution > 0;
    }, [offerBreakdown]);
    const showOfferLine = useMemo(() => {
        return offerBreakdown.appliedDiscount > 0 || showOfferTemplate;
    }, [offerBreakdown, showOfferTemplate]);

    const showRefundSummary = useMemo(() => {
        const r = refundBreakdown;
        return r.refundAmount > 0 || r.adminCommission > 0 || r.partnerWallet > 0;
    }, [refundBreakdown]);

    const preAdjustTotal = useMemo(
        () => Math.max(0, combinedServiceBase + taxAmount + commissionAmount - refundN),
        [combinedServiceBase, taxAmount, commissionAmount, refundN]
    );
    const finalTotal = useMemo(
        () =>
            Math.max(
                0,
                preAdjustTotal - offerBreakdown.appliedDiscount - orderDiscount
            ),
        [preAdjustTotal, offerBreakdown.appliedDiscount, orderDiscount]
    );

    /** Partner obligation before tax/commission: service + other charges minus partner offer share. */
    const partnerDueTotal = useMemo(
        () => Math.max(0, combinedServiceBase - offerBreakdown.partnerContribution),
        [combinedServiceBase, offerBreakdown.partnerContribution]
    );

    const customerPaidBal = useMemo(
        () => customerPaidBalanceForEdit(ext, finalTotal, !!order.is_paid),
        [ext, finalTotal, order.is_paid]
    );
    const partnerPaidBal = useMemo(
        () => partnerPaidBalanceForEdit(ext, partnerDueTotal, ext.serviceAmount, !!order.is_paid),
        [ext, partnerDueTotal, order.is_paid]
    );

    const canAddCustomerPayment = customerPaidBal.balance > 0.009;
    const canAddPartnerPayment = !partnerLock && partnerPaidBal.balance > 0.009;

    const mainServiceLabel = primary?.service_info?.name?.trim() || "Main service";

    const updateCustomer = (id: string, patch: Partial<CustomerPaymentRow>) => {
        setExt((e) => ({
            ...e,
            customerPayments: e.customerPayments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
    };

    const updatePartner = (id: string, patch: Partial<PartnerPaymentRow>) => {
        setExt((e) => ({
            ...e,
            partnerPayments: e.partnerPayments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
    };

    const updateOther = (id: string, patch: Partial<OtherChargeRow>) => {
        setExt((e) => ({
            ...e,
            otherCharges: e.otherCharges.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
    };

    const addOtherServiceChargeRow = () => {
        setExt((e) => ({
            ...e,
            otherCharges: [...e.otherCharges, { id: nid(), amount: 0, description: "", serviceName: "" }],
        }));
    };

    const removeOtherChargeRow = (id: string) => {
        setExt((e) => ({ ...e, otherCharges: e.otherCharges.filter((r) => r.id !== id) }));
    };

    const confirmRemoveOtherChargeRow = (id: string) => {
        openConfirmDialog(
            "Are you sure you want to remove this additional service charge? This cannot be undone.",
            "Delete",
            "Cancel",
            () => removeOtherChargeRow(id)
        );
    };

    const confirmRemoveCustomerPaymentRow = (id: string) => {
        openConfirmDialog(
            "Are you sure you want to delete this user payment entry?",
            "Delete",
            "Cancel",
            () =>
                setExt((e) => ({
                    ...e,
                    customerPayments: e.customerPayments.filter((r) => r.id !== id),
                }))
        );
    };

    const confirmRemovePartnerPaymentRow = (id: string) => {
        openConfirmDialog(
            "Are you sure you want to delete this partner payment entry?",
            "Delete",
            "Cancel",
            () =>
                setExt((e) => ({
                    ...e,
                    partnerPayments: e.partnerPayments.filter((r) => r.id !== id),
                }))
        );
    };

    const save = async () => {
        if (ext.serviceAmount < 0) {
            showErrorAlert("Service amount cannot be negative.");
            return;
        }
        const custSum = sumCustomerAmounts(ext.customerPayments);
        const partSum = sumPartnerAmounts(ext.partnerPayments);
        if (custSum > finalTotal + 0.01) {
            showErrorAlert("Sum of user payment amounts cannot exceed the final total.");
            return;
        }
        if (!partnerLock && partSum > partnerDueTotal + 0.01) {
            showErrorAlert(
                "Sum of partner payment amounts cannot exceed the partner total (service charges minus partner offer share, excluding tax and commission)."
            );
            return;
        }

        const newComment = mergePaymentExtension(order.comment, ext);
        const ok = await createOrUpdateOrder(
            {
                order_status: order.order_status,
                sub_total: ext.serviceAmount,
                tax: taxAmount,
                partner_commison_platform_fee: commissionAmount,
                total_price: finalTotal,
                is_paid: customerPaidBal.totalPaid >= finalTotal - 0.01,
                payment_mode_id: Number(order.payment_mode_id ?? 2),
                comment: newComment,
            },
            true,
            order._id
        );
        if (ok) {
            onClose();
            onSaved();
        }
    };

    return (
        <Modal show onHide={onClose} centered size="xl" dialogClassName="custom-big-modal" enforceFocus={false}>
            <div className="custom-order-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Edit order payments
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "75vh", overflowY: "auto", fontSize: FONT_BODY }}>
                {/* Services */}
                <section className="custom-other-details mt-2" style={sectionShell}>
                    <Row className="align-items-center mb-3 pb-2 border-bottom">
                        <Col>
                            <h3 className="mb-0">Services</h3>
                        </Col>
                    </Row>
                    <div className="table-responsive" style={paymentSubcard}>
                        <Table
                            responsive
                            bordered
                            size="sm"
                            className="mb-0 align-middle"
                            style={{ color: "var(--content-txt-color)",  width: "100%" }}
                        >
                            <colgroup>
                                <col style={{ width: 50 }} />
                                <col style={{ width: 250 }} />
                                <col />
                                <col style={{ width: 120 }} />
                                <col style={{ width: 44}}/>
                            </colgroup>
                            <thead className="table-light">
                                <tr style={{ borderColor: "var(--lb1-border, var(--txtfld-border))" }}>
                                    <th className="text-center fw-semibold" style={tableThStyle}>
                                        S.No
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Service name
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Description
                                    </th>
                                    <th className="text-end fw-semibold" style={tableThStyle}>
                                        Price
                                    </th>
                                    <th className="text-center fw-semibold" style={tableThStyle} aria-label="Add or remove row" />
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="align-middle text-center fw-medium">1</td>
                                    <td className="fw-semibold text-break align-middle text-wrap" style={{ fontSize: FONT_BODY }}>
                                        {mainServiceLabel}
                                    </td>
                                    <td className="text-muted align-middle text-wrap" style={{ fontSize: FONT_BODY }}>
                                        —
                                    </td>
                                    <td className="align-middle">
                                        <CustomFormInput
                                            label=""
                                            controlId="order-payment-main-service-amount"
                                            placeholder="0.00"
                                            register={register}
                                            asCol={false}
                                            inputType="text"
                                            inputClassName="text-end"
                                            inputStyle={tablePriceInputStyle}
                                            value={ext.serviceAmount === 0 ? "" : String(ext.serviceAmount)}
                                            onChange={(val) => {
                                                const t = val.trim();
                                                if (t === "") {
                                                    setExt((x) => ({ ...x, serviceAmount: 0 }));
                                                    return;
                                                }
                                                const n = parseFloat(t);
                                                if (!Number.isNaN(n) && n >= 0) {
                                                    setExt((x) => ({ ...x, serviceAmount: n }));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="text-center align-middle">
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 text-success"
                                            title="Add other service charge"
                                            aria-label="Add other service charge"
                                            onClick={addOtherServiceChargeRow}
                                        >
                                            <i className="bi bi-plus-circle fs-5" aria-hidden />
                                        </button>
                                    </td>
                                </tr>
                                {ext.otherCharges.map((row, idx) => (
                                    <tr key={row.id}>
                                        <td className="align-middle text-center fw-medium">{idx + 2}</td>
                                        <td className="align-middle">
                                            <Form.Control
                                                size="sm"
                                                className="custom-form-input"
                                                style={{ fontSize: FONT_BODY }}
                                                value={row.serviceName ?? ""}
                                                onChange={(e) =>
                                                    updateOther(row.id, { serviceName: e.target.value })
                                                }
                                            />
                                        </td>
                                        <td className="align-middle text-wrap" style={{ wordBreak: "break-word" }}>
                                            <Form.Control
                                                size="sm"
                                                className="custom-form-input"
                                                style={{ fontSize: FONT_BODY }}
                                                value={row.description}
                                                onChange={(e) =>
                                                    updateOther(row.id, { description: e.target.value })
                                                }
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <CustomFormInput
                                                label=""
                                                controlId={`order-payment-other-amt-${row.id}`}
                                                placeholder="0.00"
                                                register={register}
                                                asCol={false}
                                                inputType="text"
                                                inputClassName="text-end"
                                                inputStyle={tablePriceInputStyle}
                                                value={row.amount === 0 ? "" : String(row.amount)}
                                                onChange={(val) => {
                                                    const t = val.trim();
                                                    if (t === "") {
                                                        updateOther(row.id, { amount: 0 });
                                                        return;
                                                    }
                                                    const n = parseFloat(t);
                                                    if (!Number.isNaN(n) && n >= 0) {
                                                        updateOther(row.id, { amount: n });
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="text-center align-middle">
                                            <i
                                                className="bi bi-trash text-danger fs-6"
                                                role="button"
                                                tabIndex={0}
                                                title="Remove row"
                                                aria-label="Remove other service charge row"
                                                onClick={() => confirmRemoveOtherChargeRow(row.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key !== "Enter" && e.key !== " ") return;
                                                    e.preventDefault();
                                                    confirmRemoveOtherChargeRow(row.id);
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </section>

                {/* Price summary */}
                <section className="custom-other-details mt-3" style={sectionShell}>
                    <Row className="align-items-center mb-3 pb-2 border-bottom">
                        <Col>
                            <h3 className="mb-0">Price summary</h3>
                        </Col>
                    </Row>
                    <div>
                        <div style={summaryRow}>
                            <span style={summaryLabel}>Total services price</span>
                            <span style={summaryValueTop}>
                                {sym}
                                {combinedServiceBase.toFixed(2)}
                            </span>
                        </div>
                        <div style={summaryRow}>
                            <span style={summaryLabel}>Tax ({taxPct}%)</span>
                            <span style={summaryValueTop}>
                                {sym}
                                {taxAmount.toFixed(2)}
                            </span>
                        </div>
                        <div style={summaryRow}>
                            <span style={summaryLabel}>Commission ({commissionPct}%)</span>
                            <span style={summaryValueTop}>
                                {sym}
                                {commissionAmount.toFixed(2)}
                            </span>
                        </div>
                        {showOfferLine ? (
                            <div style={summaryRow}>
                                <div style={{ minWidth: 0 }}>
                                    <span style={{ ...summaryLabel, color: "var(--primary-txt-color, #1a1a1a)", fontWeight: 600 }}>
                                        Offer
                                    </span>
                                    {offerBreakdown.offerCode ? (
                                        <span className="ms-1 rounded-pill border px-2 py-0 align-middle" style={{ fontSize: FONT_LABEL, fontWeight: 600 }}>
                                            {offerBreakdown.offerCode}
                                        </span>
                                    ) : null}
                                    {showOfferTemplate ? (
                                        <div style={offerSubline}>
                                            (
                                            Total offer value {sym}
                                            {offerBreakdown.totalOfferValue.toFixed(2)}
                                            {" · "}
                                            Admin {sym}
                                            {offerBreakdown.adminContribution.toFixed(2)}
                                            {" · "}
                                            Partner {sym}
                                            {offerBreakdown.partnerContribution.toFixed(2)}
                                            )
                                        </div>
                                    ) : offerBreakdown.offerName?.trim() ? (
                                        <div style={offerSubline}>({offerBreakdown.offerName.trim()})</div>
                                    ) : null}
                                </div>
                                <span style={{ ...summaryValueTop, color: "#198754" }}>
                                    {offerBreakdown.appliedDiscount > 0 ? "−" : ""}
                                    {sym}
                                    {offerBreakdown.appliedDiscount.toFixed(2)}
                                </span>
                            </div>
                        ) : null}
                        {orderDiscount > 0 ? (
                            <div style={summaryRow}>
                                <span style={summaryLabel}>Discount</span>
                                <span style={{ ...summaryValueTop, color: "#198754" }}>
                                    −{sym}
                                    {orderDiscount.toFixed(2)}
                                </span>
                            </div>
                        ) : null}
                        {refundN > 0 ? (
                            <div style={summaryRow}>
                                <div style={{ minWidth: 0 }}>
                                    <span style={summaryLabel}>Refund</span>
                                    {showRefundSummary ? (
                                        <div style={offerSubline}>
                                            (
                                            Admin Commission {sym}
                                            {refundBreakdown.adminCommission.toFixed(2)}
                                            {" · "}
                                            Partner Wallet {sym}
                                            {refundBreakdown.partnerWallet.toFixed(2)}
                                            )
                                        </div>
                                    ) : null}
                                </div>
                                <span style={{ ...summaryValueTop, color: "#dc3545" }}>
                                    −{sym}
                                    {(refundBreakdown.refundAmount || refundN).toFixed(2)}
                                </span>
                            </div>
                        ) : null}
                        <div style={summaryTotalWrap}>
                            <span style={summaryTotalLabel}>Final total</span>
                            <span style={summaryTotalValue}>
                                {sym}
                                {finalTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Customer payments */}
                <section className="custom-other-details mt-3" style={sectionShell}>
                    <Row className="align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap g-2">
                        <Col xs="auto" className="me-auto d-flex flex-wrap align-items-baseline gap-2 gap-md-3">
                            <h3 className="mb-0">User payments</h3>
                            <span className="text-secondary" style={{ fontSize: FONT_LABEL }}>
                                Final total
                            </span>
                            <span className="fw-semibold" style={{ ...moneyTabular, fontSize: FONT_BODY }}>
                                {sym}
                                {finalTotal.toFixed(2)}
                            </span>
                        </Col>
                        <Col xs="auto">
                            <Button
                                type="button"
                                className="custom-btn-secondary w-auto"
                                disabled={!canAddCustomerPayment}
                                onClick={() =>
                                    setExt((e) => ({
                                        ...e,
                                        customerPayments: [
                                            ...e.customerPayments,
                                            { id: nid(), date: "", amount: 0, type: "COD", description: "" },
                                        ],
                                    }))
                                }
                            >
                                Add User payment
                            </Button>
                        </Col>
                    </Row>
                    <div style={paymentSubcard}>
                        <Table
                            responsive
                            bordered
                            size="sm"
                            className="mb-0 align-middle"
                            style={{ color: "var(--content-txt-color)", width: "100%" }}
                        >
                            <colgroup>
                                <col style={{ width: 44 }} />
                                <col style={{ width: 170 }} />
                                <col style={{ width: 120 }} />
                                <col style={{ width: 150 }} />
                                <col />
                                <col style={{ width: 44 }} />
                            </colgroup>
                            <thead className="table-light">
                                <tr style={{ borderColor: "var(--lb1-border, var(--txtfld-border))" }}>
                                    <th className="text-center fw-semibold" style={tableThStyle}>
                                        S.No
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Date
                                    </th>
                                    <th className="text-end fw-semibold" style={tableThStyle}>
                                        Paid amount
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Type
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Description
                                    </th>
                                    <th className="text-center fw-semibold" style={tableThStyle} aria-label="Remove row" />
                                </tr>
                            </thead>
                            <tbody>
                                {ext.customerPayments.map((row, idx) => (
                                    <tr key={row.id}>
                                        <td className="align-middle text-center fw-medium">{idx + 1}</td>
                                        <td className="align-middle">
                                            <CustomDatePicker
                                                label=""
                                                controlId={`cdate-${row.id}`}
                                                selectedDate={row.date || null}
                                                onChange={(d) => {
                                                    if (!d) return;
                                                    const y = d.getFullYear();
                                                    const m = `${d.getMonth() + 1}`.padStart(2, "0");
                                                    const day = `${d.getDate()}`.padStart(2, "0");
                                                    updateCustomer(row.id, { date: `${y}-${m}-${day}` });
                                                }}
                                                register={register}
                                                setValue={setValue}
                                                asCol={false}
                                                groupClassName="mb-0"
                                                filterDate={() => true}
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <CustomFormInput
                                                label=""
                                                controlId={`cust-pay-amt-${row.id}`}
                                                placeholder="0.00"
                                                register={register}
                                                asCol={false}
                                                inputType="text"
                                                inputClassName="text-end"
                                                inputStyle={tablePriceInputStyle}
                                                value={row.amount === 0 ? "" : String(row.amount)}
                                                onChange={(val) => {
                                                    const t = val.trim();
                                                    if (t === "") {
                                                        updateCustomer(row.id, { amount: 0 });
                                                        return;
                                                    }
                                                    const n = parseFloat(t);
                                                    if (!Number.isNaN(n) && n >= 0) {
                                                        updateCustomer(row.id, { amount: n });
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <CustomFormSelect
                                                label=""
                                                controlId={`cust-pay-type-${row.id}`}
                                                register={register}
                                                fieldName={`custPayType_${row.id}`}
                                                options={PAY_TYPES}
                                                defaultValue={row.type}
                                                setValue={setValue}
                                                asCol={false}
                                                noBottomMargin
                                                menuPortal
                                                onChange={(e) => updateCustomer(row.id, { type: e.target.value })}
                                            />
                                        </td>
                                        <td className="align-middle text-wrap" style={{ wordBreak: "break-word" }}>
                                            <Form.Control
                                                size="sm"
                                                className="custom-form-input"
                                                style={{ fontSize: FONT_BODY, marginBottom: 0 }}
                                                value={row.description}
                                                onChange={(e) =>
                                                    updateCustomer(row.id, { description: e.target.value })
                                                }
                                            />
                                        </td>
                                        <td className="text-center align-middle">
                                            <i
                                                className="bi bi-trash text-danger fs-6"
                                                role="button"
                                                tabIndex={0}
                                                title="Remove row"
                                                aria-label="Remove user payment row"
                                                onClick={() => confirmRemoveCustomerPaymentRow(row.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key !== "Enter" && e.key !== " ") return;
                                                    e.preventDefault();
                                                    confirmRemoveCustomerPaymentRow(row.id);
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center py-1">
                            <span className="text-secondary">Total Paid</span>
                            <span className="fw-semibold" style={moneyTabular}>
                                {sym}
                                {customerPaidBal.totalPaid.toFixed(2)}
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center py-1">
                            <span className="text-secondary">Balance</span>
                            <span className="fw-semibold" style={moneyTabular}>
                                {sym}
                                {customerPaidBal.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Partner payments */}
                <section className="custom-other-details mt-3 mb-0" style={sectionShell}>
                    <Row className="align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap g-2">
                        <Col xs="auto" className="me-auto d-flex flex-wrap align-items-baseline gap-2 gap-md-3">
                            <h3 className="mb-0">Partner payments</h3>
                            <span className="text-secondary" style={{ fontSize: FONT_LABEL }}>
                                Partner total
                            </span>
                            <span className="fw-semibold" style={{ ...moneyTabular, fontSize: FONT_BODY }}>
                                {sym}
                                {partnerDueTotal.toFixed(2)}
                            </span>
                        </Col>
                        {!partnerLock ? (
                            <Col xs="auto">
                                <Button
                                    type="button"
                                    className="custom-btn-secondary w-auto"
                                    disabled={!canAddPartnerPayment}
                                    onClick={() =>
                                        setExt((e) => ({
                                            ...e,
                                            partnerPayments: [
                                                ...e.partnerPayments,
                                                { id: nid(), date: "", amount: 0, description: "" },
                                            ],
                                        }))
                                    }
                                >
                                    Add partner payment
                                </Button>
                            </Col>
                        ) : null}
                    </Row>
                    <div style={paymentSubcard}>
                        <Table
                            responsive
                            bordered
                            size="sm"
                            className="mb-0 align-middle"
                            style={{ color: "var(--content-txt-color)", width: "100%" }}
                        >
                            <colgroup>
                                <col style={{ width: 44 }} />
                                <col style={{ width: 170 }} />
                                <col style={{ width: 120 }} />
                                <col />
                                <col style={{ width: 44 }} />
                            </colgroup>
                            <thead className="table-light">
                                <tr style={{ borderColor: "var(--lb1-border, var(--txtfld-border))" }}>
                                    <th className="text-center fw-semibold" style={tableThStyle}>
                                        S.No
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Date
                                    </th>
                                    <th className="text-end fw-semibold" style={tableThStyle}>
                                        Paid amount
                                    </th>
                                    <th className="text-start fw-semibold" style={tableThStyle}>
                                        Description
                                    </th>
                                    <th className="text-center fw-semibold" style={tableThStyle} aria-label="Remove row" />
                                </tr>
                            </thead>
                            <tbody>
                                {ext.partnerPayments.map((row, idx) => (
                                    <tr key={row.id}>
                                        <td className="align-middle text-center fw-medium">{idx + 1}</td>
                                        <td className="align-middle">
                                            <CustomDatePicker
                                                label=""
                                                controlId={`pdate-${row.id}`}
                                                selectedDate={row.date || null}
                                                onChange={(d) => {
                                                    if (!d) return;
                                                    const y = d.getFullYear();
                                                    const m = `${d.getMonth() + 1}`.padStart(2, "0");
                                                    const day = `${d.getDate()}`.padStart(2, "0");
                                                    updatePartner(row.id, { date: `${y}-${m}-${day}` });
                                                }}
                                                register={register}
                                                setValue={setValue}
                                                asCol={false}
                                                groupClassName="mb-0"
                                                filterDate={() => true}
                                            />
                                        </td>
                                        <td className="align-middle">
                                            <CustomFormInput
                                                label=""
                                                controlId={`partner-pay-amt-${row.id}`}
                                                placeholder="0.00"
                                                register={register}
                                                asCol={false}
                                                inputType="text"
                                                inputClassName="text-end"
                                                inputStyle={tablePriceInputStyle}
                                                isEditable={!partnerLock}
                                                value={row.amount === 0 ? "" : String(row.amount)}
                                                onChange={(val) => {
                                                    if (partnerLock) return;
                                                    const t = val.trim();
                                                    if (t === "") {
                                                        updatePartner(row.id, { amount: 0 });
                                                        return;
                                                    }
                                                    const n = parseFloat(t);
                                                    if (!Number.isNaN(n) && n >= 0) {
                                                        updatePartner(row.id, { amount: n });
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="align-middle text-wrap" style={{ wordBreak: "break-word" }}>
                                            <Form.Control
                                                size="sm"
                                                className="custom-form-input"
                                                style={{ fontSize: FONT_BODY, marginBottom: 0 }}
                                                value={row.description}
                                                disabled={partnerLock}
                                                onChange={(e) =>
                                                    updatePartner(row.id, { description: e.target.value })
                                                }
                                            />
                                        </td>
                                        <td className="text-center align-middle">
                                            {!partnerLock && (
                                                <i
                                                    className="bi bi-trash text-danger fs-6"
                                                    role="button"
                                                    tabIndex={0}
                                                    title="Remove row"
                                                    aria-label="Remove partner payment row"
                                                    onClick={() => confirmRemovePartnerPaymentRow(row.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key !== "Enter" && e.key !== " ") return;
                                                        e.preventDefault();
                                                        confirmRemovePartnerPaymentRow(row.id);
                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="mt-3 pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center py-1">
                            <span className="text-secondary">Total Paid</span>
                            <span className="fw-semibold" style={moneyTabular}>
                                {sym}
                                {partnerPaidBal.totalPaid.toFixed(2)}
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center py-1">
                            <span className="text-secondary">Balance</span>
                            <span className="fw-semibold" style={moneyTabular}>
                                {sym}
                                {partnerPaidBal.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </section>

                <Row className="mt-4">
                    <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                        <Button type="button" className="custom-btn-primary" onClick={() => void save()}>
                            Save
                        </Button>
                        <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                            Cancel
                        </Button>
                    </Col>
                </Row>
            </Modal.Body>
            </div>
        </Modal>
    );
};

export function showOrderPaymentEditModal(order: OrderModel, onSaved: () => void) {
    openDialog("order-payment-edit-modal", (close) => (
        <OrderPaymentEditModal order={order} onClose={close} onSaved={onSaved} />
    ));
}

OrderPaymentEditModal.show = showOrderPaymentEditModal;

export default OrderPaymentEditModal;
