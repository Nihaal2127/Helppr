import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { fetchUser } from "../../../services/userService";
import { UserModel } from "../../../models/UserModel";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { ROUTES } from "../../../routes/Routes";
import { AppConstant } from "../../../constant/AppConstant";
import { formatDate, priceCell, textUnderlineCell } from "../../../helper/utility";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
import PartnerDetailsDialog from "../../userManagement/PartnerDetailsDialog";
import AddPayoutDialog from "./AddPayoutDialog";
import type { ServerTableSortBy } from "../../../helper/serverTableSort";

const WALLET_STATUS_OPTIONS = [
  { value: "all", label: "All wallet statuses" },
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
] as const;

const PartnerPayout = () => {
  const navigate = useNavigate();

  const { register: headerRegister, setValue: setHeaderValue } = useForm<{ franchise_id: string }>({
    defaultValues: { franchise_id: "all" },
  });

  const [partnerList, setPartnerList] = useState<UserModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const fetchRef = useRef(false);
  const [walletStatus, setWalletStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);
  const [keywordActive, setKeywordActive] = useState(false);
  const [sortBy, setSortBy] = useState<ServerTableSortBy>([]);
  const listRef = useRef({ walletStatus: "all", fromDate: "", toDate: "" });
  const keywordRef = useRef("");

  useEffect(() => {
    listRef.current = { walletStatus, fromDate, toDate };
  }, [walletStatus, fromDate, toDate]);

  const fetchData = useCallback(
    async (filters: { keyword?: string; status?: string }) => {
      if (fetchRef.current) return;
      fetchRef.current = true;
      const w = listRef.current;
      const { response, users, totalPages: tp } = await fetchUser(false, 2, currentPage, pageSize, {
        keyword: filters.keyword ?? keywordRef.current,
        status: "true",
        wallet_status: w.walletStatus,
        ...(w.fromDate ? { from_date: w.fromDate } : {}),
        ...(w.toDate ? { to_date: w.toDate } : {}),
      }, sortBy);
      if (response) {
        setPartnerList(users);
        setTotalPages(tp);
      }
      fetchRef.current = false;
    },
    [currentPage, pageSize, sortBy]
  );

  useEffect(() => {
    void fetchData({});
  }, [currentPage, pageSize, walletStatus, fromDate, toDate, fetchData]);

  const handleFilterChange = async (filters: { keyword?: string; status?: string }) => {
    setCurrentPage(1);
    setTotalPages(0);
    if (Object.keys(filters).length === 0) {
      fetchRef.current = false;
    } else {
      await fetchData(filters);
    }
  };

  const handleServerSortChange = useCallback((next: { id: string; desc: boolean }[]) => {
    setSortBy(next);
    setCurrentPage(1);
  }, []);

  const bumpWalletFilters = () => {
    setCurrentPage(1);
  };

  const handleVoidPartnerPayout = (partner: UserModel) => {
    openConfirmDialog(
      `Are you sure you want to void this payout for ${partner.user_id ?? partner.name ?? "this partner"}?`,
      "Void",
      "Cancel",
      async () => {
        fetchRef.current = false;
        await fetchData({});
      }
    );
  };

  const filterControls = (
    <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mt-2 mb-3 align-items-end">
      <Col>
        <CustomFormSelect
          label="Wallet Status"
          controlId="wallet_status_filter"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...WALLET_STATUS_OPTIONS]}
          fieldName="wallet_status_filter"
          defaultValue={walletStatus}
          setValue={setHeaderValue as (name: string, value: any, options?: { shouldValidate?: boolean }) => void}
          asCol={false}
          noBottomMargin
          onChange={(e) => {
            setWalletStatus(e.target.value);
            listRef.current.walletStatus = e.target.value;
            bumpWalletFilters();
          }}
        />
      </Col>

      <Col>
        <CustomDatePicker
          label="From Date"
          controlId="from_date_filter"
          selectedDate={fromDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            setFromDate(value);
            listRef.current.fromDate = value;
            bumpWalletFilters();
          }}
          register={headerRegister as unknown as UseFormRegister<any>}
          setValue={setHeaderValue as (name: string, value: any) => void}
          asCol={false}
          groupClassName="mb-0 w-100 fw-medium"
          placeholderText="From Date"
          filterDate={() => true}
        />
      </Col>

      <Col>
        <CustomDatePicker
          label="To Date"
          controlId="to_date_filter"
          selectedDate={toDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            setToDate(value);
            listRef.current.toDate = value;
            bumpWalletFilters();
          }}
          register={headerRegister as unknown as UseFormRegister<any>}
          setValue={setHeaderValue as (name: string, value: any) => void}
          asCol={false}
          groupClassName="mb-0 w-100 fw-medium"
          placeholderText="To Date"
          filterDate={() => true}
        />
      </Col>

      <Col xs="auto" className="d-flex align-items-end">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary partner-payout-clear-btn px-3"
          type="button"
          disabled={walletStatus === "all" && !fromDate && !toDate && !keywordActive}
          onClick={() => {
            setWalletStatus("all");
            setFromDate("");
            setToDate("");
            setKeywordActive(false);
            keywordRef.current = "";
            listRef.current = { walletStatus: "all", fromDate: "", toDate: "" };
            setSortBy([]);
            setUtilitySearchKey((k) => k + 1);
            setCurrentPage(1);
            fetchRef.current = false;
            void fetchData({});
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
  );

  const partnerColumns = React.useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: { index: number } }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Partner ID",
        accessor: "user_id",
        sort: true,
        Cell: textUnderlineCell("user_id", (row) => {
          PartnerDetailsDialog.show(row._id, () => {});
        }),
      },
      { Header: "Partner Name", accessor: "name", sort: true },
      {
        Header: "Total wallet amount",
        accessor: "total_wallet_amount",
        Cell: ({ row }: { row: { original: UserModel } }) => {
          const v = row.original.total_wallet_amount ?? row.original.total_amount;
          return <span>{v !== undefined && v !== null ? `${AppConstant.currencySymbol}${v}` : "-"}</span>;
        },
      },
      {
        Header: "Last withdraw amount",
        accessor: "last_withdraw_amount",
        Cell: priceCell("last_withdraw_amount"),
      },
      {
        Header: "Last withdraw date",
        accessor: "last_withdraw_date",
        Cell: ({ row }: { row: { original: UserModel } }) => {
          const raw = row.original.last_withdraw_date || row.original.last_paid_date || "";
          return formatDate(raw);
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: { original: UserModel } }) => (
          <CustomActionColumn
            row={row}
            onView={() => navigate(`${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${row.original._id}`)}
            onDelete={() => handleVoidPartnerPayout(row.original)}
          />
        ),
      },
    ],
    [currentPage, pageSize, navigate]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Financial — Partner Payout"
        titlePrefix={<FinancialSubPageBackButton />}
        register={headerRegister as unknown as UseFormRegister<any>}
        setValue={setHeaderValue as (name: string, value: any) => void}
        rightActions={
          <Button
            type="button"
            className="custom-btn-secondary w-auto btn btn-primary"
            onClick={() =>
              AddPayoutDialog.show(() => {
                void fetchData({});
              })
            }
          >
            Add New Payout
          </Button>
        }
      />

      <CustomUtilityBox
        key={utilitySearchKey}
        searchOnlyToolbar
        title="Partner Payout"
        searchHint="Search partner name or ID…"
        onSearch={(value) => {
          setKeywordActive(!!value.trim());
          keywordRef.current = value;
          void handleFilterChange({ keyword: value });
        }}
      />

      {filterControls}

      <CustomTable
        columns={partnerColumns}
        data={partnerList}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page: number) => setCurrentPage(page)}
        onLimitChange={(ps: number) => {
          setPageSize(ps);
          setCurrentPage(1);
        }}
        manualSortBy
        sortBy={sortBy}
        onSortChange={handleServerSortChange}
        theadClass="table-light"
      />
    </div>
  );
};

export default PartnerPayout;