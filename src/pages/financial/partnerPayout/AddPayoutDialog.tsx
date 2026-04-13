import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Row, Col, Table, Spinner } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomFormSelect from "../../../components/CustomFormSelect";
import { openDialog } from "../../../helper/DialogManager";
import { fetchUser } from "../../../services/userService";
import { fetchAllFinancialRowsMatching } from "../../../services/financialService";
import { submitPartnerWalletPayout } from "../../../services/partnerPayoutService";
import { FinancialModel } from "../../../models/FinancialModel";
import { UserModel } from "../../../models/UserModel";
import { AppConstant } from "../../../constant/AppConstant";
import { formatDate } from "../../../helper/utility";
import { showErrorAlert } from "../../../helper/alertHelper";

type AddPayoutDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const AddPayoutDialog: React.FC<AddPayoutDialogProps> & {
  show: (onSuccess: () => void) => void;
} = ({ onClose, onSuccess }) => {
  const { register, setValue } = useForm();
  const [partners, setPartners] = useState<UserModel[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [pendingRows, setPendingRows] = useState<FinancialModel[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "razorpay">("cash");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPartners(true);
      /**
       * `getPartnerDropDown` requires `service_id` — it is for “partners who can do this service”
       * (e.g. order assignment). Payout needs every active partner, same source as Partner Payout grid:
       * `getAll` with type 2 (partner).
       */
      const pageSize = 250;
      const first = await fetchUser(false, 2, 1, pageSize, { status: "true" });
      if (cancelled) return;
      if (!first.response) {
        setPartners([]);
        setLoadingPartners(false);
        return;
      }
      let all = [...first.users];
      for (let page = 2; page <= first.totalPages; page++) {
        const next = await fetchUser(false, 2, page, pageSize, { status: "true" });
        if (cancelled) return;
        if (next.response) {
          all = all.concat(next.users);
        }
      }
      setPartners(all);
      setLoadingPartners(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPending = useCallback(async (pid: string) => {
    if (!pid) {
      setPendingRows([]);
      return;
    }
    setLoadingPending(true);
    try {
      const rows = await fetchAllFinancialRowsMatching(
        {
          partner_id: pid,
          partner_paid_status: "1",
          service_status: "3",
        },
        250,
        { skipEnrich: true }
      );
      setPendingRows(rows ?? []);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    void loadPending(partnerId);
  }, [partnerId, loadPending]);

  const totalPending = pendingRows.reduce(
    (s, r) => s + (Number(r.partner_earning) || 0),
    0
  );

  /** Same pool as “Total Pending Amount” — amount available to pay out from pending lines. */
  const walletAmount = totalPending;
  const enterParsed = (() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const pendingAfterPayout = Math.max(0, walletAmount - enterParsed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) {
      showErrorAlert("Please select a partner.");
      return;
    }
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) {
      showErrorAlert("Please enter a valid amount greater than zero.");
      return;
    }
    if (!loadingPending && totalPending <= 0) {
      showErrorAlert("No pending partner earnings found for this partner.");
      return;
    }
    if (!loadingPending && num > walletAmount + 0.0001) {
      showErrorAlert(
        `Amount cannot exceed wallet amount (${AppConstant.currencySymbol}${walletAmount.toFixed(2)}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const ok = await submitPartnerWalletPayout({
        partner_id: partnerId,
        amount: num,
        payment_method: paymentMethod,
        description: description.trim() || undefined,
      });
      if (ok) {
        onClose();
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sym = AppConstant.currencySymbol;
  const partnerOptions = partners.map((p) => ({
    value: p._id,
    label: `${p.user_id ?? p._id}${p.name ? ` — ${p.name}` : ""}`,
  }));
  const paymentMethodOptions = [
    { value: "cash", label: "Cash" },
    { value: "razorpay", label: "Razorpay" },
  ];

  return (
    <Modal show size="lg" onHide={onClose} centered scrollable>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Add Payout
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "75vh" }}>
        <form noValidate onSubmit={handleSubmit}>
          <Row className="mt-2 g-3">
            <Col xs={12}>
              {loadingPartners ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <CustomFormSelect
                  label="Partner ID"
                  controlId="partner_id"
                  register={register as unknown as UseFormRegister<any>}
                  options={partnerOptions}
                  fieldName="partner_id"
                  defaultValue={partnerId}
                  setValue={setValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
                  asCol={false}
                  menuPortal
                  onChange={(e) => setPartnerId(e.target.value)}
                />
              )}
            </Col>

            {partnerId ? (
              <>
                <Col xs={12}>
                  <div className="border rounded p-3 bg-light mb-2">
                    <div className="fw-semibold mb-2">Total pending amount</div>
                    {loadingPending ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <div className="fs-5" style={{ color: "var(--primary-txt-color)" }}>
                        {sym}
                        {totalPending.toFixed(2)}
                      </div>
                    )}
                  </div>
                </Col>

                <Col xs={12}>
                  <div className="fw-semibold mb-2 small">Order-wise pending</div>
                  {loadingPending ? (
                    <Spinner animation="border" size="sm" />
                  ) : pendingRows.length === 0 ? (
                    <p className="text-muted small mb-0">No pending lines for this partner.</p>
                  ) : (
                    <div className="table-responsive border rounded" style={{ maxHeight: "220px" }}>
                      <Table size="sm" className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Order ID</th>
                            <th>Service</th>
                            <th>Service date</th>
                            <th className="text-end">Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingRows.map((r) => (
                            <tr key={r._id}>
                              <td>{r.order_unique_id ?? r.order_id ?? "—"}</td>
                              <td>{r.service_name ?? "—"}</td>
                              <td className="text-nowrap">{formatDate(r.service_date ?? "")}</td>
                              <td className="text-end">
                                {sym}
                                {(Number(r.partner_earning) || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Col>

                <Col xs={12}>
                  <Row className="g-3 align-items-end">
                    <Col xs={12} md={4}>
                      <CustomFormInput
                        label="Wallet amount"
                        controlId="wallet_amount"
                        placeholder="Wallet amount"
                        register={register}
                        asCol={false}
                        value={
                          loadingPending
                            ? "Loading..."
                            : `${sym}${walletAmount.toFixed(2)}`
                        }
                        isEditable={false}
                        inputClassName="custom-form-input--read-only"
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <CustomFormInput
                        label="Pay Now"
                        controlId="pay_now"
                        placeholder="0.00"
                        register={register}
                        asCol={false}
                        inputType="number"
                        value={amount}
                        onChange={(value) => setAmount(value)}
                      />
                    </Col>
                    <Col xs={12} md={4}>
                      <CustomFormInput
                        label="Balance"
                        controlId="balance_amount"
                        placeholder="Balance"
                        register={register}
                        asCol={false}
                        value={
                          loadingPending
                            ? "Loading..."
                            : `${sym}${pendingAfterPayout.toFixed(2)}`
                        }
                        isEditable={false}
                        inputClassName="custom-form-input--read-only"
                      />
                      {/* <Form.Text className="text-muted">Wallet amount − enter amount</Form.Text> */}
                    </Col>
                  </Row>
                </Col>
                <Col xs={12} md={6}>
                  <CustomFormSelect
                    label="Payment method"
                    controlId="payment_method"
                    register={register as unknown as UseFormRegister<any>}
                    options={paymentMethodOptions}
                    fieldName="payment_method"
                    defaultValue={paymentMethod}
                    setValue={setValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
                    asCol={false}
                    menuPortal
                    onChange={(e) => setPaymentMethod(e.target.value as "cash" | "razorpay")}
                  />
                </Col>
                <Col xs={12}>
                  <CustomFormInput
                    label="Description (optional)"
                    controlId="description"
                    placeholder="Notes for this payout"
                    register={register}
                    asCol={false}
                    as="textarea"
                    rows={2}
                    value={description}
                    onChange={(value) => setDescription(value)}
                  />
                </Col>
              </>
            ) : null}
          </Row>

          <Row className="mt-4">
            <Col xs={12} className="d-flex justify-content-end gap-3">
              <Button
                type="button"
                variant="light"
                className="custom-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button> 

            {partnerId ? (
                <Button
                  type="submit"
                  className="custom-btn-primary"
                  disabled={submitting || loadingPartners || loadingPending}
                >
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
            ) : null}
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

AddPayoutDialog.show = (onSuccess: () => void) => {
  openDialog("add-partner-payout-modal", (close) => (
    <AddPayoutDialog onClose={close} onSuccess={onSuccess} />
  ));
};

export default AddPayoutDialog;
