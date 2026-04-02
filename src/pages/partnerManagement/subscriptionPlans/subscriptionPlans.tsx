import React, { useEffect, useMemo, useState } from "react";
import CustomHeader from "../../../components/CustomHeader";
import CustomSummaryBox from "../../../components/CustomSummaryBox";
import CustomUtilityBox from "../../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../../helper/utility";
import CustomTable from "../../../components/CustomTable";
import AddEditSubscriptionPlanDialog, {
  SubscriptionPlanModel,
} from "../subscriptionPlans/AddEditSubscriptionPlanDialog";
import AddEditPartnerSubscriptionDialog, {
  PartnerSubscriptionModel,
} from "../subscriptionPlans/AddEditPartnerSubscriptionDialog";

const SubscriptionPlans = () => {
  const [selectedBox, setSelectedBox] = useState<"plans" | "partner_subscription_list">("plans");

  const [planData] = useState({
    Total: 4,
    Active: 3,
    Inactive: 1,
  });

  const [partnerSubscriptionData] = useState({
    Total: 4,
    Active: 3,
    Inactive: 1,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [planList] = useState<SubscriptionPlanModel[]>([
    {
      _id: "PLN001",
      plan_name: "basic",
      plan_description: "Basic subscription plan for starter users",
      price: "499",
      duration: "30",
      duration_type: "days",
      is_active: true,
    },
    {
      _id: "PLN002",
      plan_name: "silver",
      plan_description: "Silver subscription plan for regular users",
      price: "999",
      duration: "3",
      duration_type: "months",
      is_active: true,
    },
    {
      _id: "PLN003",
      plan_name: "gold",
      plan_description: "Gold subscription plan with premium benefits",
      price: "1999",
      duration: "6",
      duration_type: "months",
      is_active: false,
    },
    {
      _id: "PLN004",
      plan_name: "platinum",
      plan_description: "Platinum subscription plan for enterprise users",
      price: "4999",
      duration: "12",
      duration_type: "months",
      is_active: true,
    },
  ]);

  const [partnerSubscriptionList] = useState<PartnerSubscriptionModel[]>([
    {
      _id: "1",
      partner_id: "P001",
      partner_name: "Rahul",
      subscription_plan: "basic",
      subscription_start_date: "2026-03-01",
      subscription_end_date: "2026-03-31",
      rating: "4.2",
      location: "Hyderabad",
      is_active: true,
    },
    {
      _id: "2",
      partner_id: "P002",
      partner_name: "Kiran",
      subscription_plan: "silver",
      subscription_start_date: "2026-03-05",
      subscription_end_date: "2026-06-05",
      rating: "4.6",
      location: "Vijayawada",
      is_active: true,
    },
    {
      _id: "3",
      partner_id: "P003",
      partner_name: "Suresh",
      subscription_plan: "gold",
      subscription_start_date: "2026-02-01",
      subscription_end_date: "2026-08-01",
      rating: "4.0",
      location: "Visakhapatnam",
      is_active: false,
    },
    {
      _id: "4",
      partner_id: "P004",
      partner_name: "Teja",
      subscription_plan: "platinum",
      subscription_start_date: "2026-01-01",
      subscription_end_date: "2027-01-01",
      rating: "4.9",
      location: "Warangal",
      is_active: true,
    },
  ]);

  const [filteredPlanList, setFilteredPlanList] = useState<SubscriptionPlanModel[]>(planList);
  const [filteredPartnerSubscriptionList, setFilteredPartnerSubscriptionList] =
    useState<PartnerSubscriptionModel[]>(partnerSubscriptionList);

  useEffect(() => {
    setFilteredPlanList(planList);
  }, [planList]);

  useEffect(() => {
    setFilteredPartnerSubscriptionList(partnerSubscriptionList);
  }, [partnerSubscriptionList]);

  const refreshData = () => {
    setFilteredPlanList(planList);
    setFilteredPartnerSubscriptionList(partnerSubscriptionList);
  };

  const handlePlanFilterChange = (filters: {
    name?: string;
    status?: string;
    sort?: string;
  }) => {
    setCurrentPage(1);

    let data = [...planList];

    if (filters.status === "true") {
      data = data.filter((item) => item.is_active === true);
    } else if (filters.status === "false") {
      data = data.filter((item) => item.is_active === false);
    }

    if (filters.name) {
      const search = filters.name.toLowerCase();
      data = data.filter(
        (item) =>
          (item._id || "").toLowerCase().includes(search) ||
          (item.plan_name || "").toLowerCase().includes(search) ||
          (item.plan_description || "").toLowerCase().includes(search) ||
          (item.price || "").toLowerCase().includes(search) ||
          (item.duration || "").toLowerCase().includes(search) ||
          (item.duration_type || "").toLowerCase().includes(search)
      );
    }

    if (filters.sort === "asc") {
      data.sort((a, b) => (a.plan_name || "").localeCompare(b.plan_name || ""));
    } else if (filters.sort === "desc") {
      data.sort((a, b) => (b.plan_name || "").localeCompare(a.plan_name || ""));
    }

    setFilteredPlanList(data);
  };

  const handlePartnerSubscriptionFilterChange = (filters: {
    name?: string;
    status?: string;
    sort?: string;
  }) => {
    setCurrentPage(1);

    let data = [...partnerSubscriptionList];

    if (filters.status === "true") {
      data = data.filter((item) => item.is_active === true);
    } else if (filters.status === "false") {
      data = data.filter((item) => item.is_active === false);
    }

    if (filters.name) {
      const search = filters.name.toLowerCase();
      data = data.filter(
        (item) =>
          (item.partner_name || "").toLowerCase().includes(search) ||
          (item.partner_id || "").toLowerCase().includes(search) ||
          (item.subscription_plan || "").toLowerCase().includes(search) ||
          (item.location || "").toLowerCase().includes(search)
      );
    }

    if (filters.sort === "asc") {
      data.sort((a, b) => (a.partner_name || "").localeCompare(b.partner_name || ""));
    } else if (filters.sort === "desc") {
      data.sort((a, b) => (b.partner_name || "").localeCompare(a.partner_name || ""));
    }

    setFilteredPartnerSubscriptionList(data);
  };

  const planColumns = useMemo(
    () => [
      {
        Header: "SR No",
        accessor: "serial_no",
        Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
      },
      {
        Header: "Plan ID",
        accessor: "_id",
        Cell: ({ row }: { row: any }) => (
          <span
            className="fw-semibold text-dark text-decoration-underline cursor-pointer"
            role="button"
            onClick={() => {
              AddEditSubscriptionPlanDialog.show(false, row.original, () => refreshData());
            }}
          >
            {row.original._id}
          </span>
        ),
      },
      {
        Header: "Plan Name",
        accessor: "plan_name",
        Cell: ({ row }: { row: any }) => capitalizeString(row.original.plan_name),
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
      {
        Header: "Partner ID",
        accessor: "partner_id",
        Cell: ({ row }: { row: any }) => (
          <span
            className="fw-semibold text-dark text-decoration-underline cursor-pointer"
            role="button"
            onClick={() => {
              AddEditPartnerSubscriptionDialog.show(false, row.original, () => refreshData());
            }}
          >
            {row.original.partner_id}
          </span>
        ),
      },
      { Header: "Partner Name", accessor: "partner_name" },
      {
        Header: "Subscription Plan",
        accessor: "subscription_plan",
        Cell: ({ row }: { row: any }) => capitalizeString(row.original.subscription_plan),
      },
      { Header: "Subscription Start Date", accessor: "subscription_start_date" },
      { Header: "Subscription End Date", accessor: "subscription_end_date" },
      { Header: "Rating", accessor: "rating" },
      { Header: "Location", accessor: "location" },
      {
        Header: "Subscription Status",
        accessor: "is_active",
        Cell: statusCell("is_active"),
      },
    ],
    [currentPage, pageSize]
  );

  return (
    <div className="main-page-content">
      <CustomHeader title="Subscription Plans" />

      <div className="box-container d-flex gap-3 flex-wrap">
        <CustomSummaryBox
          divId="box-subscription-plan"
          title={capitalizeString("plans")}
          data={planData}
          onSelect={() => {
            setSelectedBox("plans");
            handlePlanFilterChange({});
          }}
          isSelected={selectedBox === "plans"}
          onFilterChange={(filter) => {
            setSelectedBox("plans");
            handlePlanFilterChange(filter);
          }}
          isAddShow={true}
          addButtonLable="Add Plan"
          onAddClick={() => {
            AddEditSubscriptionPlanDialog.show(true, null, () => refreshData());
          }}
        />

        <CustomSummaryBox
          divId="box-partner-subscription-list"
          title={capitalizeString("partner subscription list")}
          data={partnerSubscriptionData}
          onSelect={() => {
            setSelectedBox("partner_subscription_list");
            handlePartnerSubscriptionFilterChange({});
          }}
          isSelected={selectedBox === "partner_subscription_list"}
          onFilterChange={(filter) => {
            setSelectedBox("partner_subscription_list");
            handlePartnerSubscriptionFilterChange(filter);
          }}
          isAddShow={true}
          addButtonLable="Add"
          onAddClick={() => {
            AddEditPartnerSubscriptionDialog.show(true, null, () => refreshData());
          }}
        />
      </div>

      <CustomUtilityBox
        title={selectedBox === "plans" ? "Subscription Plans" : "Partner Subscription List"}
        searchHint={
          selectedBox === "plans" ? "Search Plan Name / Plan ID" : "Search Partner Name / Partner ID"
        }
        onDownloadClick={async () => {
          console.log("Download clicked");
        }}
        onSortClick={(value: "1" | "-1") => {
          const sortValue = value === "1" ? "asc" : "desc";
          if (selectedBox === "plans") {
            handlePlanFilterChange({ sort: sortValue });
          } else {
            handlePartnerSubscriptionFilterChange({ sort: sortValue });
          }
        }}
        onMoreClick={() => {}}
        onSearch={(value: string) => {
          if (selectedBox === "plans") {
            handlePlanFilterChange({ name: value });
          } else {
            handlePartnerSubscriptionFilterChange({ name: value });
          }
        }}
      />

      {selectedBox === "plans" ? (
        <CustomTable
          columns={planColumns}
          data={filteredPlanList}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={1}
          onPageChange={(page: number) => setCurrentPage(page)}
          onLimitChange={(limit: number) => {
            setCurrentPage(1);
            setPageSize(limit);
          }}
          theadClass="table-light"
        />
      ) : (
        <CustomTable
          columns={partnerSubscriptionColumns}
          data={filteredPartnerSubscriptionList}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={1}
          onPageChange={(page: number) => setCurrentPage(page)}
          onLimitChange={(limit: number) => {
            setCurrentPage(1);
            setPageSize(limit);
          }}
          theadClass="table-light"
        />
      )}
    </div>
  );
};

export default SubscriptionPlans;