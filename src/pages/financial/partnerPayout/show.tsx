import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner, Row, Col, Button, Card } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { ROUTES } from "../../../routes/Routes";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { FinancialModel } from "../../../lib/models/FinancialModel";
import { formatDate } from "../../../helper/utility";
import { fetchAllOrderServiceRowsMatching } from "../../../services/financialService";
import { fetchUserById } from "../../../services/userService";
import { UserModel } from "../../../lib/models/UserModel";
import { showOrderInfoDialog } from "../../../components/order";
import { AppConstant } from "../../../lib/global/AppConstant";
import {
  fetchAllPartnerWalletPayoutHistory,
  PartnerWalletPayoutHistoryRow,
} from "../../../services/partnerPayoutService";
import { partnerPayoutPaymentMethodLabel } from "../../../lib/financial/partnerPayoutPayment";
import {
  patchPartnerPayoutSearchParams,
  readPartnerPayoutLedgerUrl,
} from "../../../lib/financial/partnerPayoutUrl";

type WalletLedgerEntry = {
  id: string;
  sortTime: number;
  dateLabel: string;
  txType: "credit" | "debit";
  orderIdDisplay: string;
  description: string;
  /** Debit: cash, upi, imps, … — credit: null */
  payment_method: string | null;
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
      description: "Partner withdrawal — ref UTR DEMO998877",
      payment_method: "upi",
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
      payment_method: null,
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
      payment_method: null,
      amount: 950,
      orderId: null,
    },
    {
      id: "demo-withdraw-2",
      sortTime: base - day * 3 + 3600000 * 16,
      dateLabel: ledgerDateLabel(base - day * 3 + 3600000 * 16),
      txType: "debit",
      orderIdDisplay: "—",
      description: "Counter settlement — branch Indiranagar",
      payment_method: "cash",
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
      payment_method: null,
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
      payment_method: null,
      amount: 4320,
      orderId: null,
    },
  ];
}

/** Chevron in header: returns to Partner Payout list (not the Financials hub). */
function PartnerPayoutDetailsBackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="financial-subpage-back"
      onClick={() => navigate(ROUTES.PARTNER_PAYOUT.path)}
      aria-label="Back to Partner Payout"
    >
      <i className="bi bi-chevron-left text-danger"></i>
    </button>
  );
}

function ShowPartnerPayout() {
  const { register, setValue } = useForm();
  const [searchParams, setSearchParams] = useSearchParams();

  const url = useMemo(
    () => readPartnerPayoutLedgerUrl(searchParams),
    [searchParams]
  );

  const partnerId = useMemo(() => {
    const raw = url.partnerId;
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [url.partnerId]);

  const patchUrl = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      setSearchParams(
        (prev) => patchPartnerPayoutSearchParams(prev, updates),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [partnerSummary, setPartnerSummary] = useState<UserModel | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(true);

  const [mergedOrderLines, setMergedOrderLines] = useState<FinancialModel[]>(
    []
  );
  const [payoutRowsAll, setPayoutRowsAll] = useState<
    PartnerWalletPayoutHistoryRow[]
  >([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

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
          fetchAllOrderServiceRowsMatching(
            {
              partner_id: partnerId,
              service_status: "3",
              partner_paid_status: "1",
            },
            400
          ),
          fetchAllOrderServiceRowsMatching(
            {
              partner_id: partnerId,
              service_status: "3",
              partner_paid_status: "2",
            },
            400
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
      const tEarn = new Date(
        row.service_date || row.updated_at || row.created_at || 0
      ).getTime();
      const earning = Number(row.partner_earning) || 0;
      if (earning > 0) {
        const rawEarn =
          row.service_date || row.updated_at || row.created_at || "";
        const oid =
          row.order_unique_id?.trim() ||
          (row.order_id ? String(row.order_id).trim() : "");
        const descParts = [
          row.category_name?.trim(),
          row.service_name?.trim(),
        ].filter(Boolean);
        out.push({
          id: `${row._id}-earn`,
          sortTime: tEarn,
          dateLabel: ledgerDateLabel(tEarn, rawEarn),
          txType: "credit",
          orderIdDisplay: oid || "—",
          description: descParts.length
            ? descParts.join(" · ")
            : "Service earning",
          payment_method: null,
          amount: earning,
          orderId: row.order_id,
        });
      }
    }
    for (const p of payoutRowsAll) {
      const t = new Date(p.created_at || 0).getTime();
      const amt = Number(p.amount) || 0;
      if (amt <= 0) continue;
      const methodSlug = String(p.payment_method ?? "").trim().toLowerCase();
      const descExtra = p.description?.trim() || "Admin payout to partner";
      out.push({
        id: `payout-${p._id}`,
        sortTime: t,
        dateLabel: ledgerDateLabel(t, p.created_at || null),
        txType: "debit",
        orderIdDisplay: "—",
        description: descExtra,
        payment_method: methodSlug || null,
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
    if (url.fromDate) {
      const t0 = startOfDayMs(url.fromDate);
      list = list.filter((e) => e.sortTime >= t0);
    }
    if (url.toDate) {
      const t1 = endOfDayMs(url.toDate);
      list = list.filter((e) => e.sortTime <= t1);
    }
    if (url.transactionType !== "all") {
      list = list.filter((e) => e.txType === url.transactionType);
    }
    const needle = url.search.toLowerCase();
    if (needle) {
      list = list.filter((e) => {
        const disp = e.orderIdDisplay.toLowerCase();
        const oid = (e.orderId || "").toLowerCase();
        const desc = e.description.toLowerCase();
        const pay = partnerPayoutPaymentMethodLabel(e.payment_method).toLowerCase();
        return (
          disp.includes(needle) ||
          oid.includes(needle) ||
          desc.includes(needle) ||
          pay.includes(needle)
        );
      });
    }
    return list;
  }, [ledgerEntries, url]);

  const sortedFilteredLedger = useMemo(() => {
    return [...filteredLedgerEntries].sort((a, b) => b.sortTime - a.sortTime);
  }, [filteredLedgerEntries]);

  const ledgerTotalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(sortedFilteredLedger.length / url.limit) || 1),
    [sortedFilteredLedger.length, url.limit]
  );

  const ledgerPage = Math.min(url.page, ledgerTotalPages);

  const ledgerSlice = useMemo(() => {
    const start = (ledgerPage - 1) * url.limit;
    return sortedFilteredLedger.slice(start, start + url.limit);
  }, [sortedFilteredLedger, ledgerPage, url.limit]);

  const walletTxColumns = useMemo(
    () => [
      {
        Header: "SR No",
        id: "sr",
        accessor: "id",
        Cell: ({ row }: { row: { index: number } }) =>
          (ledgerPage - 1) * url.limit + row.index + 1,
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
            <span
              className={
                isCredit
                  ? "wallet-tx-table__type-credit"
                  : "wallet-tx-table__type-debit"
              }
            >
              {isCredit ? "CREDIT" : "DEBIT"}
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
                onClick={() => showOrderInfoDialog(tx.orderId!, () => {})}
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
          <span className="wallet-tx-table__desc-cell">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        Header: "Payment method",
        accessor: "payment_method",
        Cell: ({ row }: { row: { original: WalletLedgerEntry } }) => {
          const tx = row.original;
          if (tx.txType !== "debit" || !tx.payment_method) return "—";
          return partnerPayoutPaymentMethodLabel(tx.payment_method);
        },
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
                isCredit
                  ? "wallet-tx-table__amount--credit"
                  : "wallet-tx-table__amount--debit"
              }
            >
              {isCredit ? "+" : "−"}
              {absMoney(row.original.amount)}
            </span>
          );
        },
      },
    ],
    [ledgerPage, url.limit]
  );

  const ledgerFiltersActive =
    !!url.fromDate ||
    !!url.toDate ||
    !!url.search ||
    url.transactionType !== "all";

  const filterControls = (
    <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-2 mt-2 mb-2 align-items-end">
      <Col>
        <CustomDatePicker
          label="From Date"
          controlId="from_date_filter"
          selectedDate={url.fromDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            patchUrl({ from_date: value || undefined, page: 1 });
          }}
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
          selectedDate={url.toDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            patchUrl({ to_date: value || undefined, page: 1 });
          }}
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
          defaultValue={url.transactionType}
          setValue={
            setValue as (
              name: string,
              value: any,
              options?: { shouldValidate?: boolean }
            ) => void
          }
          asCol={false}
          noBottomMargin
          onChange={(e) =>
            patchUrl({
              transaction_type: e.target.value,
              page: 1,
            })
          }
        />
      </Col>
      <Col xs="auto" className="d-flex align-items-end">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary partner-payout-clear-btn px-3"
          disabled={!ledgerFiltersActive}
          onClick={() => {
            patchUrl({
              from_date: undefined,
              to_date: undefined,
              search: undefined,
              transaction_type: undefined,
              page: 1,
            });
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Financial — Partner Payout Details"
        titlePrefix={<PartnerPayoutDetailsBackButton />}
      />

      {!partnerId ? (
        <p className="text-muted px-1">
          Missing partner ID. Open this screen from Financial — Partner Payout
          and choose View on a partner row.
        </p>
      ) : (
        <>
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
                    <h5 className="partner-payout-detail-name mb-1 text-break">
                      {partnerDetail.name}
                    </h5>
                    <div className="text-muted small mb-0">
                      Partner ID{" "}
                      <span className="font-monospace user-select-all">
                        {partnerDetail.userId}
                      </span>
                    </div>
                  </Col>
                  <Col xs={12} md="auto" className="ms-md-auto">
                    <div className="partner-payout-detail-wallet text-md-end">
                      <div className="partner-payout-detail-wallet-label text-uppercase">
                        Total wallet
                      </div>
                      <div className="partner-payout-detail-wallet-value">
                        {totalWalletAmount === null
                          ? "—"
                          : `${
                              AppConstant.currencySymbol
                            }${totalWalletAmount.toLocaleString(undefined, {
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
            key={`${url.search}-${url.fromDate}-${url.toDate}-${url.transactionType}`}
            searchOnlyToolbar
            title="Wallet transactions"
            searchHint="Order ID or description…"
            onSearch={(value) => {
              patchUrl({ search: value.trim() || undefined, page: 1 });
            }}
            syncKeyword={url.search}
            onDownloadClick={() => {}}
            onSortClick={() => {}}
            onMoreClick={() => {}}
          />

          {filterControls}

          {ledgerLoading ? (
            <div
              className="d-flex justify-content-center align-items-center gap-2 py-5"
              style={{
                border: "1px solid var(--txtfld-border)",
                borderRadius: "8px",
              }}
            >
              <Spinner animation="border" size="sm" />
              <span className="text-muted small">Loading transactions…</span>
            </div>
          ) : (
            <CustomTable
              columns={walletTxColumns}
              data={ledgerSlice}
              pageSize={url.limit}
              currentPage={ledgerPage}
              totalPages={ledgerTotalPages}
              onPageChange={(page: number) => patchUrl({ page })}
              onLimitChange={(ps: number) => {
                patchUrl({ limit: ps, page: 1 });
              }}
              theadClass="table-light"
              tableClass="wallet-tx-react-table"
              dynamicRowBackground={false}
              getRowClassName={(row) =>
                row.original.txType === "credit"
                  ? "wallet-tx-table__row--credit"
                  : "wallet-tx-table__row--debit"
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export { ShowPartnerPayout };
export default ShowPartnerPayout;
