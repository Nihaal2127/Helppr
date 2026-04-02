import React, { useEffect, useState } from "react";
import { Button, Col, Modal, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import { CustomFormInput } from "../../../components/CustomFormInput";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { showErrorAlert } from "../../../helper/alertHelper";

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

export type RefundFormPayload = {
  order_unique_id: string;
  user_name: string;
  total_amount: number;
  refund_amount: number;
  from_admin_commission: number;
  from_partner_wallet: number;
  created_at: string;
};

type AddEditRefundProps = {
  show: boolean;
  onHide: () => void;
  refundData?: RefundRow | null;
  onSave: (payload: RefundFormPayload) => void | Promise<void>;
  isSubmitting?: boolean;
};

const AddEditRefund: React.FC<AddEditRefundProps> = ({
  show,
  onHide,
  refundData = null,
  onSave,
  isSubmitting = false,
}) => {
  const { register, setValue } = useForm();
  const [orderId, setOrderId] = useState("");
  const [userName, setUserName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [fromAdminCommission, setFromAdminCommission] = useState("");
  const [fromPartnerWallet, setFromPartnerWallet] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (show) {
      setOrderId(refundData?.order_unique_id || "");
      setUserName(refundData?.user_name || "");
      setTotalAmount(
        refundData?.total_amount !== undefined ? String(refundData.total_amount) : ""
      );
      setRefundAmount(
        refundData?.refund_amount !== undefined ? String(refundData.refund_amount) : ""
      );
      setFromAdminCommission(
        refundData?.from_admin_commission !== undefined
          ? String(refundData.from_admin_commission)
          : ""
      );
      setFromPartnerWallet(
        refundData?.from_partner_wallet !== undefined
          ? String(refundData.from_partner_wallet)
          : ""
      );
      setDate(refundData?.created_at ? refundData.created_at.slice(0, 10) : "");
    }
  }, [show, refundData]);

  const resetForm = () => {
    setOrderId("");
    setUserName("");
    setTotalAmount("");
    setRefundAmount("");
    setFromAdminCommission("");
    setFromPartnerWallet("");
    setDate("");
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const handleSubmit = async () => {
    if (!orderId.trim()) {
      showErrorAlert("Please enter Order ID.");
      return;
    }

    if (!userName.trim()) {
      showErrorAlert("Please enter User Name.");
      return;
    }

    if (!totalAmount.trim() || Number(totalAmount) < 0) {
      showErrorAlert("Please enter valid Total Amount.");
      return;
    }

    if (!refundAmount.trim() || Number(refundAmount) < 0) {
      showErrorAlert("Please enter valid Refund Amount.");
      return;
    }

    if (fromAdminCommission && Number(fromAdminCommission) < 0) {
      showErrorAlert("Please enter valid Admin Commission Amount.");
      return;
    }

    if (fromPartnerWallet && Number(fromPartnerWallet) < 0) {
      showErrorAlert("Please enter valid Partner Wallet Amount.");
      return;
    }

    if (!date.trim()) {
      showErrorAlert("Please select Date.");
      return;
    }

    await onSave({
      order_unique_id: orderId.trim(),
      user_name: userName.trim(),
      total_amount: Number(totalAmount),
      refund_amount: Number(refundAmount),
      from_admin_commission: fromAdminCommission ? Number(fromAdminCommission) : 0,
      from_partner_wallet: fromPartnerWallet ? Number(fromPartnerWallet) : 0,
      created_at: date,
    });

    resetForm();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="border-bottom-0 pb-0">
        <Modal.Title className="fw-bold">Add Refund</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3">
        <Row className="g-3">
          <Col md={6}>
            <CustomFormInput
              label="Order ID"
              controlId="order_id"
              placeholder="Enter Order ID"
              register={register}
              asCol={false}
              value={orderId}
              onChange={(value) => setOrderId(value)}
            />
          </Col>

          <Col md={6}>
            <CustomFormInput
              label="User Name"
              controlId="user_name"
              placeholder="Enter User Name"
              register={register}
              asCol={false}
              value={userName}
              onChange={(value) => setUserName(value)}
            />
          </Col>

          <Col md={6}>
            <CustomFormInput
              label="Total Amount"
              controlId="total_amount"
              placeholder="Enter Total Amount"
              register={register}
              asCol={false}
              inputType="number"
              value={totalAmount}
              onChange={(value) => setTotalAmount(value)}
            />
          </Col>

          <Col md={6}>
            <CustomFormInput
              label="Refund Amount"
              controlId="refund_amount"
              placeholder="Enter Refund Amount"
              register={register}
              asCol={false}
              inputType="number"
              value={refundAmount}
              onChange={(value) => setRefundAmount(value)}
            />
          </Col>

          <Col md={6}>
            <CustomFormInput
              label="From Admin Commission"
              controlId="from_admin_commission"
              placeholder="Enter Admin Commission Amount"
              register={register}
              asCol={false}
              inputType="number"
              value={fromAdminCommission}
              onChange={(value) => setFromAdminCommission(value)}
            />
          </Col>

          <Col md={6}>
            <CustomFormInput
              label="From Partner Wallet"
              controlId="from_partner_wallet"
              placeholder="Enter Partner Wallet Amount"
              register={register}
              asCol={false}
              inputType="number"
              value={fromPartnerWallet}
              onChange={(value) => setFromPartnerWallet(value)}
            />
          </Col>

          <Col md={6}>
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
              groupClassName="mb-0 w-100"
              placeholderText="Select Date"
              filterDate={() => true}
            />
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="border-top-0 pt-0">
        <Button variant="secondary" type="button" onClick={handleClose}>
          Cancel
        </Button>

        <Button className="btn-danger" type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddEditRefund;