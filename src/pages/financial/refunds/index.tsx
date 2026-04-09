// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
// import CustomHeader from "../../../components/CustomHeader";
// import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
// import { AppConstant } from "../../../constant/AppConstant";
// import { fetchOrder, fetchOrderById, submitOrderRefund } from "../../../services/orderService";
// import { OrderModel } from "../../../models/OrderModel";
// import { fetchAllFinancialRowsMatching } from "../../../services/financialService";
// import { FinancialModel } from "../../../models/FinancialModel";
// import { showErrorAlert, showSuccessAlert } from "../../../helper/alertHelper";
// import OrderInfoDialog from "../../orderManagement/OrderInfoDialog";

// function money(n: number | null | undefined): string {
//   if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
//   return `${AppConstant.currencySymbol}${Number(n).toFixed(2)}`;
// }

// function parseMoneyInput(s: string): number {
//   const n = parseFloat(String(s).replace(/,/g, "").trim());
//   return Number.isFinite(n) ? n : NaN;
// }

// const RefundsPage = () => {
//   const [ordersLoading, setOrdersLoading] = useState(true);
//   const [orderOptions, setOrderOptions] = useState<OrderModel[]>([]);
//   const [orderId, setOrderId] = useState("");
//   const [orderDetail, setOrderDetail] = useState<OrderModel | null>(null);
//   const [lines, setLines] = useState<FinancialModel[]>([]);
//   const [detailLoading, setDetailLoading] = useState(false);

//   const [refundAmount, setRefundAmount] = useState("");
//   const [adminSplitAmount, setAdminSplitAmount] = useState("");
//   const [partnerSplitAmount, setPartnerSplitAmount] = useState("");
//   const [fromAdmin, setFromAdmin] = useState(false);
//   const [fromPartner, setFromPartner] = useState(false);
//   const [description, setDescription] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       setOrdersLoading(true);
//       const { response, orders } = await fetchOrder(1, 200, {});
//       if (!cancelled && response) {
//         setOrderOptions(orders);
//       }
//       if (!cancelled) setOrdersLoading(false);
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   const loadOrderDetail = useCallback(async (id: string) => {
//     if (!id) {
//       setOrderDetail(null);
//       setLines([]);
//       return;
//     }
//     setDetailLoading(true);
//     try {
//       const [{ response, order }, finRows] = await Promise.all([
//         fetchOrderById(id, { skipLoader: true }),
//         fetchAllFinancialRowsMatching({ order_id: id }, 250, { skipEnrich: true }),
//       ]);
//       setOrderDetail(response && order ? order : null);
//       setLines(finRows ?? []);
//     } finally {
//       setDetailLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     void loadOrderDetail(orderId);
//   }, [orderId, loadOrderDetail]);

//   const totalPayment = orderDetail?.total_price ?? 0;
//   const customerPaidLabel = (() => {
//     if (!orderDetail) return "—";
//     if (orderDetail.is_paid === true) return money(orderDetail.total_price);
//     if (orderDetail.is_paid === false) return money(0);
//     return "—";
//   })();
//   const taxTotal = orderDetail?.tax ?? 0;
//   const commissionTotal =
//     orderDetail?.service_items?.reduce((s, it) => s + (Number(it.admin_earning) || 0), 0) ?? 0;
//   const partnerPaidTotal = lines.reduce((s, r) => s + (Number(r.paid_to_partner) || 0), 0);

//   const bothSources = fromAdmin && fromPartner;
//   const splitSum = useMemo(() => {
//     const a = parseMoneyInput(adminSplitAmount);
//     const p = parseMoneyInput(partnerSplitAmount);
//     if (Number.isNaN(a) || Number.isNaN(p)) return NaN;
//     return a + p;
//   }, [adminSplitAmount, partnerSplitAmount]);

//   const handleRefund = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!orderId) {
//       showErrorAlert("Select an order.");
//       return;
//     }
//     if (!fromAdmin && !fromPartner) {
//       showErrorAlert("Choose at least one source: admin commission and/or partner wallet.");
//       return;
//     }

//     let refundTotal = 0;
//     let payloadAdmin: number | undefined;
//     let payloadPartner: number | undefined;

//     if (bothSources) {
//       const a = parseMoneyInput(adminSplitAmount);
//       const p = parseMoneyInput(partnerSplitAmount);
//       if (Number.isNaN(a) || a < 0 || Number.isNaN(p) || p < 0) {
//         showErrorAlert("Enter valid amounts for admin commission and partner wallet.");
//         return;
//       }
//       if (a === 0 && p === 0) {
//         showErrorAlert("Enter at least one non-zero split amount.");
//         return;
//       }
//       refundTotal = a + p;
//       payloadAdmin = a;
//       payloadPartner = p;
//     } else {
//       const amt = parseMoneyInput(refundAmount);
//       if (Number.isNaN(amt) || amt <= 0) {
//         showErrorAlert("Enter a valid refund amount.");
//         return;
//       }
//       refundTotal = amt;
//     }

//     setSubmitting(true);
//     try {
//       const ok = await submitOrderRefund({
//         order_id: orderId,
//         refund_amount: refundTotal,
//         from_admin_commission: fromAdmin,
//         from_partner_wallet: fromPartner,
//         ...(bothSources
//           ? {
//               amount_from_admin_commission: payloadAdmin,
//               amount_from_partner_wallet: payloadPartner,
//             }
//           : {}),
//         ...(description.trim() ? { description: description.trim() } : {}),
//       });
//       if (ok) {
//         showSuccessAlert("Refund recorded.");
//         setRefundAmount("");
//         setAdminSplitAmount("");
//         setPartnerSplitAmount("");
//         setFromAdmin(false);
//         setFromPartner(false);
//         setDescription("");
//         await loadOrderDetail(orderId);
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="main-page-content">
//       <CustomHeader title="Financial — Refunds" titlePrefix={<FinancialSubPageBackButton />} />

//       <p className="text-muted small mb-4 financial-refunds-lead">
//         Record a customer refund and choose whether it is funded from platform commission, the partner wallet,
//         or a split across both.
//       </p>

//       <Card className="financial-refunds-card border-0 shadow-sm mb-3">
//         <Card.Body className="p-3 p-md-4">
//           <div className="financial-refunds-section-title mb-3">Select order</div>
//           <Row className="align-items-end g-3">
//             <Col xs={12} md={8} lg={6}>
//               <Form.Label className="small text-muted mb-1">Order</Form.Label>
//               {ordersLoading ? (
//                 <Spinner animation="border" size="sm" />
//               ) : (
//                 <Form.Select
//                   className="custom-form-input"
//                   value={orderId}
//                   onChange={(e) => setOrderId(e.target.value)}
//                   aria-label="Order"
//                 >
//                   <option value="">Select order</option>
//                   {orderOptions.map((o) => (
//                     <option key={o._id} value={o._id}>
//                       {o.unique_id ?? o._id}
//                       {o.user_name ? ` — ${o.user_name}` : ""}
//                     </option>
//                   ))}
//                 </Form.Select>
//               )}
//             </Col>
//             {orderId ? (
//               <Col xs="auto">
//                 <Button
//                   variant="outline-secondary"
//                   size="sm"
//                   className="custom-btn-secondary"
//                   type="button"
//                   onClick={() => OrderInfoDialog.show(orderId, () => {})}
//                 >
//                   View order
//                 </Button>
//               </Col>
//             ) : null}
//           </Row>
//         </Card.Body>
//       </Card>

//       {orderId ? (
//         <Card className="financial-refunds-card border-0 shadow-sm mb-3">
//           <Card.Body className="p-3 p-md-4">
//             <div className="financial-refunds-section-title mb-3">Order payment summary</div>
//             {detailLoading ? (
//               <div className="d-flex align-items-center gap-2 text-muted small">
//                 <Spinner animation="border" size="sm" />
//                 Loading…
//               </div>
//             ) : (
//               <Row className="g-3 financial-refunds-summary-grid">
//                 <Col xs={6} sm={4} lg>
//                   <div className="financial-refunds-stat">
//                     <span className="financial-refunds-stat-label">Total payment</span>
//                     <span className="financial-refunds-stat-value">{money(totalPayment)}</span>
//                   </div>
//                 </Col>
//                 <Col xs={6} sm={4} lg>
//                   <div className="financial-refunds-stat">
//                     <span className="financial-refunds-stat-label">Customer paid</span>
//                     <span className="financial-refunds-stat-value">{customerPaidLabel}</span>
//                   </div>
//                 </Col>
//                 <Col xs={6} sm={4} lg>
//                   <div className="financial-refunds-stat">
//                     <span className="financial-refunds-stat-label">Partner paid (lines)</span>
//                     <span className="financial-refunds-stat-value">{money(partnerPaidTotal)}</span>
//                   </div>
//                 </Col>
//                 <Col xs={6} sm={4} lg>
//                   <div className="financial-refunds-stat">
//                     <span className="financial-refunds-stat-label">Admin commission</span>
//                     <span className="financial-refunds-stat-value">{money(commissionTotal)}</span>
//                   </div>
//                 </Col>
//                 <Col xs={6} sm={4} lg>
//                   <div className="financial-refunds-stat">
//                     <span className="financial-refunds-stat-label">Tax</span>
//                     <span className="financial-refunds-stat-value">{money(taxTotal)}</span>
//                   </div>
//                 </Col>
//               </Row>
//             )}
//           </Card.Body>
//         </Card>
//       ) : null}

//       {orderId && !detailLoading ? (
//         <Form onSubmit={handleRefund}>
//           <Card className="financial-refunds-card financial-refunds-card--form border-0 shadow-sm">
//             <Card.Body className="p-3 p-md-4">
//               <div className="financial-refunds-section-title mb-1">Record refund</div>
//               <p className="text-muted small mb-4">
//                 Pick one or both funding sources. If both are selected, enter how much comes from each — they must
//                 add up to the total refund sent to the customer.
//               </p>

//               <div className="mb-4">
//                 <Form.Label className="small fw-semibold mb-2 d-block">Funded from</Form.Label>
//                 <Row className="g-3">
//                   <Col md={6}>
//                     <div className={`financial-refunds-source-tile ${fromAdmin ? "is-active" : ""}`}>
//                       <Form.Check
//                         type="checkbox"
//                         id="ref-admin"
//                         label="From admin commission"
//                         checked={fromAdmin}
//                         onChange={(e) => setFromAdmin(e.target.checked)}
//                         className="mb-0 financial-refunds-source-check"
//                       />
//                       <span className="financial-refunds-source-hint small text-muted d-block mt-2 ms-4">
//                         Deduct from platform / admin earnings for this order.
//                       </span>
//                     </div>
//                   </Col>
//                   <Col md={6}>
//                     <div className={`financial-refunds-source-tile ${fromPartner ? "is-active" : ""}`}>
//                       <Form.Check
//                         type="checkbox"
//                         id="ref-partner"
//                         label="From partner wallet"
//                         checked={fromPartner}
//                         onChange={(e) => setFromPartner(e.target.checked)}
//                         className="mb-0 financial-refunds-source-check"
//                       />
//                       <span className="financial-refunds-source-hint small text-muted d-block mt-2 ms-4">
//                         Deduct from partner settlement / wallet for this order.
//                       </span>
//                     </div>
//                   </Col>
//                 </Row>
//               </div>

//               {fromAdmin || fromPartner ? (
//                 <div className="financial-refunds-amounts border-top pt-4">
//                   {bothSources ? (
//                     <>
//                       <Row className="g-3 mb-2">
//                         <Col md={6}>
//                           <Form.Label className="small fw-semibold">
//                             Amount from admin commission ({AppConstant.currencySymbol})
//                           </Form.Label>
//                           <Form.Control
//                             className="custom-form-input"
//                             type="number"
//                             min={0}
//                             step="0.01"
//                             inputMode="decimal"
//                             placeholder="0.00"
//                             value={adminSplitAmount}
//                             onChange={(e) => setAdminSplitAmount(e.target.value)}
//                             aria-label="Amount from admin commission"
//                           />
//                         </Col>
//                         <Col md={6}>
//                           <Form.Label className="small fw-semibold">
//                             Amount from partner wallet ({AppConstant.currencySymbol})
//                           </Form.Label>
//                           <Form.Control
//                             className="custom-form-input"
//                             type="number"
//                             min={0}
//                             step="0.01"
//                             inputMode="decimal"
//                             placeholder="0.00"
//                             value={partnerSplitAmount}
//                             onChange={(e) => setPartnerSplitAmount(e.target.value)}
//                             aria-label="Amount from partner wallet"
//                           />
//                         </Col>
//                       </Row>
//                       <div
//                         className={`financial-refunds-split-total small mb-3 ${Number.isNaN(splitSum) ? "text-muted" : "text-body"}`}
//                       >
//                         <span className="text-muted me-2">Total refund to customer:</span>
//                         <span className="fw-semibold font-monospace">
//                           {Number.isNaN(splitSum) ? "—" : money(splitSum)}
//                         </span>
//                       </div>
//                     </>
//                   ) : (
//                     <Row className="g-3 mb-2">
//                       <Col md={6} lg={5}>
//                         <Form.Label className="small fw-semibold">
//                           Refund amount ({AppConstant.currencySymbol})
//                         </Form.Label>
//                         <Form.Control
//                           className="custom-form-input"
//                           type="number"
//                           min={0}
//                           step="0.01"
//                           inputMode="decimal"
//                           placeholder="0.00"
//                           value={refundAmount}
//                           onChange={(e) => setRefundAmount(e.target.value)}
//                           aria-label="Refund amount"
//                         />
//                       </Col>
//                     </Row>
//                   )}

//                   <Row className="g-3 mb-3">
//                     <Col xs={12}>
//                       <Form.Label className="small fw-semibold">Note (optional)</Form.Label>
//                       <Form.Control
//                         className="custom-form-input"
//                         as="textarea"
//                         rows={2}
//                         placeholder="Reason or reference for finance records"
//                         value={description}
//                         onChange={(e) => setDescription(e.target.value)}
//                       />
//                     </Col>
//                   </Row>

//                   <div className="financial-refunds-submit-row">
//                     <Button
//                       type="submit"
//                       className="custom-btn-primary financial-refunds-submit-btn"
//                       disabled={submitting}
//                     >
//                       {submitting ? "Submitting…" : "Submit refund"}
//                     </Button>
//                   </div>
//                 </div>
//               ) : (
//                 <p className="text-muted small mb-0">Select at least one funding source to enter amounts.</p>
//               )}
//             </Card.Body>
//           </Card>
//         </Form>
//       ) : null}
//     </div>
//   );
// };

// export default RefundsPage;


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomDatePicker from "../../../components/CustomDatePicker";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { AppConstant } from "../../../constant/AppConstant";
import { deleteOrder, fetchOrder } from "../../../services/orderService";
import { OrderModel } from "../../../models/OrderModel";
import { showSuccessAlert } from "../../../helper/alertHelper";
import { formatDate } from "../../../helper/utility";
import AddEditRefund, { RefundFormPayload, RefundRow } from "./AddEditRefund";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";

function money(n: number | null | undefined): string {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "—";
  return `${AppConstant.currencySymbol}${Number(n).toFixed(2)}`;
}

const toIsoCalendarDate = (date: Date | null): string | null => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const RefundsPage = () => {
  const { register: headerRegister, setValue: setHeaderValue } = useForm<{ franchise_id: string }>({
    defaultValues: { franchise_id: "all" },
  });

  const {
    register: quoteFilterRegister,
    setValue: setQuoteFilterValue,
  } = useForm<{
    from_date: string;
    to_date: string;
  }>({
    defaultValues: { from_date: "", to_date: "" },
  });

  const fetchRef = useRef(false);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refundRows, setRefundRows] = useState<RefundRow[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadRefundRows = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    setOrdersLoading(true);

    try {
      const { response, orders } = await fetchOrder(1, 200, {});
      if (response) {
        const list = orders ?? [];
        const mappedRows: RefundRow[] = list.map((o: OrderModel) => ({
          _id: o._id || `${Date.now()}-${Math.random()}`,
          order_id: o._id || "",
          order_unique_id: o.unique_id ?? o._id ?? "-",
          user_name: o.user_name || "-",
          total_amount: Number(o.total_price) || 0,
          refund_amount: undefined,
          from_admin_commission: undefined,
          from_partner_wallet: undefined,
          created_at: o.created_at || o.updated_at || null,
        }));

        setRefundRows(mappedRows);
      }
    } finally {
      setOrdersLoading(false);
      fetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadRefundRows();
  }, [loadRefundRows]);

  const handleVoidOrder = useCallback(
    (row: RefundRow) => {
    const id = row.order_id || row._id;
    const display = row.order_unique_id ?? id ?? "-";

    if (!id) return;

    openConfirmDialog(
      `Are you sure you want to void this order (${display})?`,
      "Void",
      "Cancel",
      async () => {
        await deleteOrder(String(id));
        setCurrentPage(1);
        await loadRefundRows();
      }
    );
    },
    [loadRefundRows]
  );

  const filteredRows = useMemo(() => {
    let list = [...refundRows];

    if (fromDate) {
      const fromTs = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((item) => {
        if (!item.created_at) return true;
        return new Date(item.created_at).getTime() >= fromTs;
      });
    }

    if (toDate) {
      const toTs = new Date(toDate).setHours(23, 59, 59, 999);
      list = list.filter((item) => {
        if (!item.created_at) return true;
        return new Date(item.created_at).getTime() <= toTs;
      });
    }

    if (searchValue.trim()) {
      const keyword = searchValue.trim().toLowerCase();
      list = list.filter((item) => {
        return (
          String(item.order_unique_id).toLowerCase().includes(keyword) ||
          String(item.user_name).toLowerCase().includes(keyword)
        );
      });
    }

    return list;
  }, [refundRows, fromDate, toDate, searchValue]);

  const totalPages = useMemo(() => {
    if (!filteredRows.length) return 0;
    return Math.ceil(filteredRows.length / pageSize);
  }, [filteredRows, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleRefundSave = async (payload: RefundFormPayload) => {
    setSubmittingRefund(true);

    try {
      const newRow: RefundRow = {
        _id: `${Date.now()}`,
        order_id: "",
        order_unique_id: payload.order_unique_id,
        user_name: payload.user_name,
        total_amount: payload.total_amount,
        refund_amount: payload.refund_amount,
        from_admin_commission: payload.from_admin_commission,
        from_partner_wallet: payload.from_partner_wallet,
        created_at: payload.created_at,
      };

      setRefundRows((prev) => [newRow, ...prev]);
      setShowRefundModal(false);
      showSuccessAlert("Refund added successfully.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const refundColumns = useMemo(
    () => [
      {
        Header: "S.No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Order ID",
        accessor: "order_unique_id",
      },
      { Header: "User Name", accessor: "user_name" },
      {
        Header: "Total Amount",
        accessor: "total_amount",
        Cell: ({ row }: { row: any }) => money(row.original.total_amount),
      },
      {
        Header: "Refund Amount",
        accessor: "refund_amount",
        Cell: ({ row }: { row: any }) =>
          row.original.refund_amount !== undefined ? money(row.original.refund_amount) : "—",
      },
      {
        Header: "From Admin Commission",
        accessor: "from_admin_commission",
        Cell: ({ row }: { row: any }) =>
          row.original.from_admin_commission !== undefined
            ? money(row.original.from_admin_commission)
            : "—",
      },
      {
        Header: "From Partner Wallet",
        accessor: "from_partner_wallet",
        Cell: ({ row }: { row: any }) =>
          row.original.from_partner_wallet !== undefined
            ? money(row.original.from_partner_wallet)
            : "—",
      },
      {
        Header: "Date",
        accessor: "created_at",
        Cell: ({ row }: { row: any }) => formatDate(row.original.created_at || ""),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: { original: RefundRow } }) => (
          <CustomActionColumn
            row={row}
            onDelete={() => handleVoidOrder(row.original)}
          />
        ),
      },
    ],
    [currentPage, pageSize, handleVoidOrder]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Financial — Refunds"
        titlePrefix={<FinancialSubPageBackButton />}
        register={headerRegister as unknown as UseFormRegister<any>}
        setValue={setHeaderValue as (name: string, value: any) => void}
        rightActions={
          <Button type="button" className="custom-btn-secondary w-auto btn btn-primary" onClick={() => setShowRefundModal(true)}>
            Add Refund
          </Button>
        }
      />

      <CustomUtilityBox
        key={utilitySearchKey}
        title="Refunds"
        searchHint="Search Order ID, User Name..."
        toolsInlineRow
        hideMoreIcon
        controlSlot={
          <>
            <div style={{ minWidth: "220px" }}>
              <CustomDatePicker
                label="From Date"
                controlId="from_date"
                selectedDate={fromDate}
                onChange={(date) => {
                  const next = toIsoCalendarDate(date);
                  setFromDate(next);
                  setCurrentPage(1);
                }}
                register={quoteFilterRegister as unknown as UseFormRegister<any>}
                setValue={setQuoteFilterValue as (name: string, value: any) => void}
                asCol={false}
                groupClassName="mb-0 w-100 fw-medium"
                placeholderText="From Date"
                filterDate={() => true}
              />
            </div>

            <div style={{ minWidth: "220px" }}>
              <CustomDatePicker
                label="To Date"
                controlId="to_date"
                selectedDate={toDate}
                onChange={(date) => {
                  const next = toIsoCalendarDate(date);
                  setToDate(next);
                  setCurrentPage(1);
                }}
                register={quoteFilterRegister as unknown as UseFormRegister<any>}
                setValue={setQuoteFilterValue as (name: string, value: any) => void}
                asCol={false}
                groupClassName="mb-0 w-100 fw-medium"
                placeholderText="To Date"
                filterDate={() => true}
              />
            </div>
          </>
        }
        afterSearchSlot={
          <Button
            variant="outline-secondary"
            size="sm"
            className="custom-btn-secondary partner-payout-clear-btn px-3"
            type="button"
            disabled={!fromDate && !toDate && !searchValue.trim()}
            onClick={() => {
              setFromDate(null);
              setToDate(null);
              setSearchValue("");
              setQuoteFilterValue("from_date", "");
              setQuoteFilterValue("to_date", "");
              setUtilitySearchKey((k) => k + 1);
              setCurrentPage(1);
            }}
          >
            Clear
          </Button>
        }
        onDownloadClick={async () => {}}
        onSortClick={() => {}}
        onMoreClick={() => {}}
        onSearch={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
      />

      {ordersLoading ? (
        <div className="bg-white border rounded p-4 text-center">Loading...</div>
      ) : (
        <CustomTable
          columns={refundColumns}
          data={pagedRows}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page: number) => setCurrentPage(page)}
          onLimitChange={(updatedPageSize: number) => {
            setPageSize(updatedPageSize);
            setCurrentPage(1);
          }}
          theadClass="table-light"
        />
      )}

      <AddEditRefund
        show={showRefundModal}
        onHide={() => setShowRefundModal(false)}
        refundData={null}
        onSave={handleRefundSave}
        isSubmitting={submittingRefund}
      />
    </div>
  );
};

export default RefundsPage;