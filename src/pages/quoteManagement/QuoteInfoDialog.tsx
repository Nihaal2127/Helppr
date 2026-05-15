import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import QuoteInfoFieldRow from "../../components/quote/QuoteInfoFieldRow";
import { openDialog } from "../../lib/global/DialogManager";
import type { QuoteViewData } from "../../lib/quote/quoteViewTypes";
import { formatQuoteScheduleForView } from "../../lib/quote/quoteScheduleDisplay";
import { displayStateName } from "../../lib/quote/quoteAddressFormat";
import type { ServiceDropDownOption } from "../../services/servicesService";
import {
  convertQuoteToOrder,
  fetchQuoteDetailById,
} from "../../services/quoteService";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";
import { toQuoteViewData } from "../../lib/quote/quoteViewMapper";
import { computeQuotePriceBreakdown } from "../../lib/quote/quotePriceBreakdown";
import QuotePriceBreakdownPanel from "../../components/quote/QuotePriceBreakdownPanel";
import QuoteInfoPersonSection from "../../components/quote/QuoteInfoPersonSection";
import editIcon from "../../assets/icons/edit_red.svg";
import {
  QUOTE_MODAL_LAYOUT,
  QUOTE_SECTION_TITLE_CLASS,
} from "../../lib/quote/quoteModalLayout";

export type { QuoteViewData };

type QuoteInfoDialogProps = {
  quote: QuoteViewData;
  onClose: () => void;
  onRefreshData?: () => void;
};

const STATUS_TEXT_CLASS: Record<string, string> = {
  new: "text-primary",
  pending: "text-warning",
  accepted: "text-success",
  success: "text-success",
  failed: "text-danger",
};

const QuoteInfoDialog: React.FC<QuoteInfoDialogProps> & {
  show: (quote: QuoteViewData, onRefreshData?: () => void) => void;
} = ({ quote, onClose, onRefreshData }) => {
  const [displayQuote, setDisplayQuote] = useState<QuoteViewData>(quote);
  const [serviceFees, setServiceFees] = useState<
    ServiceDropDownOption | undefined
  >(undefined);

  const quoteMongoId = String(
    quote._id ?? quote.quote_id ?? ""
  ).trim();

  /** View: `GET /quote/get/:id` only (not franchise related-catalog). */
  useEffect(() => {
    if (!quoteMongoId) {
      setDisplayQuote(quote);
      setServiceFees(undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { quote: row, serviceFees: fees } =
        await fetchQuoteDetailById(quoteMongoId);
      if (cancelled) return;
      if (row) {
        setDisplayQuote(toQuoteViewData(row));
        setServiceFees(fees);
      } else {
        setDisplayQuote(quote);
        setServiceFees(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteMongoId, quote]);

  const statusKey = String(displayQuote.status ?? "").toLowerCase();
  const statusTextClass =
    STATUS_TEXT_CLASS[statusKey] ?? "text-body-secondary";
  const isSuccess = statusKey === "success";
  const isAccepted = statusKey === "accepted";

  const partnerNameForDisplay = isAccepted
    ? displayQuote.partner_name
    : displayQuote.requested_partner;

  const scheduleDisplay = useMemo(
    () =>
      formatQuoteScheduleForView({
        status: displayQuote.status,
        requested_date: displayQuote.requested_date,
        requested_time: displayQuote.requested_time,
        scheduled_date: displayQuote.scheduled_date,
        scheduled_time_from: displayQuote.scheduled_time_from,
        scheduled_time_to: displayQuote.scheduled_time_to,
      }),
    [
      displayQuote.status,
      displayQuote.requested_date,
      displayQuote.requested_time,
      displayQuote.scheduled_date,
      displayQuote.scheduled_time_from,
      displayQuote.scheduled_time_to,
    ]
  );

  const serviceLabel =
    isSuccess || isAccepted
      ? displayQuote.services_summary ?? displayQuote.requested_services
      : displayQuote.requested_services;

  const canEditQuote = !isSuccess && Boolean(quoteMongoId);

  const priceBreakdown = useMemo(
    () =>
      computeQuotePriceBreakdown(displayQuote.service_price ?? 0, serviceFees),
    [displayQuote.service_price, serviceFees]
  );

  const customerProfile = displayQuote.profile_url ?? null;
  const partnerProfile = displayQuote.partner_profile_url ?? null;
  const employeeProfile = displayQuote.employee_profile_url ?? null;

  const openEditAll = () => {
    if (!quoteMongoId) return;
    void import("./QuoteEditAllDialog").then(({ default: QuoteEditAllDialog }) => {
      QuoteEditAllDialog.show(quoteMongoId, () => {
        void (async () => {
          const { quote: row, serviceFees: fees } =
            await fetchQuoteDetailById(quoteMongoId);
          if (row) {
            setDisplayQuote(toQuoteViewData(row));
            setServiceFees(fees);
          }
          onRefreshData?.();
        })();
      });
    });
  };

  return (
    <Modal show={true} onHide={onClose} {...QUOTE_MODAL_LAYOUT}>
      <Modal.Header className="py-3 px-4 border-bottom-0 d-flex align-items-center flex-shrink-0">
        <Modal.Title className="mb-0 me-auto">Quote information</Modal.Title>
        <div className="d-flex align-items-center gap-3 ms-3">
          {canEditQuote ? (
            <img
              src={editIcon}
              alt="Edit quote"
              width={22}
              height={22}
              style={{ cursor: "pointer" }}
              role="button"
              onClick={openEditAll}
            />
          ) : null}
          <CustomCloseButton onClose={onClose} inline size={22} />
        </div>
      </Modal.Header>
      <Modal.Body className="add-quote-modal-body pt-0">
        {isSuccess ? (
          <section className="border rounded p-3 mb-3">
            <h6 className={QUOTE_SECTION_TITLE_CLASS}>Order</h6>
            <QuoteInfoFieldRow
              label="Order ID"
              value={displayQuote.order_id ?? "-"}
            />
          </section>
        ) : null}

        <section className="border rounded p-3 mb-3">
          <h6 className={QUOTE_SECTION_TITLE_CLASS}>Quote details</h6>
          <Row className="g-3">
            <Col xs={12} md={6}>
              <QuoteInfoFieldRow label="Service" value={serviceLabel ?? "-"} />
              <QuoteInfoFieldRow
                label="Category"
                value={displayQuote.category_name ?? "-"}
              />
              <QuoteInfoFieldRow
                label="Quote description"
                value={(displayQuote.description ?? "").trim() || "-"}
              />
              <QuoteInfoFieldRow
                label="Quote status"
                value={
                  <span className={`fw-semibold ${statusTextClass}`}>
                    {displayQuote.status}
                  </span>
                }
              />
              <QuoteInfoFieldRow
                label="Schedule date and time"
                value={scheduleDisplay}
              />
            </Col>
            <Col xs={12} md={6}>
              <QuoteInfoFieldRow
                label="State"
                value={displayStateName(displayQuote.state ?? "") || "-"}
              />
              <QuoteInfoFieldRow label="City" value={displayQuote.city ?? "-"} />
              <QuoteInfoFieldRow label="Area" value={displayQuote.area ?? "-"} />
              <QuoteInfoFieldRow
                label="Pin code"
                value={displayQuote.pincode ?? "-"}
              />
              <QuoteInfoFieldRow
                label="Address"
                value={
                  displayQuote.address_line?.trim() ||
                  displayQuote.street?.trim() ||
                  "-"
                }
              />
            </Col>
          </Row>
        </section>

        <QuoteInfoPersonSection
          title="Customer"
          role="customer"
          profileUrl={customerProfile}
          fields={[
            { label: "Name", value: displayQuote.user_name ?? "-", column: "left" },
            { label: "Email", value: displayQuote.user_email ?? "-", column: "left" },
            { label: "Phone", value: displayQuote.phone_number ?? "-", column: "right" },
          ]}
        />

        <QuoteInfoPersonSection
          title="Partner"
          role="partner"
          profileUrl={partnerProfile}
          fields={[
            { label: "Name", value: partnerNameForDisplay ?? "-", column: "left" },
            { label: "Email", value: displayQuote.partner_email ?? "-", column: "left" },
            { label: "Phone", value: displayQuote.partner_phone ?? "-", column: "right" },
            ...((displayQuote.partner_city ?? "").trim()
              ? [
                  {
                    label: "Location / service area",
                    value: displayQuote.partner_city,
                    fullWidth: true as const,
                  },
                ]
              : []),
          ]}
        />

        <QuoteInfoPersonSection
          title="Employee"
          role="employee"
          profileUrl={employeeProfile}
          fields={[
            { label: "Name", value: displayQuote.employee_name ?? "-", column: "left" },
            { label: "Email", value: displayQuote.employee_email ?? "-", column: "left" },
            { label: "Phone", value: displayQuote.employee_phone ?? "-", column: "right" },
          ]}
        />

        {priceBreakdown ? (
          <div className="mb-3">
            <QuotePriceBreakdownPanel
              breakdown={priceBreakdown}
              variant="view"
            />
          </div>
        ) : null}

        {isAccepted && quoteMongoId ? (
          <div className="mt-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                openConfirmDialog(
                  "Convert this quote to an order?",
                  "Convert",
                  "Cancel",
                  async () => {
                    const ok = await convertQuoteToOrder(quoteMongoId);
                    if (ok) {
                      showSuccessAlert("Quote converted to order.");
                      onRefreshData?.();
                      onClose();
                    } else {
                      showErrorAlert("Could not convert quote.");
                    }
                  }
                );
              }}
            >
              Convert to order
            </Button>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

QuoteInfoDialog.show = (quote: QuoteViewData, onRefreshData?: () => void) => {
  openDialog("quote-details-modal", (close) => (
    <QuoteInfoDialog
      quote={quote}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default QuoteInfoDialog;
