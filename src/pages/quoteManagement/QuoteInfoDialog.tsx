import React, { useEffect, useMemo, useState } from "react";
import { Modal, Row, Col, Button } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { DetailsRow, WideLabelValueBlock } from "../../helper/utility";
import { AppConstant } from "../../lib/global/AppConstant";
import { openDialog } from "../../lib/global/DialogManager";
import type { QuoteViewData } from "../../lib/quote/quoteViewTypes";
import {
  formatQuoteScheduleForView,
  formatServiceAddressLines,
} from "../../lib/quote/quoteScheduleDisplay";
import { convertQuoteToOrder, fetchQuoteById } from "../../services/quoteService";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { showErrorAlert, showSuccessAlert } from "../../lib/global/alertHelper";
import { toQuoteViewData } from "../../lib/quote/quoteViewMapper";
import profileIcon from "../../assets/icons/profile.svg";

export type { QuoteViewData };

type QuoteInfoDialogProps = {
  quote: QuoteViewData;
  onClose: () => void;
  onRefreshData?: () => void;
};

const statusColorMap: Record<string, string> = {
  new: "#0d6efd",
  pending: "#fd7e14",
  accepted: "#198754",
  success: "#20c997",
  failed: "#dc3545",
};

function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="quote-info-card border rounded-3 mb-3"
      style={{
        backgroundColor: "var(--bg-color, #fff)",
        borderColor: "rgba(0,0,0,0.08)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <h3 className="h6 mb-0" style={{ fontWeight: 700 }}>
          {title}
        </h3>
        {action ? <div className="d-flex align-items-center gap-2">{action}</div> : null}
      </div>
      <div className="p-3 pt-3">{children}</div>
    </section>
  );
}

const QuoteInfoDialog: React.FC<QuoteInfoDialogProps> & {
  show: (quote: QuoteViewData, onRefreshData?: () => void) => void;
} = ({ quote, onClose, onRefreshData }) => {
  const [displayQuote, setDisplayQuote] = useState<QuoteViewData>(quote);

  useEffect(() => {
    setDisplayQuote(quote);
  }, [quote]);

  const statusKey = String(displayQuote.status ?? "").toLowerCase();
  const statusColor = statusColorMap[statusKey] ?? "var(--primary-txt-color)";
  const isSuccess = statusKey === "success";
  const isAccepted = statusKey === "accepted";
  const quoteMongoId = String(displayQuote._id ?? displayQuote.quote_id ?? "").trim();

  const partnerNameForDisplay = isAccepted
    ? displayQuote.partner_name
    : displayQuote.requested_partner;

  const profileSrc = displayQuote.profile_url
    ? `${AppConstant.IMAGE_BASE_URL}${displayQuote.profile_url}?t=${Date.now()}`
    : profileIcon;

  const serviceAddressBlock = formatServiceAddressLines(displayQuote);

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

  const openEditAll = () => {
    if (!quoteMongoId) return;
    void import("./QuoteEditAllDialog").then(({ default: QuoteEditAllDialog }) => {
      QuoteEditAllDialog.show(quoteMongoId, () => {
        void (async () => {
          const row = await fetchQuoteById(quoteMongoId);
          if (row) setDisplayQuote(toQuoteViewData(row));
          onRefreshData?.();
        })();
      });
    });
  };

  return (
    <Modal show={true} size="lg" onHide={onClose} centered>
      <Modal.Header className="py-3 px-4 border-bottom-0 align-items-start">
        <div className="flex-grow-1 min-w-0">
          <Modal.Title as="h5" className="custom-modal-title mb-1">
            Quote information
          </Modal.Title>
          <div className="small text-muted">
            Quote ID{" "}
            <span className="text-body fw-semibold">{displayQuote.quote_id}</span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {canEditQuote ? (
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              className="d-inline-flex align-items-center gap-1"
              onClick={openEditAll}
            >
              <i className="bi bi-pencil-square" aria-hidden />
              Edit quote
            </Button>
          ) : null}
          <CustomCloseButton onClose={onClose} />
        </div>
      </Modal.Header>
      <Modal.Body
        className="px-4 pb-4 pt-0"
        style={{ maxHeight: "72vh", overflowY: "auto" }}
      >
        {isSuccess ? (
          <InfoCard title="Order">
            <Row>
              <Col xs={12}>
                <DetailsRow
                  title="Order ID"
                  value={displayQuote.order_id ?? "-"}
                />
              </Col>
            </Row>
          </InfoCard>
        ) : null}

        <InfoCard title="Quote details">
          <Row className="g-3">
            <Col xs={12} md={6}>
              <DetailsRow title="Service" value={serviceLabel ?? "-"} />
              <DetailsRow
                title="Category"
                value={displayQuote.category_name ?? "-"}
              />
            </Col>
            <Col xs={12} md={6}>
              <DetailsRow
                title="Service price"
                value={`${AppConstant.currencySymbol}${
                  displayQuote.service_price ?? 0
                }`}
              />
              <DetailsRow
                title="Quote status"
                value={
                  <span style={{ color: statusColor, fontWeight: 600 }}>
                    {displayQuote.status}
                  </span>
                }
              />
            </Col>
            <Col xs={12}>
              <WideLabelValueBlock label="Quote description" whiteSpace="pre-line">
                {(displayQuote.description ?? "").trim() || "-"}
              </WideLabelValueBlock>
            </Col>
            <Col xs={12}>
              <WideLabelValueBlock
                label="Schedule date and time"
                whiteSpace="pre-line"
                gap="clamp(1rem, 5vw, 2.5rem)"
              >
                {scheduleDisplay}
              </WideLabelValueBlock>
            </Col>
            <Col xs={12}>
              <WideLabelValueBlock label="Service address" whiteSpace="pre-line">
                {serviceAddressBlock || "-"}
              </WideLabelValueBlock>
            </Col>
          </Row>
        </InfoCard>

        <InfoCard title="Customer">
          <Row className="g-3 align-items-start">
            <Col xs="auto" className="flex-shrink-0">
              <img
                src={profileSrc}
                alt=""
                width={72}
                height={72}
                className="rounded-circle object-fit-cover"
                style={{ border: "1px solid var(--txtfld-border, #dee2e6)" }}
              />
            </Col>
            <Col className="min-w-0">
              <Row className="g-2">
                <Col sm={6}>
                  <DetailsRow title="Name" value={displayQuote.user_name ?? "-"} />
                  <DetailsRow
                    title="Email"
                    value={displayQuote.user_email ?? "-"}
                  />
                </Col>
                <Col sm={6}>
                  <DetailsRow
                    title="Phone"
                    value={displayQuote.phone_number ?? "-"}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </InfoCard>

        <InfoCard title="Partner">
          <Row className="g-2">
            <Col md={4} xs={12}>
              <DetailsRow title="Name" value={partnerNameForDisplay ?? "-"} />
            </Col>
            <Col md={4} xs={12}>
              <DetailsRow
                title="Phone"
                value={displayQuote.partner_phone ?? "-"}
              />
            </Col>
            <Col md={4} xs={12}>
              <DetailsRow
                title="Email"
                value={displayQuote.partner_email ?? "-"}
              />
            </Col>
            {(displayQuote.partner_city ?? "").trim() ? (
              <Col xs={12}>
                <WideLabelValueBlock label="Location / service area" whiteSpace="normal">
                  {displayQuote.partner_city}
                </WideLabelValueBlock>
              </Col>
            ) : null}
          </Row>
        </InfoCard>

        <InfoCard title="Employee">
          <Row className="g-2">
            <Col md={4} xs={12}>
              <DetailsRow title="Name" value={displayQuote.employee_name ?? "-"} />
            </Col>
            <Col md={4} xs={12}>
              <DetailsRow
                title="Phone"
                value={displayQuote.employee_phone ?? "-"}
              />
            </Col>
            <Col md={4} xs={12}>
              <DetailsRow
                title="Email"
                value={displayQuote.employee_email ?? "-"}
              />
            </Col>
          </Row>
        </InfoCard>

        {isAccepted && quoteMongoId ? (
          <div className="pt-1">
            <Button
              type="button"
              className="custom-btn-primary"
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
