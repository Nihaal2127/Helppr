import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditStateDialog from "./AddEditStateDialog";
import AddEditCityDialog from "./AddEditCityDialog";
import { StateModel } from "../../models/StateModel";
import { fetchState, deleteState } from "../../services/stateService";
import { deleteCity, fetchCity } from "../../services/cityService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { CityModel } from "../../models/CityModel";
import { getCount } from "../../services/getCountService";

const LocationManagement = () => {
    const { register } = useForm();
    const [selectedBox, setSelectedBox] = useState<string>("box-state");
    const [stateData, setStateData] = useState<{}>({});
    const [cityData, setCityData] = useState<{}>({});
    const [stateList, setStateList] = useState<StateModel[]>([]);
    const [cityList, setCityList] = useState<CityModel[]>([]);
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
        const { responseCount, countModel } = await getCount(1);
        if (responseCount && countModel) {
            setStateData({ Total: countModel.total_state, Active: countModel.active_state, Inactive: countModel.inactive_state });
            setCityData({ Total: countModel.total_city, Active: countModel.active_city, Inactive: countModel.inactive_city });
        }
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
    }, [selectedBox, pageSize, currentPage]);

    const refreshData = async (selected: string) => {
        await fetchData(selected, {});
    };

    const handleFilterChange = async (filters: {
        name?: string;
        status?: string
    }) => {
        setCurrentPage(1);
        setTotalPages(0);
        if (Object.keys(filters).length === 0) {
            fetchRef.current = false;
        } else {
            await fetchData(selectedBox, filters);
        }
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
            Cell: statusCell("is_active"),
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
        { Header: "State Name", accessor: "state_name" },
        { Header: "City Name", accessor: "name" },
        { Header: "City Service Price", accessor: "city_service_price" },

        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
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
                            data={id === "box-state" ? stateData : cityData}
                            onSelect={(divId) => {
                                setSelectedBox(divId);
                                handleFilterChange({});
                            }}
                            isSelected={selectedBox === id}
                            onFilterChange={(filter) => {
                                handleFilterChange(filter);
                            }}
                            isAddShow={true}
                            addButtonLable={capitalizeString(id.replace("box-", "Add ").replace("-", " "))}
                            onAddClick={() => {
                                id === "box-state"
                            ? AddEditStateDialog.show(false, null, () => refreshData(selectedBox))
                            : AddEditCityDialog.show(false, null, () => refreshData(selectedBox));
                            }}
                        />
                    ))}
                </div>

                <CustomUtilityBox
                    title={
                        selectedBox === "box-state" ? "States" : "Cities"
                    }
                    searchHint={`Search ${selectedBox === "box-state" ? "State" : "City"} Name`}
                    onDownloadClick={() => { }}
                    onSortClick={() => { }}
                    onMoreClick={() => { }}
                    onSearch={(value) => handleFilterChange({ name: value })}
                    register={register}
                />

                <CustomTable
                    columns={selectedBox === "box-state" ? stateColumns : cityColumns}
                    data={selectedBox === "box-state" ? stateList : cityList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    theadClass="table-light"
                />

            </div>
        </>
    );
}

export default LocationManagement;