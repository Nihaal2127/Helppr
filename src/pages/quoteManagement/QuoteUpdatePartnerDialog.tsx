import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { fetchQuotePartnerDropDown } from "../../services/quoteService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";

type QuoteUpdatePartnerDialogProps = {
  serviceId?: string;
  defaultPartnerId?: string;
  onClose: () => void;
  onAssigned: (partnerId: string, partnerName: string) => void;
};

const QuoteUpdatePartnerDialog: React.FC<QuoteUpdatePartnerDialogProps> & {
  show: (
    serviceId: string | undefined,
    defaultPartnerId: string | undefined,
    onAssigned: (partnerId: string, partnerName: string) => void
  ) => void;
} = ({ serviceId, defaultPartnerId, onClose, onAssigned }) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const [partners, setPartners] = useState<{ value: string; label: string }[]>([]);
  const fetchRef = useRef(false);

  const loadPartners = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const { partners: records } = await fetchQuotePartnerDropDown(serviceId);
      setPartners(
        records.map((p: any) => ({
          value: p.partner_id ?? p._id ?? "",
          label: p.partner_name ?? p.name ?? "",
        }))
      );
    } finally {
      fetchRef.current = false;
    }
  }, [serviceId]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const onSubmit = (data: { partner_id?: string }) => {
    const partnerId = data.partner_id ?? "";
    const partner = partners.find((p) => p.value === partnerId);
    const partnerName = partner?.label ?? "";
    if (!partnerId) {
      return;
    }
    onAssigned(partnerId, partnerName);
    showSuccessAlert("Partner updated successfully.");
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Update Partner
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        <form noValidate name="quote-update-partner-form" onSubmit={handleSubmit(onSubmit)}>
          <Row>
            <CustomTextFieldSelect
              label="Partner"
              controlId="Partner"
              options={partners}
              register={register}
              fieldName="partner_id"
              error={errors.partner_id}
              requiredMessage="Please select partner"
              defaultValue={defaultPartnerId}
              setValue={setValue as (name: string, value: any) => void}
            />
          </Row>
          <Row className="mt-4">
            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
              <Button type="submit" className="custom-btn-primary">
                Update
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

QuoteUpdatePartnerDialog.show = (
  serviceId: string | undefined,
  defaultPartnerId: string | undefined,
  onAssigned: (partnerId: string, partnerName: string) => void
) => {
  openDialog("quote-update-partner-modal", (close) => (
    <QuoteUpdatePartnerDialog
      serviceId={serviceId}
      defaultPartnerId={defaultPartnerId}
      onClose={close}
      onAssigned={onAssigned}
    />
  ));
};

export default QuoteUpdatePartnerDialog;
