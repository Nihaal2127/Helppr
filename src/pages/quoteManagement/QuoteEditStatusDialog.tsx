import React, { useEffect } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";
import CustomFormSelect from "../../components/CustomFormSelect";

type QuoteEditStatusDialogProps = {
  quoteId: string;
  defaultStatus: string;
  onClose: () => void;
  onSaved: (status: string) => void;
};

type FormValues = {
  status: string;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const normalizeStatus = (value: string): string => value.trim().toLowerCase();

const QuoteEditStatusDialog: React.FC<QuoteEditStatusDialogProps> & {
  show: (quoteId: string, defaultStatus: string, onSaved: (status: string) => void) => void;
} = ({ quoteId, defaultStatus, onClose, onSaved }) => {
  const {
    register,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      status: normalizeStatus(defaultStatus) || "new",
    },
  });

  useEffect(() => {
    reset({
      status: normalizeStatus(defaultStatus) || "new",
    });
  }, [defaultStatus, reset]);

  const onSubmit = (data: FormValues) => {
    const next = normalizeStatus(data.status);
    if (!next) return;
    onSaved(next);
    showSuccessAlert("Quote status updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit quote status
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <p className="text-muted small mb-3">Quote ID: {quoteId}</p>
        <form noValidate name="quote-edit-status-form" onSubmit={handleSubmit(onSubmit)}>
          <Row className="align-items-center mt-2">
            <Col sm={4} className="d-flex align-items-center">
              <label className="custom-profile-lable">Quote status</label>
            </Col>
            <Col>
              <CustomFormSelect
                label=""
                controlId="quote_status"
                options={STATUS_OPTIONS}
                register={register as any}
                fieldName="status"
                asCol={false}
                defaultValue={normalizeStatus(defaultStatus) || "new"}
                setValue={setValue as any}
                placeholder="Select status"
              />
              {errors.status?.message && <div className="text-danger small mt-1">{errors.status.message}</div>}
            </Col>
          </Row>

          <Row className="mt-4">
            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
              <Button type="submit" className="custom-btn-primary">
                Save
              </Button>
              <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                Cancel
              </Button>
            </Col>
          </Row>
        </form>
      </Modal.Body>
    </Modal>
  );
};

QuoteEditStatusDialog.show = (
  quoteId: string,
  defaultStatus: string,
  onSaved: (status: string) => void
) => {
  openDialog("quote-edit-status-modal", (close) => (
    <QuoteEditStatusDialog
      quoteId={quoteId}
      defaultStatus={defaultStatus}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditStatusDialog;

