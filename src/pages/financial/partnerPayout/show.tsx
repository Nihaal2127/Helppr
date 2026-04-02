import React, { useState, useEffect, useMemo } from "react";
import { Spinner, Row, Col, Button, Card } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import FinancialSubPageNav from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { FinancialModel } from "../../../models/FinancialModel";
import { formatDate } from "../../../helper/utility";
import { fetchAllFinancialRowsMatching } from "../../../services/financialService";
import { fetchUserById } from "../../../services/userService";
import { UserModel } from "../../../models/UserModel";
import OrderInfoDialog from "../../orderManagement/OrderInfoDialog";
import { AppConstant } from "../../../constant/AppConstant";
import {
  fetchAllPartnerWalletPayoutHistory,
  PartnerWalletPayoutHistoryRow,
} from "../../../services/partnerPayoutService";

type WalletLedgerEntry = {
  id: string;
  sortTime: number;
  dateLabel: string;
  txType: "credit" | "debit";
  orderIdDisplay: string;
  description: string;
  amount: number;
  orderId?: string | null;
};

function absMoney(n: number): string {
  return `${AppConstant.currencySymbol}${Math.abs(Number(n) || 0).toFixed(2)}`;
}

function ledgerDateLabel(sortTime: number, rawIso?: string | null): string {
  if (rawIso) {
    const d = formatDate(rawIso);
    if (d !== "-") return d;
  }
  return formatDate(new Date(sortTime).toISOString());
}

function startOfDayMs(yyyyMmDd: string): number {
  return new Date(`${yyyyMmDd}T00:00:00`).getTime();
}

function endOfDayMs(yyyyMmDd: string): number {
  return new Date(`${yyyyMmDd}T23:59:59.999`).getTime();
}

function buildWalletLedgerDemoEntries(): WalletLedgerEntry[] {
  const day = 86400000;
  const base = Date.now();
  return [
    {
      id: "demo-withdraw-1",
      sortTime: base,
      dateLabel: ledgerDateLabel(base),
      txType: "debit",
      orderIdDisplay: "—",
      description: "Wallet payout · razorpay. Partner withdrawal — ref UTR DEMO998877",
      amount: 3200,
      orderId: null,
    },
    {
      id: "demo-earn-1",
      sortTime: base - day * 1 + 3600000 * 14,
      dateLabel: ledgerDateLabel(base - day * 1 + 3600000 * 14),
      txType: "credit",
      orderIdDisplay: "11",
      description: "Home cleaning · Deep home cleaning (4 BHK)",
      amount: 2100,
      orderId: null,
    },
    {
      id: "demo-earn-2",
      sortTime: base - day * 2 + 3600000 * 10,
      dateLabel: ledgerDateLabel(base - day * 2 + 3600000 * 10),
      txType: "credit",
      orderIdDisplay: "1042",
      description: "Upholstery · Sofa & carpet shampoo",
      amount: 950,
      orderId: null,
    },
    {
      id: "demo-withdraw-2",
      sortTime: base - day * 3 + 3600000 * 16,
      dateLabel: ledgerDateLabel(base - day * 3 + 3600000 * 16),
      txType: "debit",
      orderIdDisplay: "—",
      description: "Wallet payout · cash. Counter settlement — branch Indiranagar",
      amount: 1500,
      orderId: null,
    },
    {
      id: "demo-earn-3",
      sortTime: base - day * 5 + 3600000 * 11,
      dateLabel: ledgerDateLabel(base - day * 5 + 3600000 * 11),
      txType: "credit",
      orderIdDisplay: "110",
      description: "Appliance · AC service (3 units)",
      amount: 840,
      orderId: null,
    },
    {
      id: "demo-earn-4",
      sortTime: base - day * 8 + 3600000 * 9,
      dateLabel: ledgerDateLabel(base - day * 8 + 3600000 * 9),
      txType: "credit",
      orderIdDisplay: "99",
      description: "Restoration · Bathroom restoration package",
      amount: 4320,
      orderId: null,
    },
  ];
}

function ShowPartnerPayout() {
  const { register, setValue } = useForm();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const partnerId = queryParams.get("id");
  const [partnerSummary, setPartnerSummary] = useState<UserModel | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);

  const [mergedOrderLines, setMergedOrderLines] = useState<FinancialModel[]>([]);
  const [payoutRowsAll, setPayoutRowsAll] = useState<PartnerWalletPayoutHistoryRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  useEffect(() => {
    setLedgerPage(1);
  }, [fromDate, toDate, keyword, typeFilter]);

  useEffect(() => {
    if (!partnerId) {
      setPartnerSummary(null);
      setPartnerLoading(false);
      return;
    }
    let cancelled = false;
    setPartnerLoading(true);
    (async () => {
      const { response, user } = await fetchUserById(partnerId);
      if (cancelled) return;
      setPartnerSummary(response && user ? user : null);
      setPartnerLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      setLedgerLoading(true);
      try {
        const [pendingRows, paidRows, payouts] = await Promise.all([
          fetchAllFinancialRowsMatching(
            { partner_id: partnerId, service_status: "3", partner_paid_status: "1" },
            400,
            { skipEnrich: true }
          ),
          fetchAllFinancialRowsMatching(
            { partner_id: partnerId, service_status: "3", partner_paid_status: "2" },
            400,
            { skipEnrich: true }
          ),
          fetchAllPartnerWalletPayoutHistory(partnerId),
        ]);
        if (cancelled) return;
        const all = [...(pendingRows ?? []), ...(paidRows ?? [])];
        const byId = new Map<string, FinancialModel>();
        all.forEach((r) => byId.set(r._id, r));
        const merged = Array.from(byId.values()).sort((x, y) => {
          const dx = new Date(x.service_date || x.updated_at || 0).getTime();
          const dy = new Date(y.service_date || y.updated_at || 0).getTime();
          return dy - dx;
        });
        setMergedOrderLines(merged);
        setPayoutRowsAll(payouts);
        setLedgerPage(1);
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const partnerDetail = useMemo(() => {
    const u = partnerSummary;
    if (!u) return null;
    return {
      name: u.name?.trim() || "—",
      userId: u.user_id || "—",
    };
  }, [partnerSummary]);

  const totalWalletAmount = useMemo(() => {
    const u = partnerSummary;
    if (!u) return null;
    const raw = u.total_wallet_amount ?? u.total_amount;
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [partnerSummary]);

  const ledgerBuild = useMemo(() => {
    const out: WalletLedgerEntry[] = [];
    for (const row of mergedOrderLines) {
      const tEarn = new Date(row.service_date || row.updated_at || row.created_at || 0).getTime();
      const earning = Number(row.partner_earning) || 0;
      if (earning > 0) {
        const rawEarn = row.service_date || row.updated_at || row.created_at || "";
        const oid =
          row.order_unique_id?.trim() ||
          (row.order_id ? String(row.order_id).trim() : "");
        const descParts = [row.category_name?.trim(), row.service_name?.trim()].filter(Boolean);
        out.push({
          id: `${row._id}-earn`,
          sortTime: tEarn,
          dateLabel: ledgerDateLabel(tEarn, rawEarn),
          txType: "credit",
          orderIdDisplay: oid || "—",
          description: descParts.length ? descParts.join(" · ") : "Service earning",
          amount: earning,
          orderId: row.order_id,
        });
      }
    }
    for (const p of payoutRowsAll) {
      const t = new Date(p.created_at || 0).getTime();
      const amt = Number(p.amount) || 0;
      if (amt <= 0) continue;
      const method = String(p.payment_method || "—").replace(/_/g, " ");
      const descExtra = p.description?.trim() || "Admin payout to partner";
      out.push({
        id: `payout-${p._id}`,
        sortTime: t,
        dateLabel: ledgerDateLabel(t, p.created_at || null),
        txType: "debit",
        orderIdDisplay: "—",
        description: `Wallet payout · ${method}. ${descExtra}`,
        amount: amt,
        orderId: null,
      });
    }
    out.sort((a, b) => b.sortTime - a.sortTime);

    if (out.length === 0) {
      return { entries: buildWalletLedgerDemoEntries(), isPlaceholder: true };
    }
    return { entries: out, isPlaceholder: false };
  }, [mergedOrderLines, payoutRowsAll]);

  const ledgerEntries = ledgerBuild.entries;

  const filteredLedgerEntries = useMemo(() => {
    let list = ledgerEntries;
    if (fromDate) {
      const t0 = startOfDayMs(fromDate);
      list = list.filter((e) => e.sortTime >= t0);
    }
    if (toDate) {
      const t1 = endOfDayMs(toDate);
      list = list.filter((e) => e.sortTime <= t1);
    }
    if (typeFilter !== "all") {
      list = list.filter((e) => e.txType === typeFilter);
    }
    const needle = keyword.trim().toLowerCase();
    if (needle) {
      list = list.filter((e) => {
        const disp = e.orderIdDisplay.toLowerCase();
        const oid = (e.orderId || "").toLowerCase();
        const desc = e.description.toLowerCase();
        return disp.includes(needle) || oid.includes(needle) || desc.includes(needle);
      });
    }
    return list;
  }, [ledgerEntries, fromDate, toDate, typeFilter, keyword]);

  const sortedFilteredLedger = useMemo(() => {
    return [...filteredLedgerEntries].sort((a, b) => b.sortTime - a.sortTime);
  }, [filteredLedgerEntries]);

  const ledgerTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedFilteredLedger.length / ledgerPageSize) || 1),
    [sortedFilteredLedger.length, ledgerPageSize]
  );

  useEffect(() => {
    setLedgerPage((p) => Math.min(p, ledgerTotalPages));
  }, [ledgerTotalPages]);

  const ledgerSlice = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return sortedFilteredLedger.slice(start, start + ledgerPageSize);
  }, [sortedFilteredLedger, ledgerPage, ledgerPageSize]);

  const walletTxColumns = useMemo(
    () => [
      {
        Header: "SR No",
        id: "sr",
        accessor: "id",
        Cell: ({ row }: { row: { index: number } }) => (ledgerPage - 1) * ledgerPageSize + row.index + 1,
      },
      {
        Header: "Date",
        accessor: "dateLabel",
      },
      {
        Header: "Type",
        accessor: "txType",
        Cell: ({ row }: { row: { original: WalletLedgerEntry } }) => {
          const isCredit = row.original.txType === "credit";
          return (
            <span className={isCredit ? "wallet-tx-table__type-credit" : "wallet-tx-table__type-debit"}>
              {isCredit ? "Credit" : "Debit"}
            </span>
          );
        },
      },
      {
        Header: "Order ID",
        accessor: "orderIdDisplay",
        Cell: ({ row }: { row: { original: WalletLedgerEntry } }) => {
          const tx = row.original;
          if (tx.orderId && tx.orderIdDisplay !== "—") {
            return (
              <button
                type="button"
                className="wallet-tx-table__order-link"
                onClick={() => OrderInfoDialog.show(tx.orderId!, () => {})}
              >
                {tx.orderIdDisplay}
              </button>
            );
          }
          return tx.orderIdDisplay || "—";
        },
      },
      {
        Header: "Description",
        accessor: "description",
        className: "text-start",
        Cell: ({ row }: { row: { original: WalletLedgerEntry } }) => (
          <span className="wallet-tx-table__desc-cell">{row.original.description || "—"}</span>
        ),
      },
      {
        Header: "Amount",
        accessor: "amount",
        className: "text-end",
        Cell: ({ row }: { row: { original: WalletLedgerEntry } }) => {
          const isCredit = row.original.txType === "credit";
          return (
            <span
              className={
                isCredit ? "wallet-tx-table__amount--credit" : "wallet-tx-table__amount--debit"
              }
            >
              {isCredit ? "+" : "−"}
              {absMoney(row.original.amount)}
            </span>
          );
        },
      },
    ],
    [ledgerPage, ledgerPageSize]
  );

  const filterControls = (
    <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-2 mt-2 mb-2 align-items-end">
      <Col>
        <CustomDatePicker
          label="From Date"
          controlId="from_date_filter"
          selectedDate={fromDate || null}
          onChange={(date) => setFromDate(date ? date.toISOString().slice(0, 10) : "")}
          register={register as unknown as UseFormRegister<any>}
          setValue={setValue as (name: string, value: any) => void}
          asCol={false}
          groupClassName="mb-0 w-100"
          placeholderText="From Date"
          filterDate={() => true}
        />
      </Col>
      <Col>
        <CustomDatePicker
          label="To Date"
          controlId="to_date_filter"
          selectedDate={toDate || null}
          onChange={(date) => setToDate(date ? date.toISOString().slice(0, 10) : "")}
          register={register as unknown as UseFormRegister<any>}
          setValue={setValue as (name: string, value: any) => void}
          asCol={false}
          groupClassName="mb-0 w-100"
          placeholderText="To Date"
          filterDate={() => true}
        />
      </Col>
      <Col>
        <CustomFormSelect
          label="Transaction Type"
          controlId="transaction_type_filter"
          register={register as unknown as UseFormRegister<any>}
          options={[
            { value: "all", label: "All types" },
            { value: "credit", label: "Credit" },
            { value: "debit", label: "Debit" },
          ]}
          fieldName="transaction_type_filter"
          defaultValue={typeFilter}
          setValue={setValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
          asCol={false}
          noBottomMargin
          onChange={(e) => setTypeFilter(e.target.value as "all" | "credit" | "debit")}
        />
      </Col>
      <Col xs="auto" className="d-flex align-items-end">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary partner-payout-clear-btn px-3"
          disabled={!fromDate && !toDate && !keyword.trim() && typeFilter === "all"}
          onClick={() => {
            setFromDate("");
            setToDate("");
            setKeyword("");
            setTypeFilter("all");
            setUtilitySearchKey((k) => k + 1);
            setLedgerPage(1);
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
  );

  if (!partnerId) {
    return (
      <div className="main-page-content">
        <CustomHeader title="Financial — Partner Payout Details" titlePrefix={<FinancialSubPageNav />} />
        <p className="text-muted">Missing partner ID.</p>
      </div>
    );
  }

  return (
    <div className="main-page-content">
      <CustomHeader title="Financial — Partner Payout Details" titlePrefix={<FinancialSubPageNav />} />

      {partnerLoading ? (
        <Card className="partner-payout-detail-card border-0 shadow-sm mb-4">
          <Card.Body className="py-5 d-flex justify-content-center align-items-center gap-2 text-muted small">
            <Spinner animation="border" size="sm" />
            Loading partner…
          </Card.Body>
        </Card>
      ) : partnerDetail ? (
        <Card className="partner-payout-detail-card border-0 shadow-sm mb-4">
          <Card.Body className="p-3 p-md-4">
            <Row className="align-items-center g-3">
              <Col className="min-w-0">
                <h5 className="partner-payout-detail-name mb-1 text-break">{partnerDetail.name}</h5>
                <div className="text-muted small mb-0">
                  Partner ID{" "}
                  <span className="font-monospace user-select-all">{partnerDetail.userId}</span>
                </div>
              </Col>
              <Col xs={12} md="auto" className="ms-md-auto">
                <div className="partner-payout-detail-wallet text-md-end">
                  <div className="partner-payout-detail-wallet-label text-uppercase">Total wallet</div>
                  <div className="partner-payout-detail-wallet-value">
                    {totalWalletAmount === null
                      ? "—"
                      : `${AppConstant.currencySymbol}${totalWalletAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      ) : null}

      <CustomUtilityBox
        key={utilitySearchKey}
        searchOnlyToolbar
        title="Wallet transactions"
        searchHint="Order ID or description…"
        onSearch={(value) => {
          setKeyword(value.trim());
          setLedgerPage(1);
        }}
        onDownloadClick={() => {}}
        onSortClick={() => {}}
        onMoreClick={() => {}}
      />

      {filterControls}

      {ledgerLoading ? (
        <div
          className="d-flex justify-content-center align-items-center gap-2 py-5"
          style={{ border: "1px solid var(--txtfld-border)", borderRadius: "8px" }}
        >
          <Spinner animation="border" size="sm" />
          <span className="text-muted small">Loading transactions…</span>
        </div>
      ) : (
        <CustomTable
          columns={walletTxColumns}
          data={ledgerSlice}
          pageSize={ledgerPageSize}
          currentPage={ledgerPage}
          totalPages={ledgerTotalPages}
          onPageChange={(page: number) => setLedgerPage(page)}
          onLimitChange={(ps: number) => {
            setLedgerPageSize(ps);
            setLedgerPage(1);
          }}
          theadClass="table-light"
          tableClass="wallet-tx-react-table"
          dynamicRowBackground={false}
          getRowClassName={(row) =>
            row.original.txType === "credit" ? "wallet-tx-table__row--credit" : "wallet-tx-table__row--debit"
          }
        />
      )}
    </div>
  );
}

export { ShowPartnerPayout };
export default ShowPartnerPayout;
