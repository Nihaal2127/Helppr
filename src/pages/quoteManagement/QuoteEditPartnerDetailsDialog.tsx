import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomTextField from "../../components/CustomTextField";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";

export type QuotePartnerDetailsPatch = {
  partner_name: string;
  partner_user_id: string;
  partner_phone: string;
  partner_city: string;
};

type QuoteEditPartnerDetailsDialogProps = {
  quoteId: string;
  defaults: Partial<QuotePartnerDetailsPatch>;
  onClose: () => void;
  onSaved: (patch: QuotePartnerDetailsPatch) => void;
};

type FormValues = QuotePartnerDetailsPatch;

const QuoteEditPartnerDetailsDialog: React.FC<QuoteEditPartnerDetailsDialogProps> & {
  show: (
    quoteId: string,
    defaults: Partial<QuotePartnerDetailsPatch>,
    onSaved: (patch: QuotePartnerDetailsPatch) => void
  ) => void;
} = ({ quoteId, defaults, onClose, onSaved }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      partner_name: defaults.partner_name ?? "",
      partner_user_id: defaults.partner_user_id ?? "",
      partner_phone: defaults.partner_phone ?? "",
      partner_city: defaults.partner_city ?? "",
    },
  });

  useEffect(() => {
    reset({
      partner_name: defaults.partner_name ?? "",
      partner_user_id: defaults.partner_user_id ?? "",
      partner_phone: defaults.partner_phone ?? "",
      partner_city: defaults.partner_city ?? "",
    });
  }, [defaults, reset]);

  const onSubmit = (data: FormValues) => {
    onSaved({
      partner_name: data.partner_name.trim(),
      partner_user_id: data.partner_user_id.trim(),
      partner_phone: data.partner_phone.trim(),
      partner_city: data.partner_city.trim(),
    });
    showSuccessAlert("Partner details updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Edit partner details
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <p className="text-muted small mb-3">Quote ID: {quoteId}</p>
        <form noValidate name="quote-edit-partner-details-form" onSubmit={handleSubmit(onSubmit)}>
          <CustomTextField
            label="Partner name"
            controlId="partner_name"
            placeholder="Enter partner name"
            register={register}
            error={errors.partner_name}
            validation={{ required: "Partner name is required" }}
          />
          <CustomTextField
            label="Partner ID"
            controlId="partner_user_id"
            placeholder="Enter partner ID"
            register={register}
            error={errors.partner_user_id}
            validation={{ required: "Partner ID is required" }}
          />
          <CustomTextField
            label="Partner phone"
            controlId="partner_phone"
            placeholder="Enter phone number"
            register={register}
            error={errors.partner_phone}
            validation={{
              validate: (v: string) =>
                !v?.trim() || /^[\d\s\-+()]+$/.test(v.trim()) || "Enter a valid phone number",
            }}
          />
          <CustomTextField
            label="Partner location"
            controlId="partner_city"
            placeholder="Enter city / location"
            register={register}
            error={errors.partner_city}
          />
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

QuoteEditPartnerDetailsDialog.show = (
  quoteId: string,
  defaults: Partial<QuotePartnerDetailsPatch>,
  onSaved: (patch: QuotePartnerDetailsPatch) => void
) => {
  openDialog("quote-edit-partner-details-modal", (close) => (
    <QuoteEditPartnerDetailsDialog
      quoteId={quoteId}
      defaults={defaults}
      onClose={close}
      onSaved={onSaved}
    />
  ));
};

export default QuoteEditPartnerDetailsDialog;
