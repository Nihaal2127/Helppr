import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import CustomFormSelect from "../../../components/CustomFormSelect";
import CustomDatePicker from "../../../components/CustomDatePicker";
import AddEditSubscriptionPlanDialog, {
  SubscriptionPlanModel,
} from "../subscriptionPlans/AddEditSubscriptionPlanDialog";
import AddEditPartnerSubscriptionDialog, {
  PartnerSubscriptionModel,
} from "../subscriptionPlans/AddEditPartnerSubscriptionDialog";
import CustomActionColumn from "../../../components/CustomActionColumn";
import { openConfirmDialog } from "../../../components/CustomConfirmDialog";
import {
  fetchPartnerSubscriptions,
  fetchSubscriptionPlans,
  voidPartnerSubscription,
  voidSubscriptionPlan,
} from "../../../services/partnerManagementService";
import { getLocalStorage } from "../../../helper/localStorageHelper";
import { AppConstant, UserRole } from "../../../constant/AppConstant";
import type { ServerTableSortBy } from "../../../helper/serverTableSort";

type SubscriptionPlansProps = {
  onBack?: () => void;
};

const SubscriptionPlans = ({ onBack }: SubscriptionPlansProps) => {
  const { register, setValue } = useForm<any>();
  const userRole = getLocalStorage(AppConstant.userRole);
  const canViewPlans =
    userRole !== UserRole.FRANCHISE_ADMIN && userRole !== UserRole.EMPLOYEE;
  const [selectedBox, setSelectedBox] = useState<"plans" | "partner_subscription_list">(
    canViewPlans ? "plans" : "partner_subscription_list"
  );
  const [utilitySearchKey, setUtilitySearchKey] = useState(0);

  const [planData, setPlanData] = useState({ Total: 0, Active: 0, Inactive: 0 });
  const [partnerSubscriptionData, setPartnerSubscriptionData] = useState({ Total: 0, Active: 0, Inactive: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [planRows, setPlanRows] = useState<SubscriptionPlanModel[]>([]);
  const [planTotalPages, setPlanTotalPages] = useState(0);
  const [partnerSubRows, setPartnerSubRows] = useState<PartnerSubscriptionModel[]>([]);
  const [partnerSubTotalPages, setPartnerSubTotalPages] = useState(0);
  const [planSortBy, setPlanSortBy] = useState<ServerTableSortBy>([]);
  const [partnerSubSortBy, setPartnerSubSortBy] = useState<ServerTableSortBy>([]);

  const [planFilters, setPlanFilters] = useState<{ name?: string; status?: string; sort?: string }>({});
  const [partnerFilters, setPartnerFilters] = useState<{
    name?: string;
    status?: string;
    sort?: string;
    planType?: string;
    location?: string;
    fromDate?: string;
    toDate?: string;
  }>({});

  const fetchRef = useRef(false);
  const activeBox = canViewPlans ? selectedBox : "partner_subscription_list";

  const fetchData = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    try {
      if (activeBox === "plans") {
        const res = await fetchSubscriptionPlans(currentPage, pageSize, planFilters, planSortBy);
        if (res.response) {
          setPlanRows(res.records);
          setPlanTotalPages(res.totalPages);
          setPlanData(res.stats);
        } else {
          setPlanRows([]);
          setPlanTotalPages(0);
          setPlanData({ Total: 0, Active: 0, Inactive: 0 });
        }
      } else {
        const res = await fetchPartnerSubscriptions(currentPage, pageSize, partnerFilters, partnerSubSortBy);
        if (res.response) {
          setPartnerSubRows(res.records);
          setPartnerSubTotalPages(res.totalPages);
          setPartnerSubscriptionData(res.stats);
        } else {
          setPartnerSubRows([]);
          setPartnerSubTotalPages(0);
          setPartnerSubscriptionData({ Total: 0, Active: 0, Inactive: 0 });
        }
      }
    } finally {
      fetchRef.current = false;
    }
  }, [activeBox, currentPage, pageSize, planFilters, partnerFilters, planSortBy, partnerSubSortBy]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refreshData = () => {
    void fetchData();
  };

  const handlePlanFilterChange = (filters: {
    name?: string;
    status?: string;
    sort?: string;
  }) => {
    setCurrentPage(1);
    setPlanFilters(filters);
  };
  const handlePlanSortChange = useCallback((next: { id: string; desc: boolean }[]) => {
    setPlanSortBy(next);
    setCurrentPage(1);
  }, []);

  const handlePartnerSubscriptionFilterChange = (filters: {
    name?: string;
    status?: string;
    sort?: string;
    planType?: string;
    location?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    setCurrentPage(1);
    setPartnerFilters((prev) => ({ ...prev, ...filters }));
  };
  const handlePartnerSubSortChange = useCallback((next: { id: string; desc: boolean }[]) => {
    setPartnerSubSortBy(next);
    setCurrentPage(1);
  }, []);

  const partnerFilterControls = (
    <Row className="order-payments-filters-row g-3 mt-1 mb-2 align-items-end">
      <Col xs="auto" className="order-payments-filter-col ">
        <CustomFormSelect
          label="Plan Type"
          controlId="partner_sub_plan_type_filter"
          options={[
            { value: "all", label: "All plan types" },
            { value: "basic", label: "Basic" },
            { value: "silver", label: "Silver" },
            { value: "gold", label: "Gold" },
            { value: "platinum", label: "Platinum" },
          ]}
          register={register}
          fieldName="partner_sub_plan_type_filter"
          asCol={false}
          noBottomMargin
          defaultValue={partnerFilters.planType || "all"}
          setValue={setValue}
          onChange={(e) => handlePartnerSubscriptionFilterChange({ planType: e.target.value })}
        />
      </Col>
      <Col xs="auto" className="order-payments-filter-col">
        <CustomFormSelect
          label="Status"
          controlId="partner_sub_status_filter"
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "expired", label: "Expired" },
          ]}
          register={register}
          fieldName="partner_sub_status_filter"
          asCol={false}
          noBottomMargin
          defaultValue={partnerFilters.status || "all"}
          setValue={setValue}
          onChange={(e) => handlePartnerSubscriptionFilterChange({ status: e.target.value })}
        />
      </Col>
    
      <Col xs="auto" className="order-payments-filter-col">
        <Button
          variant="outline-secondary"
          size="sm"
          className="custom-btn-secondary px-3"
          type="button"
          disabled={
            (partnerFilters.planType ?? "all") === "all" &&
            (partnerFilters.status ?? "all") === "all" &&
            (partnerFilters.location ?? "all") === "all" &&
            !partnerFilters.fromDate &&
            !partnerFilters.toDate &&
            !partnerFilters.name?.trim()
          }
          onClick={() => {
            setPartnerFilters({});
            setPartnerSubSortBy([]);
            setUtilitySearchKey((k) => k + 1);
            setCurrentPage(1);
            setValue("partner_sub_plan_type_filter", "all", { shouldValidate: false });
            setValue("partner_sub_status_filter", "all", { shouldValidate: false });
            setValue("partner_sub_location_filter", "all", { shouldValidate: false });
            setValue("partner_sub_start_date_filter", "", { shouldValidate: false });
            setValue("partner_sub_end_date_filter", "", { shouldValidate: false });
          }}
        >
          Clear
        </Button>
      </Col>
    </Row>
  );

  const planColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Plan Name",
        accessor: "plan_name",
        sort: true,
        Cell: ({ row }: { row: any }) => capitalizeString(row.original.plan_name),
      },
      {
        Header: "Priority",
        accessor: "priority",
        Cell: ({ row }: { row: any }) => row.original.priority ?? "-",
      },
      { Header: "Plan Description", accessor: "plan_description" },
      { Header: "Price", accessor: "price" },
      { Header: "Duration", accessor: "duration" },
      {
        Header: "Duration Type",
        accessor: "duration_type",
        Cell: ({ row }: { row: any }) => capitalizeString(row.original.duration_type),
      },
      {
        Header: "Status",
        accessor: "is_active",
        Cell: statusCell("is_active"),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={() => {
              AddEditSubscriptionPlanDialog.show(false, row.original, () => refreshData());
            }}
            onDelete={async () => {
              openConfirmDialog(
                "Are you sure you want to void this plan?",
                "Void",
                "Cancel",
                async () => {
                  await voidSubscriptionPlan(String(row.original._id));
                  refreshData();
                }
              );
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize]
  );

  const partnerSubscriptionColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      { Header: "Partner Name", accessor: "partner_name", sort: true },
      {
        Header: "Subscription Plan",
        accessor: "subscription_plan",
        sort: true,
        Cell: ({ row }: { row: any }) => capitalizeString(row.original.subscription_plan),
      },
      { Header: "Subscription Start Date", accessor: "subscription_start_date", sort: true },
      { Header: "Subscription End Date", accessor: "subscription_end_date", sort: true },
      {
        Header: "Subscription Status",
        accessor: "is_active",
        Cell: statusCell("is_active"),
      },
      {
        Header: "Action",
        accessor: "action",
        Cell: ({ row }: { row: any }) => (
          <CustomActionColumn
            row={row}
            onView={() => {
              AddEditPartnerSubscriptionDialog.show(false, row.original, () => refreshData());
            }}
            onDelete={async () => {
              openConfirmDialog(
                "Are you sure you want to void this partner subscription?",
                "Void",
                "Cancel",
                async () => {
                  await voidPartnerSubscription(String(row.original._id));
                  refreshData();
                }
              );
            }}
          />
        ),
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <div className="main-page-content">
      <CustomHeader
        title="Subscription Plans"
        register={register}
        setValue={setValue}
        titlePrefix={
          <button
            type="button"
            className="financial-subpage-back"
            onClick={() => onBack?.()}
            aria-label="Go to Partner Management"
          >
            <i className="bi bi-chevron-left text-danger"></i>
          </button>
        }
      />

      <div className="box-container d-flex gap-3 flex-wrap">
        {canViewPlans && (
          <CustomSummaryBox
            divId="box-subscription-plan"
            title={capitalizeString("plans")}
            data={planData}
            onSelect={() => {
              setSelectedBox("plans");
              handlePlanFilterChange({});
            setPlanSortBy([]);
            }}
            isSelected={activeBox === "plans"}
            onFilterChange={(filter) => {
              setSelectedBox("plans");
              handlePlanFilterChange(filter);
              setPlanSortBy([]);
            }}
            isAddShow={true}
            addButtonLable="Add Plan"
            onAddClick={() => {
              AddEditSubscriptionPlanDialog.show(true, null, () => refreshData());
            }}
          />
        )}

        <CustomSummaryBox
          divId="box-partner-subscription-list"
          title={capitalizeString("partner subscription list")}
          data={partnerSubscriptionData}
          onSelect={() => {
            setSelectedBox("partner_subscription_list");
            handlePartnerSubscriptionFilterChange({});
            setPartnerSubSortBy([]);
          }}
          isSelected={activeBox === "partner_subscription_list"}
          onFilterChange={(filter) => {
            setSelectedBox("partner_subscription_list");
            handlePartnerSubscriptionFilterChange(filter);
            setPartnerSubSortBy([]);
          }}
          isAddShow={true}
          addButtonLable="Add"
          onAddClick={() => {
            AddEditPartnerSubscriptionDialog.show(true, null, () => refreshData());
          }}
        />
      </div>

      <CustomUtilityBox
        key={activeBox === "partner_subscription_list" ? utilitySearchKey : undefined}
        searchOnlyToolbar={activeBox === "partner_subscription_list"}
        toolsInlineRow={activeBox === "partner_subscription_list"}
        controlSlot={
          activeBox === "partner_subscription_list" ? (
            <>
              <div style={{ minWidth: "220px" }}>
                <CustomDatePicker
                  label="From Date"
                  controlId="partner_sub_start_date_filter"
                  selectedDate={partnerFilters.fromDate || null}
                  onChange={(date) => {
                    const value = date ? date.toISOString().slice(0, 10) : "";
                    handlePartnerSubscriptionFilterChange({ fromDate: value });
                  }}
                  register={register as unknown as UseFormRegister<any>}
                  setValue={setValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100 fw-medium"
                  placeholderText="From Date"
                  filterDate={() => true}
                />
              </div>
              <div style={{ minWidth: "220px" }}>
                <CustomDatePicker
                  label="To Date"
                  controlId="partner_sub_end_date_filter"
                  selectedDate={partnerFilters.toDate || null}
                  onChange={(date) => {
                    const value = date ? date.toISOString().slice(0, 10) : "";
                    handlePartnerSubscriptionFilterChange({ toDate: value });
                  }}
                  register={register as unknown as UseFormRegister<any>}
                  setValue={setValue as (name: string, value: any) => void}
                  asCol={false}
                  groupClassName="mb-0 w-100 fw-medium"
                  placeholderText="To Date"
                  filterDate={() => true}
                />
              </div>
            </>
          ) : undefined
        }
        title={activeBox === "plans" ? "Subscription Plans" : "Partner Subscription List"}
        searchHint={
          activeBox === "plans" ? "Search Plan Name" : "Search Partner Name / Partner ID"
        }
        onDownloadClick={async () => {
          console.log("Download clicked");
        }}
        onSortClick={(value: "1" | "-1") => {
          if (activeBox === "plans") {
            handlePlanFilterChange({ sort: value });
          } else {
            handlePartnerSubscriptionFilterChange({ sort: value });
          }
        }}
        onMoreClick={() => {}}
        onSearch={(value: string) => {
          if (activeBox === "plans") {
            handlePlanFilterChange({ name: value });
          } else {
            handlePartnerSubscriptionFilterChange({ name: value });
          }
        }}
      />
      {activeBox === "partner_subscription_list" && partnerFilterControls}

      {activeBox === "plans" ? (
        <CustomTable
          columns={planColumns}
          data={planRows}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={planTotalPages}
          onPageChange={(page: number) => setCurrentPage(page)}
          onLimitChange={(limit: number) => {
            setCurrentPage(1);
            setPageSize(limit);
          }}
          manualSortBy
          sortBy={planSortBy}
          onSortChange={handlePlanSortChange}
          theadClass="table-light"
        />
      ) : (
        <CustomTable
          columns={partnerSubscriptionColumns}
          data={partnerSubRows}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={partnerSubTotalPages}
          onPageChange={(page: number) => setCurrentPage(page)}
          onLimitChange={(limit: number) => {
            setCurrentPage(1);
            setPageSize(limit);
          }}
          manualSortBy
          sortBy={partnerSubSortBy}
          onSortChange={handlePartnerSubSortChange}
          theadClass="table-light"
        />
      )}
    </div>
  );
};

export default SubscriptionPlans;