import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Modal, Row, Col, Table } from "react-bootstrap";
import { OrderModel } from "../../lib/order/orders";
import {
  DetailsRow,
  formatDate,
  DetailsOrderStatusRow,
  WideLabelValueBlock,
} from "../../helper/utility";
import { fetchOrderById } from "../../lib/order/orders";
import { AppConstant } from "../../lib/global/AppConstant";
import { openDialog } from "../../lib/global/DialogManager";
import QuoteInfoPersonSection from "../quote/QuoteInfoPersonSection";
import {
  formatServiceScheduleLine,
  getCustomerPaymentStatusLabel,
  getOrderCategoryName,
  getOrderPartnerDisplayName,
  getOrderPartnerRef,
  getOrderServiceAddressDisplay,
  getPartnerPaymentStatusLabel,
  getPrimaryServiceItem,
  orderRefundAmount,
  orderRefundBreakdown,
  orderPaymentSummaryServiceAmount,
  resolveOrderOfferBreakdown,
  serviceNamesJoined,
} from "../../lib/order/orders";
import {
  computeTaxCommissionAmounts,
  customerPaidBalanceHeadline,
  getServiceTaxCommissionPercents,
  otherChargesTotal,
  partnerPaidBalanceHeadline,
  resolvePaymentExtension,
} from "../../lib/order/orders";
import { applyOrderPaymentPreviewDummy } from "../../lib/order/orders";
import {
  QUOTE_MODAL_LAYOUT,
  QUOTE_SECTION_TITLE_CLASS,
} from "../../lib/quote/quoteHelpers";
import { OrderInfoDialogHeaderActions } from "./OrderInfoDialogHeaderActions";
import OrderAmountSummaryPanel from "./OrderAmountSummaryPanel";

type OrderInfoDialogProps = {
  orderId: string;
  onClose: () => void;
  onRefreshData: () => void;
};

const paymentSubcard: React.CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.1))",
  backgroundColor: "var(--bg-color)",
};

const OrderInfoDialog: React.FC<OrderInfoDialogProps> & {
  show: (orderId: string, onRefreshData: () => void) => void;
} = ({ orderId, onClose, onRefreshData }) => {
  const [orderDetails, setOrderDetails] = useState<OrderModel>();
  const fetchRef = useRef(false);

  const fetchDataFromApi = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      const { response, order } = await fetchOrderById(orderId);
      if (response && order) {
        setOrderDetails(applyOrderPaymentPreviewDummy(order));
      }
    } finally {
      fetchRef.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    void fetchDataFromApi();
  }, [fetchDataFromApi]);

  const refreshInfoData = async () => {
    await fetchDataFromApi();
    onRefreshData();
  };

  const primary = getPrimaryServiceItem(orderDetails);
  const partnerRef = getOrderPartnerRef(orderDetails);
  const serviceAddress = useMemo(
    () => getOrderServiceAddressDisplay(orderDetails),
    [orderDetails]
  );

  const paymentExt = useMemo(() => {
    if (!orderDetails) return null;
    return resolvePaymentExtension(orderDetails, primary);
  }, [orderDetails, primary]);

  const taxCommFromService = useMemo(() => {
    if (!orderDetails) return { taxPct: 0, commissionPct: 0 };
    return getServiceTaxCommissionPercents(
      getPrimaryServiceItem(orderDetails),
      orderDetails
    );
  }, [orderDetails]);

  const { viewTax, viewComm } = useMemo(() => {
    if (!paymentExt) return { viewTax: 0, viewComm: 0 };
    const other = otherChargesTotal(paymentExt.otherCharges);
    const taxableBase = Math.max(0, paymentExt.serviceAmount + other);
    const { taxAmount, commissionAmount } = computeTaxCommissionAmounts(
      taxableBase,
      taxCommFromService.taxPct,
      taxCommFromService.commissionPct
    );
    return { viewTax: taxAmount, viewComm: commissionAmount };
  }, [paymentExt, taxCommFromService]);

  const viewOtherSum = paymentExt
    ? otherChargesTotal(paymentExt.otherCharges)
    : 0;
  const refundN = orderRefundAmount(orderDetails);
  const offerBreakdown = useMemo(
    () => resolveOrderOfferBreakdown(orderDetails),
    [orderDetails]
  );
  const refundBreakdown = useMemo(
    () => orderRefundBreakdown(orderDetails),
    [orderDetails]
  );

  const orderDiscountView = Math.max(
    0,
    Number(orderDetails?.discount_amount ?? 0)
  );
  const viewFinalTotal = paymentExt
    ? Math.max(
        0,
        paymentExt.serviceAmount +
          viewOtherSum +
          viewTax +
          viewComm -
          refundN -
          offerBreakdown.appliedDiscount -
          orderDiscountView
      )
    : 0;

  const paymentHeadlines = useMemo(() => {
    if (!paymentExt || !orderDetails) return null;
    const apiTotal = Number(orderDetails.total_price ?? 0);
    const apiPartnerDue = Math.max(
      0,
      Number(primary?.partner_earning ?? 0) ||
        Number(orderDetails.total_service_charge ?? 0) ||
        Number(primary?.service_price ?? 0)
    );
    /** Customer balance caps — prefer API totals (sub_total + tax = total_price). */
    const userInvoice =
      apiTotal > 0
        ? apiTotal
        : Math.max(0, Number(orderDetails.customer_due_amount ?? 0)) ||
          viewFinalTotal;
    const partnerInvoice = Math.max(
      0,
      apiPartnerDue - offerBreakdown.partnerContribution
    );
    const serviceAmt = orderPaymentSummaryServiceAmount(
      orderDetails,
      primary
    );
    const isPaid = !!orderDetails.is_paid;
    return {
      user: customerPaidBalanceHeadline(paymentExt, userInvoice, isPaid),
      partner: partnerPaidBalanceHeadline(
        paymentExt,
        partnerInvoice,
        serviceAmt,
        isPaid
      ),
      serviceAmt,
      taxAmt: Number(orderDetails.tax ?? viewTax),
      commAmt: Number(orderDetails.partner_commison_platform_fee ?? viewComm),
      totalPriceDisp: Number(orderDetails.total_price ?? 0) || viewFinalTotal,
    };
  }, [
    paymentExt,
    orderDetails,
    primary,
    viewFinalTotal,
    offerBreakdown.partnerContribution,
  ]);

  /** When service line omits %, infer from stored amounts (tax/commission apply to service + other charges). */
  const taxPctForLabel = useMemo(() => {
    if (taxCommFromService.taxPct > 0) return taxCommFromService.taxPct;
    const s = (paymentHeadlines?.serviceAmt ?? 0) + viewOtherSum;
    const t = paymentHeadlines?.taxAmt ?? 0;
    if (s > 0 && t >= 0) return Math.round((t / s) * 10000) / 100;
    return 0;
  }, [taxCommFromService.taxPct, paymentHeadlines, viewOtherSum]);

  const commissionPctForLabel = useMemo(() => {
    if (taxCommFromService.commissionPct > 0)
      return taxCommFromService.commissionPct;
    const s = (paymentHeadlines?.serviceAmt ?? 0) + viewOtherSum;
    const c = paymentHeadlines?.commAmt ?? 0;
    if (s > 0 && c >= 0) return Math.round((c / s) * 10000) / 100;
    return 0;
  }, [taxCommFromService.commissionPct, paymentHeadlines, viewOtherSum]);

  const canEditOrderHeader =
    orderDetails?.order_status === 1 || orderDetails?.order_status === 2;
  const canEditOrderAll = Boolean(orderDetails?._id) && canEditOrderHeader;
  const createdBy = orderDetails?.created_by_info;

  const openEditAll = () => {
    if (!orderDetails?._id) return;
    void import("../../pages/orderManagement/OrderEditAllDialog").then(
      ({ default: OrderEditAllDialog }) => {
        OrderEditAllDialog.show(orderDetails._id, () => {
          void refreshInfoData();
        });
      }
    );
  };

  const sym = AppConstant.currencySymbol;

  const payLineDate = (d: string) => (d ? formatDate(d) : "—");

  return (
    <Modal
      show
      onHide={onClose}
      {...QUOTE_MODAL_LAYOUT}
      enforceFocus={false}
    >
      <Modal.Header className="py-3 px-4 border-bottom-0 d-flex align-items-center flex-shrink-0">
        <Modal.Title as="h5" className="custom-modal-title mb-0 me-auto">
          Order information
        </Modal.Title>
        <OrderInfoDialogHeaderActions
          canEditOrderAll={canEditOrderAll}
          onEditAll={openEditAll}
          onClose={onClose}
        />
      </Modal.Header>
      <Modal.Body className="add-quote-modal-body pt-0">
          {/* Order */}
          <section className="border rounded p-3 mb-3">
            <h6 className={QUOTE_SECTION_TITLE_CLASS}>Order</h6>
            <Row className="g-3">
              <Col xs={12} md={6} className="custom-helper-column">
                <DetailsRow title="Order ID" value={orderDetails?.unique_id} />
                <DetailsRow
                  title="Order Date"
                  value={formatDate(orderDetails?.order_date ?? "")}
                />
                <DetailsRow
                  title="Category Name"
                  value={getOrderCategoryName(orderDetails)}
                />
                <DetailsRow
                  title="Service Name"
                  value={serviceNamesJoined(orderDetails)}
                />
              </Col>
              <Col xs={12} md={6} className="custom-helper-column">
                <DetailsRow
                  title="Schedule Date/time"
                  value={formatServiceScheduleLine(primary)}
                />
                <DetailsRow
                  title="Partner Payment Status"
                  value={getPartnerPaymentStatusLabel(orderDetails)}
                />
                <DetailsRow
                  title="User Payment Status"
                  value={getCustomerPaymentStatusLabel(orderDetails)}
                />
                <DetailsOrderStatusRow
                  title="Order Status"
                  value={orderDetails?.order_status!}
                />
              </Col>
            </Row>
          </section>

          {/* Service address */}
          <section className="border rounded p-3 mb-3">
            <h6 className={QUOTE_SECTION_TITLE_CLASS}>Service address</h6>
            <Row className="g-3">
              <Col xs={12} md={6} className="custom-helper-column">
                <DetailsRow title="State" value={serviceAddress.state} />
                <DetailsRow title="City" value={serviceAddress.city} />
              </Col>
              <Col xs={12} md={6} className="custom-helper-column">
                <DetailsRow title="Area" value={serviceAddress.area} />
                <DetailsRow title="Pin code" value={serviceAddress.pincode} />
              </Col>
              <Col xs={12}>
                <WideLabelValueBlock label="Address" whiteSpace="normal">
                  {serviceAddress.addressLine}
                </WideLabelValueBlock>
              </Col>
            </Row>
          </section>

          <QuoteInfoPersonSection
            title="User"
            role="customer"
            profileUrl={orderDetails?.user_info?.profile_url}
            fields={[
              {
                label: "Name",
                value:
                  orderDetails?.user_info?.name ?? orderDetails?.user_name,
                column: "left",
              },
              {
                label: "Email",
                value: orderDetails?.user_info?.email,
                column: "left",
              },
              {
                label: "Phone number",
                value: orderDetails?.user_info?.phone_number,
                column: "right",
              },
            ]}
          />

          <QuoteInfoPersonSection
            title="Partner"
            role="partner"
            profileUrl={
              primary?.partner_info?.profile_url ??
              (partnerRef as { profile_url?: string } | undefined)?.profile_url
            }
            fields={[
              {
                label: "Name",
                value: getOrderPartnerDisplayName(orderDetails),
                column: "left",
              },
              {
                label: "Email",
                value:
                  String(
                    partnerRef?.email ?? primary?.partner_info?.email ?? ""
                  ).trim() || "-",
                column: "left",
              },
              {
                label: "Phone number",
                value:
                  String(
                    partnerRef?.phone_number ??
                      primary?.partner_info?.phone_number ??
                      ""
                  ).trim() || "-",
                column: "right",
              },
              ...(String(
                partnerRef?.address ?? primary?.partner_info?.address ?? ""
              ).trim()
                ? [
                    {
                      label: "Address",
                      value: String(
                        partnerRef?.address ??
                          primary?.partner_info?.address ??
                          ""
                      ).trim(),
                      fullWidth: true as const,
                    },
                  ]
                : []),
            ]}
          />

          <QuoteInfoPersonSection
            title="Employee"
            role="employee"
            profileUrl={createdBy?.profile_url}
            fields={[
              {
                label: "Name",
                value: createdBy?.name ?? orderDetails?.created_by_name,
                column: "left",
              },
              {
                label: "Email",
                value: createdBy?.email,
                column: "left",
              },
              {
                label: "Phone number",
                value: createdBy?.phone_number,
                column: "right",
              },
            ]}
          />

          {/* Payment */}
          <section className="border rounded p-3 mb-3">
            <h6 className={QUOTE_SECTION_TITLE_CLASS}>Payment</h6>

            <Row className="g-3 mb-3 mt-1">
              <Col lg={6}>
                <div className="p-3 h-100" style={paymentSubcard}>
                  <div className="fw-semibold mb-2">User payments</div>
                  <Table
                    responsive
                    bordered
                    size="sm"
                    className="mb-0 align-middle"
                  >
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "26%" }}>Date</th>
                        <th style={{ width: "22%" }}>Paid amount</th>
                        <th style={{ width: "22%" }}>Type</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentExt?.customerPayments ?? []).map((r) => (
                        <tr key={r.id}>
                          <td>{payLineDate(r.date)}</td>
                          <td>
                            {sym}
                            {Number(r.amount || 0).toFixed(2)}
                          </td>
                          <td>{r.type?.trim() || "—"}</td>
                          <td>{r.description?.trim() || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {paymentHeadlines && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-secondary">Total Paid</span>
                        <span className="fw-semibold">
                          {sym}
                          {paymentHeadlines.user.totalPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-secondary">Balance</span>
                        <span className="fw-semibold">
                          {sym}
                          {paymentHeadlines.user.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Col>
              <Col lg={6}>
                <div className="p-3 h-100" style={paymentSubcard}>
                  <div className="fw-semibold mb-2">Partner payments</div>
                  <Table
                    responsive
                    bordered
                    size="sm"
                    className="mb-0 align-middle"
                  >
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "30%" }}>Date</th>
                        <th style={{ width: "28%" }}>Paid amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentExt?.partnerPayments ?? []).map((r) => (
                        <tr key={r.id}>
                          <td>{payLineDate(r.date)}</td>
                          <td>
                            {sym}
                            {Number(r.amount || 0).toFixed(2)}
                          </td>
                          <td>{r.description?.trim() || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {paymentHeadlines && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-secondary">Total Paid</span>
                        <span className="fw-semibold">
                          {sym}
                          {paymentHeadlines.partner.totalPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-secondary">Balance</span>
                        <span className="fw-semibold">
                          {sym}
                          {paymentHeadlines.partner.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {paymentExt && paymentHeadlines && orderDetails && (
              <OrderAmountSummaryPanel
                serviceAmount={
                  paymentHeadlines.serviceAmt +
                  offerBreakdown.appliedDiscount
                }
                offerDiscount={offerBreakdown.appliedDiscount}
                taxPct={taxPctForLabel}
                taxAmount={paymentHeadlines.taxAmt}
                commissionPct={commissionPctForLabel}
                commissionAmount={paymentHeadlines.commAmt}
                otherCharges={paymentExt.otherCharges}
                offer={offerBreakdown}
                orderDiscount={Number(orderDetails.discount_amount ?? 0)}
                refund={refundBreakdown}
                refundTotal={refundN}
                finalTotal={paymentHeadlines.totalPriceDisp}
              />
            )}
          </section>
        </Modal.Body>
    </Modal>
  );
};

/** Prefer this over `OrderInfoDialog.show` — stable under HMR and avoids undefined `.show` on default import. */
export function showOrderInfoDialog(
  orderId: string,
  onRefreshData: () => void
) {
  openDialog("order-details-modal", (close) => (
    <OrderInfoDialog
      orderId={orderId}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
}

OrderInfoDialog.show = showOrderInfoDialog;

export default OrderInfoDialog;
