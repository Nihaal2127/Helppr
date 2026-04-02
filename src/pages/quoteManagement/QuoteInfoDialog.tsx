import React, { useEffect, useState } from "react";
import { Modal, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { DetailsRow, formatDate } from "../../helper/utility";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog } from "../../helper/DialogManager";
import profileIcon from "../../assets/icons/profile.svg";
import QuoteUpdatePartnerDialog from "./QuoteUpdatePartnerDialog";
import QuoteEditServicePriceDialog from "./QuoteEditServicePriceDialog";
import QuoteEditScheduleDetailsDialog from "./QuoteEditScheduleDetailsDialog";
import QuoteEditPartnerDetailsDialog from "./QuoteEditPartnerDetailsDialog";
import QuoteEditEmployeeDialog from "./QuoteEditEmployeeDialog";
import type { QuoteViewData } from "./quoteViewTypes";

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
  const isNew = statusKey === "new";
  const isPending = statusKey === "pending";
  const isAccepted = statusKey === "accepted";

  // Keep the modal UI consistent across tabs; only show edits status-specific.
  // Partner edit is allowed only in "new" flow.
  const showPartnerEdit = isNew || isAccepted;
  const showEmployeeEdit = true;

  const partnerIdForDisplay = isAccepted ? displayQuote.partner_user_id : displayQuote.partner_id;
  const partnerNameForDisplay = isAccepted ? displayQuote.partner_name : displayQuote.requested_partner;

  const profileSrc = displayQuote.profile_url
    ? `${AppConstant.IMAGE_BASE_URL}${displayQuote.profile_url}?t=${Date.now()}`
    : profileIcon;

  const locationLines = [
    displayQuote.user_name,
    displayQuote.phone_number,
    `Door No: ${displayQuote.door_no}, ${displayQuote.street}`,
    [displayQuote.area, displayQuote.landmark].filter(Boolean).length
      ? [displayQuote.area, displayQuote.landmark].filter(Boolean).join(", ")
      : null,
    [displayQuote.city, displayQuote.pincode].filter(Boolean).join(displayQuote.pincode ? " - " : ""),
  ]
    .filter(Boolean)
    .join("\n");

  const locationBlock = locationLines || "-";

  const editIcon = (onClick: () => void, ariaLabel = "Edit") => (
    <i
      className="bi bi-pencil-fill fs-6 text-danger"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{ cursor: "pointer" }}
      aria-label={ariaLabel}
    />
  );

  return (
    <Modal show={true} size="lg" onHide={onClose} centered>
      {/* <div className="custom-order-model-detail"> */}
        <Modal.Header className="py-3 px-4 border-bottom-0">
          <Modal.Title as="h5" className="custom-modal-title">
            Quote Information
          </Modal.Title>
          <CustomCloseButton onClose={onClose} />
        </Modal.Header>
        <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <section className="custom-other-details" style={{ padding: "10px" }}>
            <Row className="d-flex justify-content-between align-items-center mb-2">
              <Col>
                <h3 className="mb-0">Quote</h3>
              </Col>
              {isAccepted && (
                <Col className="text-end">
                  {editIcon(() => {
                    QuoteEditScheduleDetailsDialog.show(
                      displayQuote.quote_id,
                      {
                        scheduled_date: displayQuote.scheduled_date,
                        scheduled_time_from: displayQuote.scheduled_time_from,
                        scheduled_time_to: displayQuote.scheduled_time_to,
                      },
                      (patch) => {
                        setDisplayQuote((q) => ({
                          ...q,
                          scheduled_date: patch.scheduled_date,
                          scheduled_time_from: patch.scheduled_time_from,
                          scheduled_time_to: patch.scheduled_time_to,
                        }));
                        onRefreshData?.();
                      }
                    );
                  }, "Edit schedule")}
                </Col>
              )}
            </Row>
            <Row>
              <Col className="custom-helper-column">
                <DetailsRow title="Quote ID" value={displayQuote.quote_id} />
              <DetailsRow
                title="Scheduled Date"
                value={formatDate(displayQuote.scheduled_date ? displayQuote.scheduled_date : "")}
                />
                <DetailsRow title="Category ID" value={displayQuote.category_id} />
                <DetailsRow title="Category Name" value={displayQuote.category_name} />
              </Col>
              <Col className="custom-helper-column">
                {isSuccess && <DetailsRow title="Order ID" value={displayQuote.order_id} />}
              <DetailsRow title="City Name" value={displayQuote.city} />
                <DetailsRow
                  title="Scheduled Time"
                  value={
                    isSuccess || isAccepted
                      ? `${displayQuote.scheduled_time_from ?? "-"} – ${displayQuote.scheduled_time_to ?? "-"}`
                      : displayQuote.requested_time
                  }
                />
                <DetailsRow
                  title="Quote Status"
                  value={<span style={{ color: statusColor, fontWeight: 600 }}>{displayQuote.status}</span>}
                />
              </Col>

            </Row>
          </section>

          <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
            <Row className="d-flex justify-content-between align-items-center mb-2">
              <Col xs={12}>
                <h3 className="mb-0">Service Address</h3>
              </Col>
              <Col xs={12}>
              <label
              className="col w-100 custom-personal-row-value mt-2 text-wrap"
            >
              {locationBlock}
            </label>
            </Col>
            </Row>
          </section>

          <div className="custom-info mt-3">
            <div>
              <p>User</p>
              <img src={profileSrc} alt="Profile" width="80px" height="80px" />
            </div>
            <div className="custom-personal-details">
              <Col className="custom-helper-column">
                <DetailsRow title="User ID" value={displayQuote.user_id} />
                <DetailsRow title="Location" value={displayQuote.user_city} />
              </Col>
              <Col className="custom-helper-column">
                <DetailsRow title="User Name" value={displayQuote.user_name} />
                <DetailsRow title="Phone Number" value={displayQuote.phone_number} />
              </Col>
            </div>
          </div>

          <>
            <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
              <Row className="d-flex justify-content-between align-items-center mb-2">
                <Col>
                  <h3 className="mb-0">Service Details</h3>
                </Col>
                {isAccepted && (
                  <Col className="text-end">
                    {editIcon(() => {
                      QuoteEditServicePriceDialog.show(
                        displayQuote.quote_id,
                        displayQuote.service_price ?? 0,
                        (price) => {
                          setDisplayQuote((q) => ({ ...q, service_price: price }));
                          onRefreshData?.();
                        }
                      );
                    }, "Edit service price")}
                  </Col>
                )}
              </Row>
              <Row>
                <Col className="custom-helper-column">
                  <DetailsRow title="Service" value={displayQuote.requested_services} />
                </Col>
                <Col className="custom-helper-column">
                  <DetailsRow
                    title="Service Price"
                    value={`${AppConstant.currencySymbol}${displayQuote.service_price ?? 0}`}
                  />
                </Col>
              </Row>

              <Row className="mb-2 mt-3">
                <Col>
                  <h3 className="mb-0">Partner</h3>
                </Col>
                {showPartnerEdit && (
                  <Col className="text-end">
                    {editIcon(() => {
                      if (isNew) {
                        QuoteUpdatePartnerDialog.show(
                          displayQuote.service_id,
                          displayQuote.partner_id,
                          (partnerId, partnerName) => {
                            setDisplayQuote((q) => ({
                              ...q,
                              requested_partner: partnerName,
                              partner_id: partnerId,
                            }));
                            onRefreshData?.();
                          }
                        );
                        return;
                      }

                      // Accepted: edit the finalized partner details.
                      QuoteEditPartnerDetailsDialog.show(
                        displayQuote.quote_id,
                        {
                          partner_name: displayQuote.partner_name,
                          partner_user_id: displayQuote.partner_user_id,
                          partner_phone: displayQuote.partner_phone,
                          partner_city: displayQuote.partner_city,
                        },
                        (patch) => {
                          setDisplayQuote((q) => ({
                            ...q,
                            partner_name: patch.partner_name,
                            partner_user_id: patch.partner_user_id,
                            partner_phone: patch.partner_phone,
                            partner_city: patch.partner_city,
                            // Keep legacy fields somewhat in sync.
                            requested_partner: patch.partner_name,
                          }));
                          onRefreshData?.();
                        }
                      );
                    }, "Edit partner details")}
                  </Col>
                )}
              </Row>
              <Row>
                <Col className="custom-helper-column">
                  <DetailsRow title="Partner ID" value={partnerIdForDisplay} />
                </Col>
                <Col className="custom-helper-column">
                  <DetailsRow title="Partner Name" value={partnerNameForDisplay} />
                </Col>
              </Row>
              <Row>
                <Col className="custom-helper-column">
                  <DetailsRow title="Partner Phone" value={displayQuote.partner_phone} />
                </Col>
                <Col className="custom-helper-column">
                  <DetailsRow title="Partner Location" value={displayQuote.partner_city} />
                </Col>
              </Row>
            </section>

            <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
              <Row className="mb-2">
                <Col>
                  <h3 className="mb-0">Employee</h3>
                </Col>
                {showEmployeeEdit && (
                  <Col className="text-end">
                    {editIcon(() => {
                      QuoteEditEmployeeDialog.show(
                        displayQuote.quote_id,
                        { employee_name: displayQuote.employee_name ?? "" },
                        (patch) => {
                          setDisplayQuote((q) => ({ ...q, ...patch }));
                          onRefreshData?.();
                        }
                      );
                    }, "Edit employee")}
                  </Col>
                )}
              </Row>
              <Row>
                <Col className="custom-helper-column">
                  <DetailsRow title="Employee ID" value={displayQuote.employee_id} />
                </Col>
                <Col className="custom-helper-column">
                  <DetailsRow title="Employee Name" value={displayQuote.employee_name} />
                </Col>
              </Row>
            </section>
          </>
        </Modal.Body>
      {/* </div> */}
    </Modal>
  );
};

QuoteInfoDialog.show = (quote: QuoteViewData, onRefreshData?: () => void) => {
  openDialog("quote-details-modal", (close) => (
    <QuoteInfoDialog quote={quote} onClose={close} onRefreshData={onRefreshData} />
  ));
};

export default QuoteInfoDialog;
