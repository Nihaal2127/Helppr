import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Col, Modal, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { showErrorAlert } from "../../../helper/alertHelper";
import { AppConstant } from "../../../constant/AppConstant";
import "./AddEditRefund.scss";

export type RefundRow = {
  _id: string;
  order_id: string;
  order_unique_id: string;
  user_name: string;
  total_amount: number;
  refund_amount?: number;
  from_admin_commission?: number;
  from_partner_wallet?: number;
  created_at?: string | null;
};

/** One row per order for the refund modal — same source as refunds list (`fetchOrder`). */
export type RefundOrderOption = {
  _id: string;
  order_unique_id: string;
  user_name: string;
  total_amount: number;
  admin_earning: number;
  partner_wallet_total: number;
};

export type RefundFormPayload = {
  order_id: string;
  order_unique_id: string;
  user_name: string;
  total_amount: number;
  refund_amount: number;
  from_admin_commission: number;
  from_partner_wallet: number;
  created_at: string;
  refund_type: "total" | "partial" | null;
};

type AddEditRefundProps = {
  show: boolean;
  onHide: () => void;
  orderOptions: RefundOrderOption[];
  ordersLoading?: boolean;
  refundData?: RefundRow | null;
  onSave: (payload: RefundFormPayload) => void | Promise<void>;
  isSubmitting?: boolean;
};

const REFUND_TYPE_OPTIONS = [
  { value: "total", label: "Total" },
  { value: "partial", label: "Partial" },
];

const AddEditRefund: React.FC<AddEditRefundProps> = ({
  show,
  onHide,
  orderOptions,
  ordersLoading = false,
  refundData = null,
  onSave,
  isSubmitting = false,
}) => {
  const { register, setValue } = useForm();
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [refundType, setRefundType] = useState<"total" | "partial" | null>(null);
  const [partialDraft, setPartialDraft] = useState({
    refund_amount: "",
    from_admin_commission: "",
    from_partner_wallet: "",
  });
  const [date, setDate] = useState("");

  const selectedOrder = useMemo(
    () => orderOptions.find((o) => o._id === selectedOrderId) ?? null,
    [orderOptions, selectedOrderId]
  );

  const computedAmounts = useMemo(() => {
    if (!selectedOrder) return null;
    return {
      refund_amount: selectedOrder.total_amount,
      from_admin_commission: selectedOrder.admin_earning,
      from_partner_wallet: selectedOrder.partner_wallet_total,
    };
  }, [selectedOrder]);

  const sym = AppConstant.currencySymbol;

  const seedPartialFromOrder = useCallback((order: RefundOrderOption) => {
    setPartialDraft({
      refund_amount: String(order.total_amount),
      from_admin_commission: String(order.admin_earning),
      from_partner_wallet: String(order.partner_wallet_total),
    });
  }, []);

  const resetForm = useCallback(() => {
    setSelectedOrderId("");
    setRefundType(null);
    setPartialDraft({ refund_amount: "", from_admin_commission: "", from_partner_wallet: "" });
    setDate("");
    setValue("refund_order_id", "", { shouldValidate: false });
    setValue("refund_type_field", "", { shouldValidate: false });
  }, [setValue]);

  const modalWasOpenRef = useRef(false);

  useEffect(() => {
    if (!show) {
      modalWasOpenRef.current = false;
      return;
    }

    const justOpened = !modalWasOpenRef.current;
    modalWasOpenRef.current = true;

    if (refundData?.order_id || refundData?.order_unique_id) {
      const match = orderOptions.find(
        (o) =>
          o._id === refundData.order_id ||
          o.order_unique_id === refundData.order_unique_id
      );
      if (match) {
        setSelectedOrderId(match._id);
        setRefundType("partial");
        setPartialDraft({
          refund_amount:
            refundData.refund_amount !== undefined ? String(refundData.refund_amount) : String(match.total_amount),
          from_admin_commission:
            refundData.from_admin_commission !== undefined
              ? String(refundData.from_admin_commission)
              : String(match.admin_earning),
          from_partner_wallet:
            refundData.from_partner_wallet !== undefined
              ? String(refundData.from_partner_wallet)
              : String(match.partner_wallet_total),
        });
        setDate(refundData.created_at ? refundData.created_at.slice(0, 10) : "");
        return;
      }
      if (justOpened && orderOptions.length > 0) {
        resetForm();
        setDate(new Date().toISOString().slice(0, 10));
      }
      return;
    }

    if (justOpened) {
      resetForm();
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [show, refundData, orderOptions, resetForm]);

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRefundType(null);
    setValue("refund_type_field", "", { shouldValidate: false });
    const next = orderOptions.find((o) => o._id === orderId);
    if (next) {
      seedPartialFromOrder(next);
    } else {
      setPartialDraft({ refund_amount: "", from_admin_commission: "", from_partner_wallet: "" });
    }
  };

  const handleRefundTypeSelectChange = (e: { target: { value: string } }) => {
    const raw = e.target.value;
    const next = raw === "" ? null : (raw as "total" | "partial");
    setRefundType(next);
    if (next === "partial" && selectedOrder) {
      seedPartialFromOrder(selectedOrder);
    }
  };

  const readOnlyAmountProps = {
    register,
    asCol: false,
    isEditable: false,
  };

  const handleSubmit = async () => {
    if (!selectedOrder) {
      showErrorAlert("Please select an order.");
      return;
    }

    if (refundType !== "total" && refundType !== "partial") {
      showErrorAlert("Please select a refund type.");
      return;
    }

    const totalAmt = selectedOrder.total_amount;
    let refundNum: number;
    let adminNum: number;
    let partnerNum: number;

    if (refundType === "total") {
      if (!computedAmounts) return;
      refundNum = computedAmounts.refund_amount;
      adminNum = computedAmounts.from_admin_commission;
      partnerNum = computedAmounts.from_partner_wallet;
    } else {
      if (!partialDraft.refund_amount.trim() || Number(partialDraft.refund_amount) < 0) {
        showErrorAlert("Please enter a valid Refund Amount.");
        return;
      }
      refundNum = Number(partialDraft.refund_amount);
      if (Number.isNaN(refundNum)) {
        showErrorAlert("Please enter a valid Refund Amount.");
        return;
      }
      if (partialDraft.from_admin_commission.trim() === "" || Number(partialDraft.from_admin_commission) < 0) {
        showErrorAlert("Please enter a valid Admin Commission amount.");
        return;
      }
      if (partialDraft.from_partner_wallet.trim() === "" || Number(partialDraft.from_partner_wallet) < 0) {
        showErrorAlert("Please enter a valid Partner Wallet amount.");
        return;
      }
      adminNum = Number(partialDraft.from_admin_commission);
      partnerNum = Number(partialDraft.from_partner_wallet);
      if (Number.isNaN(adminNum) || Number.isNaN(partnerNum)) {
        showErrorAlert("Please enter valid numeric amounts.");
        return;
      }
      if (refundNum > totalAmt + 0.0001) {
        showErrorAlert(`Refund Amount cannot exceed Total Amount (${sym}${totalAmt.toFixed(2)}).`);
        return;
      }
    }

    if (!date.trim()) {
      showErrorAlert("Please select Date.");
      return;
    }

    await onSave({
      order_id: selectedOrder._id,
      order_unique_id: selectedOrder.order_unique_id,
      user_name: selectedOrder.user_name,
      total_amount: totalAmt,
      refund_amount: refundNum,
      from_admin_commission: adminNum,
      from_partner_wallet: partnerNum,
      created_at: date,
      refund_type: refundType,
    });

    resetForm();
  };

  const orderSelectOptions = useMemo(
    () =>
      orderOptions.map((o) => {
        const name = (o.user_name ?? "").trim();
        const showName = name.length > 0 && name !== "-";
        return {
          value: o._id,
          label: showName ? `${o.order_unique_id} — ${name}` : String(o.order_unique_id),
        };
      }),
    [orderOptions]
  );

  const showOrderDetails = Boolean(selectedOrder);
  const showRefundBreakdown = showOrderDetails;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" enforceFocus={false} scrollable>
      <Modal.Header className="py-3 px-4 border-bottom-0 position-relative">
        <Modal.Title as="h5" className="custom-modal-title fw-bold pe-5">
          Add Refund
        </Modal.Title>
        <CustomCloseButton onClose={handleClose} />
      </Modal.Header>

      <Modal.Body className="px-4 pb-3 pt-0" style={{ maxHeight: "75vh" }}>
        <div className="add-edit-refund-modal">
        <Row className="g-3 mt-1">
          <Col xs={12}>
            {ordersLoading ? (
              <div className="text-muted small">Loading orders…</div>
            ) : orderSelectOptions.length === 0 ? (
              <div className="text-muted small">No orders available.</div>
            ) : (
              <CustomFormSelect
                label="Order ID"
                controlId="refund_order_select"
                register={register as unknown as UseFormRegister<any>}
                options={orderSelectOptions}
                fieldName="refund_order_id"
                defaultValue={selectedOrderId}
                setValue={setValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
                asCol={false}
                menuPortal
                placeholder="Select order"
                onChange={(e) => handleOrderChange(e.target.value)}
              />
            )}
          </Col>

          {showOrderDetails && selectedOrder && (
            <>
              <Col xs={12}>
                <div className="border rounded p-3 bg-light add-edit-refund-inline-fields">
                  <div className="fw-semibold mb-3 small text-uppercase text-muted">Order details</div>
                  <Row className="g-3 align-items-center">
                    {/* <Col xs={12} md={4}>
                      <CustomFormInput
                        label="Order ID"
                        controlId="display_order_unique_id"
                        placeholder=""
                        {...readOnlyAmountProps}
                        value={selectedOrder.order_unique_id}
                      />
                    </Col> */}
                    <Col xs={12} md={4}>
                      <CustomFormInput
                        label="User Name"
                        controlId="display_user_name"
                        placeholder=""
                        {...readOnlyAmountProps}
                        value={selectedOrder.user_name}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <CustomFormInput
                        label="Total Amount"
                        controlId="display_total_amount"
                        placeholder=""
                        {...readOnlyAmountProps}
                        value={`${sym}${selectedOrder.total_amount.toFixed(2)}`}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <CustomFormSelect
                        label="Refund type"
                        controlId="refund_type_select"
                        register={register as unknown as UseFormRegister<any>}
                        options={REFUND_TYPE_OPTIONS}
                        fieldName="refund_type_field"
                        defaultValue={refundType ?? ""}
                        setValue={setValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
                        asCol={false}
                        menuPortal
                        placeholder="Select type"
                        onChange={handleRefundTypeSelectChange}
                      />
                    </Col>
                  </Row>
                </div>
              </Col>

              {showRefundBreakdown && computedAmounts && refundType != null && (
                <Col xs={12}>
                  <div className="border rounded p-3 bg-light add-edit-refund-inline-fields">
                    <div className="fw-semibold mb-3 small text-uppercase text-muted">
                      Refund breakdown
                    </div>
                    <Row className="g-3 align-items-center">
                      <Col xs={12} md={4}>
                        {refundType === "total" ? (
                          <CustomFormInput
                            label="Refund Amount"
                            controlId="refund_amount_ro"
                            placeholder=""
                            {...readOnlyAmountProps}
                            value={`${sym}${computedAmounts.refund_amount.toFixed(2)}`}
                          />
                        ) : (
                          <CustomFormInput
                            label="Refund Amount"
                            controlId="refund_amount_edit"
                            placeholder="0.00"
                            register={register}
                            asCol={false}
                            inputType="number"
                            value={partialDraft.refund_amount}
                            onChange={(v) =>
                              setPartialDraft((d) => ({ ...d, refund_amount: v }))
                            }
                          />
                        )}
                      </Col>
                      <Col xs={12} md={4}>
                        {refundType === "total" ? (
                          <CustomFormInput
                            label="Admin Commission"
                            controlId="admin_commission_ro"
                            placeholder=""
                            {...readOnlyAmountProps}
                            value={`${sym}${computedAmounts.from_admin_commission.toFixed(2)}`}
                          />
                        ) : (
                          <CustomFormInput
                            label="Admin Commission"
                            controlId="admin_commission_edit"
                            placeholder="0.00"
                            register={register}
                            asCol={false}
                            inputType="number"
                            value={partialDraft.from_admin_commission}
                            onChange={(v) =>
                              setPartialDraft((d) => ({ ...d, from_admin_commission: v }))
                            }
                          />
                        )}
                      </Col>
                      <Col xs={12} md={4}>
                        {refundType === "total" ? (
                          <CustomFormInput
                            label="Partner Wallet"
                            controlId="partner_wallet_ro"
                            placeholder=""
                            {...readOnlyAmountProps}
                            value={`${sym}${computedAmounts.from_partner_wallet.toFixed(2)}`}
                          />
                        ) : (
                          <CustomFormInput
                            label="Partner Wallet"
                            controlId="partner_wallet_edit"
                            placeholder="0.00"
                            register={register}
                            asCol={false}
                            inputType="number"
                            value={partialDraft.from_partner_wallet}
                            onChange={(v) =>
                              setPartialDraft((d) => ({ ...d, from_partner_wallet: v }))
                            }
                          />
                        )}
                      </Col>
                    </Row>
                  </div>
                </Col>
              )}

              {/* <Col xs={12} md={6}>
                <CustomDatePicker
                  label="Date"
                  controlId="created_at"
                  selectedDate={date || null}
                  onChange={(selected) => {
                    const value = selected ? selected.toISOString().slice(0, 10) : "";
                    setDate(value);
                  }}
                  register={register as unknown as UseFormRegister<any>}
                  setValue={setValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100 fw-medium"
                  placeholderText="Select Date"
                  filterDate={() => true}
                />
              </Col> */}
            </>
          )}
        </Row>
        </div>
      </Modal.Body>

      {refundType === "partial" && (
        <Modal.Footer className="border-top-0 px-4 pb-4 pt-0">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>

          <Button
            className="btn-danger"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !selectedOrder}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default AddEditRefund;
