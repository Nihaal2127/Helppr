import React, { useMemo, useState, useEffect } from "react";
import { Modal, Button, Form, Table } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { createOrUpdateOrder } from "../../services/orderService";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog } from "../../helper/DialogManager";
import CustomDatePicker from "../../components/CustomDatePicker";
import { useForm } from "react-hook-form";
import { showErrorAlert } from "../../helper/alertHelper";
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
const FONT_LABEL = "0.8125rem";
const FONT_SECTION = "1rem";
const FONT_TOTAL = "1.125rem";

const moneyTabular: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
};

const billCard: React.CSSProperties = {
    backgroundColor: "var(--bg-color, #f8f9fa)",
    borderRadius: "10px",
    border: "1px solid var(--txtfld-border, rgba(0,0,0,0.1))",
};

/** One major panel (services, price summary, payments). */
const sectionBlock: React.CSSProperties = {
    ...billCard,
    marginBottom: "1.35rem",
};

/** Full-width title strip under a block top edge. */
const sectionBlockHeader: React.CSSProperties = {
    fontSize: FONT_LABEL,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--content-txt-color, #6c757d)",
    marginBottom: "14px",
    paddingBottom: "10px",
    borderBottom: "2px solid var(--txtfld-border, rgba(0,0,0,0.12))",
};

const blockTitleInline: React.CSSProperties = {
    fontSize: FONT_SECTION,
    fontWeight: 700,
    color: "var(--primary-txt-color, #1a1a1a)",
};

const serviceTableShell: React.CSSProperties = {
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid var(--txtfld-border, rgba(0,0,0,0.1))",
    backgroundColor: "#fff",
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

const footerRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    fontSize: FONT_BODY,
};

const footerLabel: React.CSSProperties = {
    color: "var(--content-txt-color, #6c757d)",
    fontWeight: 500,
};

const footerValue: React.CSSProperties = {
    fontWeight: 600,
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
        const { taxPct, commissionPct } = getServiceTaxCommissionPercents(primary);
        return { ...base, taxPercent: taxPct, commissionPercent: commissionPct };
    });
    const { register, setValue } = useForm<any>();
    const [otherDeleteAck, setOtherDeleteAck] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const base = resolvePaymentExtension(order, primary);
        const { taxPct, commissionPct } = getServiceTaxCommissionPercents(primary);
        setExt({ ...base, taxPercent: taxPct, commissionPercent: commissionPct });
    }, [order._id, order.comment, primary]);

    const { taxPct, commissionPct } = useMemo(() => getServiceTaxCommissionPercents(primary), [primary]);

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

    const customerPaidBal = useMemo(
        () => customerPaidBalanceForEdit(ext, finalTotal, !!order.is_paid),
        [ext, finalTotal, order.is_paid]
    );
    const partnerPaidBal = useMemo(
        () => partnerPaidBalanceForEdit(ext, finalTotal, ext.serviceAmount, !!order.is_paid),
        [ext, finalTotal, order.is_paid]
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

    const tryDeleteOtherRow = (id: string) => {
        if (!otherDeleteAck[id]) {
            showErrorAlert("Select the checkbox for this row, then use Delete.");
            return;
        }
        setExt((e) => ({ ...e, otherCharges: e.otherCharges.filter((r) => r.id !== id) }));
        setOtherDeleteAck((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const save = async () => {
        if (ext.serviceAmount < 0) {
            showErrorAlert("Service amount cannot be negative.");
            return;
        }
        const custSum = sumCustomerAmounts(ext.customerPayments);
        const partSum = sumPartnerAmounts(ext.partnerPayments);
        if (custSum > finalTotal + 0.01) {
            showErrorAlert("Sum of customer payment amounts cannot exceed the final total.");
            return;
        }
        if (!partnerLock && partSum > ext.serviceAmount + 0.01) {
            showErrorAlert("Sum of partner payment amounts cannot exceed the service amount.");
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
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Edit order payments
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-3" style={{ maxHeight: "78vh", overflowY: "auto", fontSize: FONT_BODY }}>
                {/* Services */}
                <div className="p-3" style={sectionBlock}>
                    <div style={sectionBlockHeader}>Services</div>
                    <div style={serviceTableShell}>
                        <Table responsive bordered size="sm" className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th
                                        className="text-center fw-semibold text-secondary"
                                        style={{ width: "100px", fontSize: FONT_LABEL, letterSpacing: "0.05em", verticalAlign: "middle" }}
                                    >
                                        <div className="text-uppercase">Select</div>
                                        <div className="text-uppercase mt-1 opacity-75" style={{ fontSize: "0.7rem" }}>
                                            Delete
                                        </div>
                                    </th>
                                    <th
                                        className="text-start fw-semibold text-secondary text-uppercase"
                                        style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, minWidth: "160px" }}
                                    >
                                        Service name
                                    </th>
                                    <th
                                        className="text-start fw-semibold text-secondary text-uppercase"
                                        style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, minWidth: "120px" }}
                                    >
                                        Description
                                    </th>
                                    <th
                                        className="text-end fw-semibold text-secondary text-uppercase"
                                        style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "128px" }}
                                    >
                                        Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="align-middle text-center text-muted small">—</td>
                                    <td className="fw-semibold text-break align-middle" style={{ fontSize: FONT_BODY }}>
                                        {mainServiceLabel}
                                    </td>
                                    <td className="text-muted align-middle" style={{ fontSize: FONT_BODY }}>
                                        —
                                    </td>
                                    <td className="align-middle">
                                        <Form.Control
                                            size="sm"
                                            className="custom-form-input text-end"
                                            style={{ ...moneyTabular, fontSize: FONT_BODY }}
                                            type="number"
                                            min={0}
                                            value={ext.serviceAmount}
                                            onChange={(e) =>
                                                setExt((x) => ({ ...x, serviceAmount: Number(e.target.value) || 0 }))
                                            }
                                        />
                                    </td>
                                </tr>
                                {ext.otherCharges.map((row) => (
                                    <tr key={row.id}>
                                        <td className="align-middle bg-light bg-opacity-50">
                                            <div className="d-flex flex-column align-items-center gap-2 py-2 px-1">
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={!!otherDeleteAck[row.id]}
                                                    onChange={(e) =>
                                                        setOtherDeleteAck((prev) => ({
                                                            ...prev,
                                                            [row.id]: e.target.checked,
                                                        }))
                                                    }
                                                    aria-label="Select row to delete"
                                                    className="m-0"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline-danger"
                                                    className="px-2 py-0"
                                                    style={{ fontSize: FONT_LABEL, minWidth: "4.5rem" }}
                                                    onClick={() => tryDeleteOtherRow(row.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
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
                                        <td className="align-middle">
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
                                            <Form.Control
                                                size="sm"
                                                className="custom-form-input text-end"
                                                style={{ ...moneyTabular, fontSize: FONT_BODY }}
                                                type="number"
                                                min={0}
                                                value={row.amount || ""}
                                                onChange={(e) =>
                                                    updateOther(row.id, { amount: Number(e.target.value) || 0 })
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="d-flex justify-content-end mt-3">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline-primary"
                            style={{ fontSize: FONT_BODY }}
                            onClick={() =>
                                setExt((e) => ({
                                    ...e,
                                    otherCharges: [
                                        ...e.otherCharges,
                                        { id: nid(), amount: 0, description: "", serviceName: "" },
                                    ],
                                }))
                            }
                        >
                            + Add other service charge
                        </Button>
                    </div>
                </div>

                {/* Price summary */}
                <div className="p-3" style={sectionBlock}>
                    <div style={sectionBlockHeader}>Price summary</div>
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
                </div>

                {/* Customer payments */}
                <div className="p-3" style={sectionBlock}>
                    <div
                        className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 mb-0"
                        style={{ borderBottom: "2px solid var(--txtfld-border, rgba(0,0,0,0.1))" }}
                    >
                        <span style={blockTitleInline}>Customer payments</span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline-primary"
                            style={{ fontSize: FONT_BODY }}
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
                            Add customer payment
                        </Button>
                    </div>
                    <div className="mt-3" style={serviceTableShell}>
                        <Table responsive bordered size="sm" className="mb-0 align-middle">
                    <thead className="table-light">
                        <tr>
                            <th className="small fw-semibold text-secondary text-uppercase" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "22%" }}>
                                Date
                            </th>
                            <th className="small fw-semibold text-secondary text-uppercase text-end" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "20%" }}>
                                Paid amount
                            </th>
                            <th className="small fw-semibold text-secondary text-uppercase" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "18%" }}>
                                Type
                            </th>
                            <th className="small fw-semibold text-secondary text-uppercase" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL }}>
                                Description
                            </th>
                            <th style={{ width: "48px" }} aria-label="Delete row" />
                        </tr>
                    </thead>
                    <tbody>
                        {ext.customerPayments.map((row) => (
                            <tr key={row.id}>
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
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        className="custom-form-input text-end"
                                        style={{ ...moneyTabular, fontSize: FONT_BODY }}
                                        value={row.amount || ""}
                                        onChange={(e) =>
                                            updateCustomer(row.id, { amount: Number(e.target.value) || 0 })
                                        }
                                    />
                                </td>
                                <td className="align-middle">
                                    <Form.Select
                                        size="sm"
                                        className="custom-form-input"
                                        style={{ fontSize: FONT_BODY }}
                                        value={row.type}
                                        onChange={(e) => updateCustomer(row.id, { type: e.target.value })}
                                    >
                                        {PAY_TYPES.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </td>
                                <td className="align-middle">
                                    <Form.Control
                                        size="sm"
                                        className="custom-form-input"
                                        style={{ fontSize: FONT_BODY }}
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
                                        onClick={() =>
                                            setExt((e) => ({
                                                ...e,
                                                customerPayments: e.customerPayments.filter((r) => r.id !== row.id),
                                            }))
                                        }
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                    </div>
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: "var(--txtfld-border, rgba(0,0,0,0.12))" }}>
                        <div style={footerRow}>
                            <span style={footerLabel}>Total Paid</span>
                            <span style={footerValue}>
                                {sym}
                                {customerPaidBal.totalPaid.toFixed(2)}
                            </span>
                        </div>
                        <div style={footerRow}>
                            <span style={footerLabel}>Balance</span>
                            <span style={footerValue}>
                                {sym}
                                {customerPaidBal.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Partner payments */}
                <div className="p-3" style={{ ...sectionBlock, marginBottom: 0 }}>
                    <div
                        className="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 mb-0"
                        style={{ borderBottom: "2px solid var(--txtfld-border, rgba(0,0,0,0.1))" }}
                    >
                        <span style={blockTitleInline}>Partner payments</span>
                        {!partnerLock ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline-primary"
                                style={{ fontSize: FONT_BODY }}
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
                        ) : null}
                    </div>
                    <div className="mt-3" style={serviceTableShell}>
                        <Table responsive bordered size="sm" className="mb-0 align-middle">
                    <thead className="table-light">
                        <tr>
                            <th className="small fw-semibold text-secondary text-uppercase" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "26%" }}>
                                Date
                            </th>
                            <th className="small fw-semibold text-secondary text-uppercase text-end" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL, width: "22%" }}>
                                Paid amount
                            </th>
                            <th className="small fw-semibold text-secondary text-uppercase" style={{ letterSpacing: "0.04em", fontSize: FONT_LABEL }}>
                                Description
                            </th>
                            <th style={{ width: "48px" }} aria-label="Delete row" />
                        </tr>
                    </thead>
                    <tbody>
                        {ext.partnerPayments.map((row) => (
                            <tr key={row.id}>
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
                                    <Form.Control
                                        size="sm"
                                        type="number"
                                        className="custom-form-input text-end"
                                        style={{ ...moneyTabular, fontSize: FONT_BODY }}
                                        value={row.amount || ""}
                                        disabled={partnerLock}
                                        onChange={(e) =>
                                            updatePartner(row.id, { amount: Number(e.target.value) || 0 })
                                        }
                                    />
                                </td>
                                <td className="align-middle">
                                    <Form.Control
                                        size="sm"
                                        className="custom-form-input"
                                        style={{ fontSize: FONT_BODY }}
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
                                            onClick={() =>
                                                setExt((e) => ({
                                                    ...e,
                                                    partnerPayments: e.partnerPayments.filter((r) => r.id !== row.id),
                                                }))
                                            }
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                    </div>
                    <div className="mt-3 pt-3 border-top" style={{ borderColor: "var(--txtfld-border, rgba(0,0,0,0.12))" }}>
                        <div style={footerRow}>
                            <span style={footerLabel}>Total Paid</span>
                            <span style={footerValue}>
                                {sym}
                                {partnerPaidBal.totalPaid.toFixed(2)}
                            </span>
                        </div>
                        <div style={footerRow}>
                            <span style={footerLabel}>Balance</span>
                            <span style={footerValue}>
                                {sym}
                                {partnerPaidBal.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button type="button" variant="secondary" className="custom-btn-secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" className="custom-btn-primary" onClick={() => void save()}>
                        Save
                    </Button>
                </div>
            </Modal.Body>
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
