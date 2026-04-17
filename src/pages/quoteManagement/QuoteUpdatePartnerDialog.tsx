import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { fetchQuotePartnerDropDown } from "../../services/quoteService";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import { openDialog } from "../../helper/DialogManager";
import { showSuccessAlert } from "../../helper/alertHelper";
import { DetailsRow } from "../../helper/utility";

export type QuoteUpdatePartnerContext = {
  /** Requested service line from the quote (e.g. same as Quote Information). */
  serviceLabel?: string;
  /** Category name from the quote. */
  categoryName?: string;
};

type QuoteUpdatePartnerDialogProps = {
  serviceId?: string;
  defaultPartnerId?: string;
  context?: QuoteUpdatePartnerContext;
  onClose: () => void;
  onAssigned: (partnerId: string, partnerName: string) => void;
};

function displayPartnerCategories(p: Record<string, unknown> | undefined): string {
  if (!p) return "-";
  const c = p.category_name ?? p.categories;
  if (typeof c === "string" && c.trim()) return c;
  if (Array.isArray(c) && c.length) return c.map(String).join(", ");
  return "-";
}

function displayPartnerServices(p: Record<string, unknown> | undefined): string {
  if (!p) return "-";
  const s = p.services ?? p.partner_services ?? p.my_services;
  if (typeof s === "string" && s.trim()) return s;
  if (Array.isArray(s) && s.length) return s.map(String).join(", ");
  return "-";
}

const QuoteUpdatePartnerDialog: React.FC<QuoteUpdatePartnerDialogProps> & {
  show: (
    serviceId: string | undefined,
    defaultPartnerId: string | undefined,
    onAssigned: (partnerId: string, partnerName: string) => void,
    context?: QuoteUpdatePartnerContext
  ) => void;
} = ({ serviceId, defaultPartnerId, context, onClose, onAssigned }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const [partners, setPartners] = useState<{ value: string; label: string }[]>([]);
  const [partnerRecords, setPartnerRecords] = useState<Record<string, unknown>[]>([]);
  const fetchRef = useRef(false);

  const selectedPartnerId = watch("partner_id") as string | undefined;

  const selectedPartner = useMemo(
    () =>
      partnerRecords.find(
        (p) =>
          String(p.partner_id ?? p.user_id ?? p._id ?? "").trim() ===
          String(selectedPartnerId ?? "").trim()
      ),
    [partnerRecords, selectedPartnerId]
  );

  const bank = selectedPartner?.bank_account as Record<string, string | null | undefined> | undefined;

  const loadPartners = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const { partners: records } = await fetchQuotePartnerDropDown(serviceId);
      setPartnerRecords(records as Record<string, unknown>[]);
      setPartners(
        records.map((p: Record<string, unknown>) => ({
          value: String(p.partner_id ?? p._id ?? ""),
          label: String(p.partner_name ?? p.name ?? ""),
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

  const serviceDisplay =
    (context?.serviceLabel && context.serviceLabel.trim()) ||
    displayPartnerServices(selectedPartner) ||
    "-";
  const categoryDisplay =
    (context?.categoryName && context.categoryName.trim()) ||
    displayPartnerCategories(selectedPartner) ||
    "-";

  return (
    <Modal show={true} onHide={onClose} centered size="lg" dialogClassName="custom-big-modal">
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

          <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
            <h3 className="mb-2">Service & category</h3>
            <Row>
              <Col className="custom-helper-column">
                <DetailsRow title="Service" value={serviceDisplay} />
              </Col>
              <Col className="custom-helper-column">
                <DetailsRow title="Category" value={categoryDisplay} />
              </Col>
            </Row>
          </section>

          <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
            <h3 className="mb-2">Bank information</h3>
            {!selectedPartner ? (
              <p className="mb-0 text-muted" style={{ fontSize: "14px" }}>
                Select a partner to view bank details.
              </p>
            ) : bank ? (
              <Row>
                <Col className="custom-helper-column">
                  <DetailsRow title="Account Name" value={bank.account_holder_name ?? "-"} />
                  <DetailsRow title="Account Number" value={bank.account_number ?? "-"} />
                  <DetailsRow title="IFSC Code" value={bank.ifsc_code ?? "-"} />
                </Col>
                <Col className="custom-helper-column">
                  <DetailsRow title="Bank Name" value={bank.bank_name ?? "-"} />
                  <DetailsRow title="Branch Name" value={bank.branch_name ?? "-"} />
                </Col>
              </Row>
            ) : (
              <p className="mb-0 text-muted" style={{ fontSize: "14px" }}>
                No bank account on file for this partner.
              </p>
            )}
          </section>

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
  onAssigned: (partnerId: string, partnerName: string) => void,
  context?: QuoteUpdatePartnerContext
) => {
  openDialog("quote-update-partner-modal", (close) => (
    <QuoteUpdatePartnerDialog
      serviceId={serviceId}
      defaultPartnerId={defaultPartnerId}
      context={context}
      onClose={close}
      onAssigned={onAssigned}
    />
  ));
};

export default QuoteUpdatePartnerDialog;
