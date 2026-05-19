import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Col, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import { FinancialSubPageBackButton } from "../../../components/FinancialSubPageNav";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import CustomTable from "../../../components/CustomTable";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { fetchUser } from "../../../services/userService";
import { UserModel } from "../../../lib/models/UserModel";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { ROUTES } from "../../../routes/Routes";
import { AppConstant } from "../../../lib/global/AppConstant";
import { franchiseHeaderFormDefaults } from "../../../lib/franchise/headerFranchisePreference";
import { FRANCHISE_HEADER_ALL } from "../../../lib/global/hooks/useFranchiseScopedGetCount";
import {
  formatDate,
  priceCell,
  textUnderlineCell,
} from "../../../helper/utility";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
import { PartnerDetailsDialog } from "../../../components/partner";
import AddPayoutDialog from "./AddPayoutDialog";
import type { ServerTableSortBy } from "../../../lib/global/serverTableSort";
import {
  patchPartnerPayoutSearchParams,
  readPartnerPayoutListUrl,
  sortToUrl,
} from "../../../lib/financial/partnerPayoutUrl";

const WALLET_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
] as const;

const PartnerPayout = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { register: headerRegister, setValue: setHeaderValue, watch } =
    useForm<{ franchise_id: string }>({
      defaultValues: franchiseHeaderFormDefaults(),
    });

  const url = useMemo(
    () => readPartnerPayoutListUrl(searchParams),
    [searchParams]
  );

  const patchUrl = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      setSearchParams(
        (prev) => patchPartnerPayoutSearchParams(prev, updates),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const headerFranchiseId = String(watch("franchise_id") ?? FRANCHISE_HEADER_ALL);

  useEffect(() => {
    const fid = url.franchiseId;
    if (fid && fid !== headerFranchiseId) {
      setHeaderValue("franchise_id", fid, { shouldValidate: false });
    }
  }, [url.franchiseId, headerFranchiseId, setHeaderValue]);

  useEffect(() => {
    const next =
      headerFranchiseId && headerFranchiseId !== FRANCHISE_HEADER_ALL
        ? headerFranchiseId
        : undefined;
    const cur = url.franchiseId || undefined;
    if (next !== cur) {
      patchUrl({ franchise_id: next, page: 1 });
    }
  }, [headerFranchiseId, url.franchiseId, patchUrl]);

  const [partnerList, setPartnerList] = React.useState<UserModel[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const fetchRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    const fid =
      url.franchiseId && url.franchiseId !== FRANCHISE_HEADER_ALL
        ? url.franchiseId
        : undefined;
    const {
      response,
      users,
      totalPages: tp,
    } = await fetchUser(
      false,
      2,
      url.page,
      url.limit,
      {
        search: url.search,
        keyword: url.search,
        status: "true",
        wallet_status: url.walletStatus,
        ...(url.fromDate ? { from_date: url.fromDate } : {}),
        ...(url.toDate ? { to_date: url.toDate } : {}),
        ...(fid ? { franchise_id: fid } : {}),
      },
      url.sortBy
    );
    if (response) {
      setPartnerList(users);
      setTotalPages(tp);
    }
    fetchRef.current = false;
  }, [url]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleServerSortChange = useCallback(
    (next: ServerTableSortBy) => {
      patchUrl({ ...sortToUrl(next), page: 1 });
    },
    [patchUrl]
  );

  const filtersActive =
    url.walletStatus !== "all" ||
    !!url.fromDate ||
    !!url.toDate ||
    !!url.search;

  const handleVoidPartnerPayout = useCallback(
    (partner: UserModel) => {
      openConfirmDialog(
        `Are you sure you want to void this payout for ${
          partner.user_id ?? partner.name ?? "this partner"
        }?`,
        "Void",
        "Cancel",
        async () => {
          fetchRef.current = false;
          await fetchData();
        }
      );
    },
    [fetchData]
  );

  const filterControls = (
    <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mb-3 align-items-end">
      <Col>
        <CustomFormSelect
          label="Wallet Status"
          controlId="wallet_status_filter"
          register={headerRegister as unknown as UseFormRegister<any>}
          options={[...WALLET_STATUS_OPTIONS]}
          fieldName="wallet_status_filter"
          defaultValue={url.walletStatus}
          setValue={
            setHeaderValue as (
              name: string,
              value: any,
              options?: { shouldValidate?: boolean }
            ) => void
          }
          asCol={false}
          noBottomMargin
          onChange={(e) => {
            patchUrl({ wallet_status: e.target.value, page: 1 });
          }}
        />
      </Col>

      <Col>
        <CustomDatePicker
          label="From Date"
          controlId="from_date_filter"
          selectedDate={url.fromDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            patchUrl({ from_date: value || undefined, page: 1 });
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
          selectedDate={url.toDate || null}
          onChange={(date) => {
            const value = date ? date.toISOString().slice(0, 10) : "";
            patchUrl({ to_date: value || undefined, page: 1 });
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
          disabled={!filtersActive}
          onClick={() => {
            patchUrl({
              search: undefined,
              wallet_status: undefined,
              from_date: undefined,
              to_date: undefined,
              sort_by: undefined,
              sort_order: undefined,
              page: 1,
            });
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
        Cell: ({ row }: { row: { index: number } }) =>
          (url.page - 1) * url.limit + row.index + 1,
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
          const v =
            row.original.total_wallet_amount ?? row.original.total_amount;
          return (
            <span>
              {v !== undefined && v !== null
                ? `${AppConstant.currencySymbol}${v}`
                : "-"}
            </span>
          );
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
          const raw =
            row.original.last_withdraw_date ||
            row.original.last_paid_date ||
            "";
          return formatDate(raw);
        },
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: { original: UserModel } }) => (
          <CustomActionColumn
            row={row}
            onView={(r) =>
              navigate(
                `${ROUTES.PARTNER_PAYOUT_SHOW.path}?id=${encodeURIComponent(
                  r.original._id
                )}`
              )
            }
            onDelete={() => handleVoidPartnerPayout(row.original)}
          />
        ),
      },
    ],
    [url.page, url.limit, navigate, handleVoidPartnerPayout]
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
                fetchRef.current = false;
                void fetchData();
              })
            }
          >
            Add New Payout
          </Button>
        }
      />

      <CustomUtilityBox
        key={`${url.search}-${url.walletStatus}-${url.fromDate}-${url.toDate}`}
        searchOnlyToolbar
        title="Partner Payout"
        searchHint="Search partner name or ID…"
        onSearch={(value) => {
          patchUrl({ search: value.trim() || undefined, page: 1 });
        }}
        syncKeyword={url.search}
      />

      {filterControls}

      <CustomTable
        columns={partnerColumns}
        data={partnerList}
        pageSize={url.limit}
        currentPage={url.page}
        totalPages={totalPages}
        onPageChange={(page: number) => patchUrl({ page })}
        onLimitChange={(ps: number) => {
          patchUrl({ limit: ps, page: 1 });
        }}
        manualSortBy
        sortBy={url.sortBy}
        onSortChange={handleServerSortChange}
        theadClass="table-light"
      />
    </div>
  );
};

export default PartnerPayout;
