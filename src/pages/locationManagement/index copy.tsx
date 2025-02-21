import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString } from "../../helper/utility";
import Table from "../../components/CustomTable";
import AddEditStateDialog from "./AddEditStateDialog";
import AddEditCityDialog from "./AddEditCityDialog";
import { StateModel } from "../../models/StateModel";
import { fetchState, deleteState } from "../../services/stateService";
import { deleteCity, fetchCity } from "../../services/cityService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";

const LocationManagement = () => {
    //const data = { Total: 100, Active: 50, Inactive: 50 };
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-state");
    const [stateList, setStateList] = useState<StateModel[]>([]);
    const [cityList, setCityList] = useState<StateModel[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);

    const fetchData = useCallback(async (selected: string, filters: {
        name?: string;
        status?: string
    }) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        console.log("Filter is:",filters)
        if (selected === "box-state") {
            const { response, states, totalPages } = await fetchState(currentPage, pageSize, { ...filters, });
            if (response) {
                setStateList(states);
                setTotalPages(totalPages);
            }
        } else if (selected === "box-city") {
            const { response, cities, totalPages } = await fetchCity(currentPage, pageSize, { ...filters, });
            if (response) {
                setCityList(cities);
                setTotalPages(totalPages);
            }
        }
        fetchRef.current = false;
    }, [currentPage, pageSize]);

    useEffect(() => {
        refreshData(selectedBox);
    }, [selectedBox]);

    const refreshData = async (selected: string) => {
        console.log("refreshData selected:", selected)
        fetchData(selected, {});
    };

    const handleFilterChange = async (filters: {
        name?: string;
        status?: string
    }) => {
        setCurrentPage(1);
        fetchData(selectedBox, filters);
    };

    const stateColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Name", accessor: "name" },
        {
            Header: "Status", accessor: "is_active",
            Cell: ({ value }: { value: boolean }) => (
                <span
                    className={`custom-${value ? "active" : "inactive"}`}
                >
                    {value ? "Active" : "Inactive"}
                </span>
            ),
            
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onEdit={
                        () => {
                            AddEditStateDialog.show(true, row.original, () => refreshData("box-state"))
                        }
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to delete? ",
                            "Delete",
                            "Cancle",
                            async () => {
                                let response = await deleteState(row.original._id);
                                if (response) {
                                    refreshData("box-state");
                                }
                            });
                    }}
                />
            ),
        },
    ], [currentPage, pageSize]);

    const cityColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no",
            Cell: ({ row }: { row: any }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        { Header: "Name", accessor: "name" },
        {
            Header: "Status", accessor: "is_active",
            Cell: ({ value }: { value: boolean }) => (
                <span
                    className={`custom-${value ? "active" : "inactive"}`}
                >
                    {value ? "Active" : "Inactive"}
                </span>
            ),
            
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                <CustomActionColumn
                    row={row}
                    onEdit={
                        () => {
                            AddEditCityDialog.show(true, row.original, () => refreshData("box-city"))
                        }
                    }
                    onDelete={async () => {
                        openConfirmDialog(
                            "Are you sure you want to delete? ",
                            "Delete",
                            "Cancle",
                            async () => {
                                let response = await deleteCity(row.original._id);
                                if (response) {
                                    refreshData("box-city");
                                }
                            });
                    }}
                />
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                <CustomHeader
                    title="Location Management"
                />

                <div className="box-container">
                    {["box-state", "box-city"].map((id) => (
                        <CustomSummaryBox
                            key={id}
                            divId={id}
                            title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                            data={{}}
                            onSelect={(divId) => {
                                setSelectedBox(divId);
                                refreshData(divId);
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                handleFilterChange(filter);
                            }}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    addButtonLable={
                        selectedBox === "box-state" ? "Add State" : "Add City"
                    }
                    searchHint={`Search ${selectedBox === "box-state" ? "State" : "City"} Name`}
                    onAddClick={() => {
                        selectedBox === "box-state"
                            ? AddEditStateDialog.show(false, null, () => refreshData(selectedBox))
                            : AddEditCityDialog.show(false, null, () => refreshData(selectedBox));
                    }}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ name: value })}
                    register={register}
                />

                {/* <CustomTable
                    data={dataList}
                    currentPageState={currentPageState}
                    totalPagesState={totalPagesState}
                    pageSizeState={pageSizeState}
                    onPageChange={(page: number) => setCurrentPageState(page)}
                    onLimitChange={(pageSizeState: number) => {
                        setPageSizeState(pageSizeState);
                        setCurrentPageState(1);
                    }}
                    onEdit={(row) => console.log("Edit", row)}
                    onDelete={(row) => console.log("Delete", row)}
                /> */}

                <Table
                    columns={selectedBox === "box-state" ? stateColumns : cityColumns}
                    data={selectedBox === "box-state" ? stateList : cityList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSizeState: number) => {
                        setPageSize(pageSizeState);
                        setCurrentPage(1);
                    }}
                    theadClass="table-light"
                />

            </div>
        </>
    );
}

export default LocationManagement;