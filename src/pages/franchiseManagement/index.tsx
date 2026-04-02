import React, { useState } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditFranchiseDialog from "./AddEditFranchiseDialog";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { useForm } from "react-hook-form";

const FranchiseManagement = () => {
    const { register, setValue } = useForm<any>();
    const [franchiseData] = useState({
        Total: 3,
        Active: 2,
        Inactive: 1,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [franchiseList] = useState([
        {
            _id: "1",
            name: "Sunria Agro",
            state_name: "Andhra Pradesh",
            city_name: "Vijayawada",
            area_name: ["Benz Circle", "MG Road", "Gandhi Hill"],
            admin_name: "Ramesh",
            description: "Organic products franchise",
            contact: "+91 9876543210",
            is_active: true,
        },
        {
            _id: "2",
            name: "Green Valley",
            state_name: "Telangana",
            city_name: "Hyderabad",
            area_name: ["Madhapur", "Hitech City", "Kukatpally"],
            admin_name: "Suresh",
            description: "Grocery franchise outlet",
            contact: "+91 9876543211",
            is_active: false,
        },
        {
            _id: "3",
            name: "Organic Hub",
            state_name: "Andhra Pradesh",
            city_name: "Visakhapatnam",
            area_name: ["MVP Colony", "Maddillapalem", "Isukathota"],
            admin_name: "Mahesh",
            description: "Healthy food franchise",
            contact: "+91 9876543212",
            is_active: true,
        },
    ]);

    const [filteredList, setFilteredList] = useState(franchiseList);

    const areaNamesCell = ({ row }: { row: any }) => {
        const raw = row?.original?.area_name ?? row?.original?.areas ?? [];
        const areas: string[] = Array.isArray(raw)
            ? raw.map((a: any) => String(a).trim()).filter(Boolean)
            : typeof raw === "string"
                ? raw.split(",").map((a) => a.trim()).filter(Boolean)
                : [];

        if (areas.length === 0) return "-";
        if (areas.length === 1) return areas[0];

        return (
            <div className="pin-code-hover-wrapper">
                <span className="pin-code-hover-trigger">
                    {areas[0]}...
                    <span className="pin-code-more-count"> +{areas.length - 1}</span>
                </span>
                <div className="pin-code-hover-card">
                    {areas.map((a: string) => (
                        <div key={a} className="pin-code-hover-item">
                            {a}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const refreshData = () => {
        setFilteredList(franchiseList);
    };

    const handleFilterChange = (filters: {
        name?: string;
        status?: string;
        sort?: string;
    }) => {
        setCurrentPage(1);

        let data = [...franchiseList];

        if (filters.status === "true") {
            data = data.filter((item) => item.is_active === true);
        } else if (filters.status === "false") {
            data = data.filter((item) => item.is_active === false);
        }

        if (filters.name) {
            const search = filters.name.toLowerCase();
            data = data.filter((item) =>
                item.name.toLowerCase().includes(search) ||
                item.state_name.toLowerCase().includes(search) ||
                item.city_name.toLowerCase().includes(search) ||
                (Array.isArray((item as any).area_name)
                    ? (item as any).area_name.some((a: string) =>
                        String(a).toLowerCase().includes(search)
                    )
                    : String((item as any).area_name || "")
                        .toLowerCase()
                        .includes(search)) ||
                item.admin_name.toLowerCase().includes(search) ||
                item.description.toLowerCase().includes(search) ||
                item.contact.toLowerCase().includes(search)
            );
        }

        if (filters.sort === "asc") {
            data.sort((a, b) => a.name.localeCompare(b.name));
        } else if (filters.sort === "desc") {
            data.sort((a, b) => b.name.localeCompare(a.name));
        }

        setFilteredList(data);
    };

    const franchiseColumns = React.useMemo(
        () => [
            {
                Header: "SR No",
                accessor: "serial_no",
                Cell: ({ row }: { row: any }) =>
                    (currentPage - 1) * pageSize + row.index + 1,
            },
            { Header: "Franchise Name", accessor: "name" },
            { Header: "State Name", accessor: "state_name" },
            { Header: "City Name", accessor: "city_name" },
            {
                Header: "Area Name",
                accessor: "area_name",
                Cell: areaNamesCell,
            },
            { Header: "Admin Name", accessor: "admin_name" },
            { Header: "Description", accessor: "description" },
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
                            AddEditFranchiseDialog.show(true, row.original, () => refreshData(), true);
                        }}
                        onDelete={async () => {
                            openConfirmDialog(
                                "Are you sure you want to void this franchise?",
                                "Void",
                                "Cancel",
                                async () => {
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
        <>
            <div className="main-page-content">
                <CustomHeader title="Franchise Management" register={register} setValue={setValue} />

                <div className="box-container">
                    <CustomSummaryBox
                        divId="box-franchise"
                        title={capitalizeString("franchise")}
                        data={franchiseData}
                        onSelect={() => {
                            handleFilterChange({});
                        }}
                        isSelected={true}
                        onFilterChange={(filter) => {
                            handleFilterChange(filter);
                        }}
                        isAddShow={true}
                        addButtonLable="Add Franchise"
                        onAddClick={() => {
                            AddEditFranchiseDialog.show(false, null, () => refreshData());
                        }}
                    />
                </div>

                <CustomUtilityBox
                    title="Franchises"
                    searchHint="Search Franchise Name"
                    onDownloadClick={async () => {}}
                    onSortClick={(value) => {
                        handleFilterChange({ sort: value });
                    }}
                    onMoreClick={() => {}}
                    onSearch={(value) => handleFilterChange({ name: value })}
                />

                <CustomTable
                    columns={franchiseColumns}
                    data={filteredList}
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
            </div>
        </>
    );
};

export default FranchiseManagement;