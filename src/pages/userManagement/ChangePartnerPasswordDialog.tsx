import React from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { showErrorAlert } from "../../helper/alertHelper";
import { changePassword } from "../../services/adminService";
import { openDialog } from "../../helper/DialogManager";

type FormValues = {
  new_password: string;
  confirm_password: string;
};

type Props = {
  partnerId: string;
  partnerName?: string;
  onClose: () => void;
  onSaved: () => void;
};

function ChangePartnerPasswordDialogView({
  partnerId,
  partnerName,
  onClose,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    const pw = String(data.new_password ?? "").trim();
    const cf = String(data.confirm_password ?? "").trim();
    if (!pw) {
      showErrorAlert("Please enter a new password.");
      return;
    }
    if (pw !== cf) {
      showErrorAlert("New password and confirmation do not match.");
      return;
    }
    const ok = await changePassword({
      user_id: partnerId,
      type: 2,
      new_password: pw,
      confirm_password: cf,
    });
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal show centered onHide={onClose} dialogClassName="custom-big-modal">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Change partner password
          {partnerName ? ` — ${partnerName}` : ""}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group>
                <Form.Label>New password</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  {...register("new_password", { required: "Required" })}
                />
                {errors.new_password && (
                  <Form.Text className="text-danger">
                    {String(errors.new_password.message ?? "")}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group>
                <Form.Label>Confirm password</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  {...register("confirm_password", { required: "Required" })}
                />
                {errors.confirm_password && (
                  <Form.Text className="text-danger">
                    {String(errors.confirm_password.message ?? "")}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-3 mt-4">
            <Button type="submit" className="custom-btn-primary">
              Save
            </Button>
            <Button type="button" className="custom-btn-secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
}

const ChangePartnerPasswordDialog = Object.assign(ChangePartnerPasswordDialogView, {
  show(partnerId: string, partnerName: string | undefined, onSaved: () => void) {
    openDialog("change-partner-password-modal", (close) => (
      <ChangePartnerPasswordDialogView
        partnerId={partnerId}
        partnerName={partnerName}
        onClose={close}
        onSaved={onSaved}
      />
    ));
  },
}) as typeof ChangePartnerPasswordDialogView & {
  show: (partnerId: string, partnerName: string | undefined, onSaved: () => void) => void;
};

export default ChangePartnerPasswordDialog;
