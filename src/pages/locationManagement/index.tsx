import React, { useState, useEffect, useCallback, useRef } from "react";
import CustomHeader from "../../components/CustomHeader";
import CustomSummaryBox from "../../components/CustomSummaryBox";
import CustomUtilityBox from "../../components/CustomUtilityBox";
import { capitalizeString, statusCell } from "../../helper/utility";
import CustomTable from "../../components/CustomTable";
import AddEditStateDialog from "./AddEditStateDialog";
import AddEditCityDialog from "./AddEditCityDialog";
import { StateModel } from "../../models/StateModel";
import { fetchState, deleteState, fetchStateDropDown } from "../../services/stateService";
import { deleteCity, fetchCity, fetchCityDropDown } from "../../services/cityService";
import CustomActionColumn from "../../components/CustomActionColumn";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { CityModel } from "../../models/CityModel";
import { getCount } from "../../services/getCountService";
import { exportData } from "../../services/exportService";
import { ApiPaths } from "../../remote/apiPaths";
import { AreaModel } from "../../models/AreaModel";
import { fetchArea, deleteArea } from "../../services/areaService";
import AddEditAreaDialog from "./AddEditAreaDialog";
import CustomFormSelect from "../../components/CustomFormSelect";
import { useForm, UseFormRegister } from "react-hook-form";
import { fetchFranchiseDropDown } from "../../services/franchiseService";

type LocationFilters = {
    name?: string;
    status?: string;
    sort?: string;
    state_id?: string;
    city_id?: string;
    franchise_id?: string;
};

const LocationManagement = () => {
    const HeaderComponent: any = CustomHeader;
    const SummaryBoxComponent: any = CustomSummaryBox;
    const UtilityBoxComponent: any = CustomUtilityBox;
    const TableComponent: any = CustomTable;
    const FormSelectComponent: any = CustomFormSelect;
    const ActionColumnComponent: any = CustomActionColumn;

    const [selectedBox, setSelectedBox] = useState<string>("box-state");
    const [stateData, setStateData] = useState<{}>({});
    const [cityData, setCityData] = useState<{}>({});
    const [areaData, setAreaData] = useState<{}>({});
    const [stateList, setStateList] = useState<StateModel[]>([]);
    const [cityList, setCityList] = useState<CityModel[]>([]);
    const [areaList, setAreaList] = useState<AreaModel[]>([]);
    const [cityStateOptions, setCityStateOptions] = useState<{ value: string; label: string }[]>([]);
    const [selectedCityStateId, setSelectedCityStateId] = useState("");
    const [areaStateOptions, setAreaStateOptions] = useState<{ value: string; label: string }[]>([]);
    const [areaCityOptions, setAreaCityOptions] = useState<{ value: string; label: string; state_id?: string }[]>([]);
    const [areaFranchiseOptions, setAreaFranchiseOptions] = useState<{ value: string; label: string }[]>([]);
    const [selectedAreaStateId, setSelectedAreaStateId] = useState("");
    const [selectedAreaCityId, setSelectedAreaCityId] = useState("");
    const [selectedAreaFranchiseId, setSelectedAreaFranchiseId] = useState("");
    const [activeFilters, setActiveFilters] = useState<LocationFilters>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchRef = useRef(false);
    const { register: areaFilterRegister, setValue: setAreaFilterValue } = useForm<{
        area_state_id: string;
        area_city_id: string;
        area_franchise_id: string;
    }>({
        defaultValues: { area_state_id: "", area_city_id: "", area_franchise_id: "" },
    });
    const { register: cityFilterRegister, setValue: setCityFilterValue } = useForm<{
        city_state_id: string;
    }>({
        defaultValues: { city_state_id: "" },
    });
    const { register: headerRegister, setValue: setHeaderValue } = useForm<{ franchise_id: string }>({
        defaultValues: { franchise_id: "all" },
    });
    const getDummyAreaListFromApi = useCallback(async (): Promise<(AreaModel & { state_id: string; state_name: string; city_name: string; pincodes: string[] })[]> => {
        const stateOptions = await fetchStateDropDown();
        if (!stateOptions.length) return [];

        const normalize = (value?: string) => (value || "").trim().toLowerCase();
        const matches = (value: string, keys: string[]) => {
            const normalized = normalize(value);
            return keys.some((key) => normalized === key || normalized.includes(key));
        };

        const apState = stateOptions.find((state) => matches(state.label, ["andhra pradesh", "andhra", "ap"]));
        const telanganaState = stateOptions.find((state) => matches(state.label, ["telangana", "tg", "ts"]));
        const selectedStateIds = [apState?.value, telanganaState?.value].filter(Boolean) as string[];
        if (!selectedStateIds.length) return [];

        const cityOptions = await fetchCityDropDown(selectedStateIds);
        if (!cityOptions.length) return [];

        const findCity = (stateId: string | undefined, cityNames: string[]) => {
            if (!stateId) return undefined;
            const preferredCity = cityOptions.find(
                (city) => city.state_id === stateId && cityNames.some((name) => matches(city.label, [normalize(name)]))
            );
            return preferredCity || cityOptions.find((city) => city.state_id === stateId);
        };

        const apCityOne = findCity(apState?.value, ["Vijayawada"]);
        const apCityTwo = findCity(apState?.value, ["Visakhapatnam", "Vizag"]);
        const tsCityOne = findCity(telanganaState?.value, ["Hyderabad"]);
        const tsCityTwo = findCity(telanganaState?.value, ["Warangal", "Hanamkonda"]);

        const rows = [
            apCityOne && apState
                ? {
                    _id: `dummy-${apCityOne.value}-benzcircle`,
                    name: "Benz Circle",
                    state_id: apState.value,
                    city_id: apCityOne.value,
                    city_name: apCityOne.label,
                    state_name: apState.label,
                    pincodes: ["520010", "520008"],
                    is_active: true,
                    deleted_at: null,
                    created_at: null,
                    updated_at: null,
                }
                : null,
            apCityTwo && apState
                ? {
                    _id: `dummy-${apCityTwo.value}-mvpcolony`,
                    name: "MVP Colony",
                    state_id: apState.value,
                    city_id: apCityTwo.value,
                    city_name: apCityTwo.label,
                    state_name: apState.label,
                    pincodes: ["530017", "530013"],
                    is_active: true,
                    deleted_at: null,
                    created_at: null,
                    updated_at: null,
                }
                : null,
            tsCityOne && telanganaState
                ? {
                    _id: `dummy-${tsCityOne.value}-gachibowli`,
                    name: "Gachibowli",
                    state_id: telanganaState.value,
                    city_id: tsCityOne.value,
                    city_name: tsCityOne.label,
                    state_name: telanganaState.label,
                    pincodes: ["500032", "500081"],
                    is_active: true,
                    deleted_at: null,
                    created_at: null,
                    updated_at: null,
                }
                : null,
            tsCityTwo && telanganaState
                ? {
                    _id: `dummy-${tsCityTwo.value}-hanamkonda`,
                    name: "Hanamkonda",
                    state_id: telanganaState.value,
                    city_id: tsCityTwo.value,
                    city_name: tsCityTwo.label,
                    state_name: telanganaState.label,
                    pincodes: ["506001", "506009"],
                    is_active: false,
                    deleted_at: null,
                    created_at: null,
                    updated_at: null,
                }
                : null,
        ].filter(Boolean);

        return rows as (AreaModel & { state_id: string; state_name: string; city_name: string; pincodes: string[] })[];
    }, []);

    const sanitizeFilters = (filters: LocationFilters): LocationFilters =>
        Object.entries(filters).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                acc[key as keyof LocationFilters] = value as never;
            }
            return acc;
        }, {} as LocationFilters);

    const applyAreaFiltersToDummy = (
        list: (AreaModel & { state_id?: string; state_name?: string; city_name?: string; pincodes?: string[] })[],
        filters: LocationFilters
    ) => {
        return list.filter((item) => {
            const nameMatch = filters.name
                ? String(item.name || "").toLowerCase().includes(filters.name.toLowerCase())
                : true;
            const stateMatch = filters.state_id ? item.state_id === filters.state_id : true;
            const cityMatch = filters.city_id ? item.city_id === filters.city_id : true;
            const statusMatch =
                filters.status && filters.status !== "All"
                    ? String(item.is_active) === String(filters.status).toLowerCase()
                    : true;
            return nameMatch && stateMatch && cityMatch && statusMatch;
        });
    };

    const fetchData = useCallback(async (selected: string, filters: LocationFilters) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        const { responseCount, countModel } = await getCount(1);
        if (responseCount && countModel) {
            setStateData({ Total: countModel.total_state, Active: countModel.active_state, Inactive: countModel.inactive_state });
            setCityData({ Total: countModel.total_city, Active: countModel.active_city, Inactive: countModel.inactive_city });
            setAreaData({ Total: countModel.total_area, Active: countModel.active_area, Inactive: countModel.inactive_area });
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
        } else if (selected === "box-area") {
            const { response, areas, totalPages } = await fetchArea(currentPage, pageSize, filters);
            if (response && Array.isArray(areas) && areas.length > 0) {
                setAreaList(areas);
                setTotalPages(totalPages);
            } else {
                const dummyAreaList = await getDummyAreaListFromApi();
                const filteredDummyAreaList = applyAreaFiltersToDummy(dummyAreaList, filters);
                setAreaList(filteredDummyAreaList as AreaModel[]);
                setTotalPages(filteredDummyAreaList.length ? 1 : 0);
            }
        }
        fetchRef.current = false;
    }, [currentPage, pageSize, getDummyAreaListFromApi]);

    useEffect(() => {
        fetchData(selectedBox, activeFilters);
    }, [selectedBox, pageSize, currentPage, activeFilters, fetchData]);

    const refreshData = async (selected: string, filters: LocationFilters = activeFilters) => {
        await fetchData(selected, sanitizeFilters(filters));
    };

    const handleFilterChange = async (filters: LocationFilters, reset = false) => {
        const mergedFilters = reset ? {} : sanitizeFilters({ ...activeFilters, ...filters });
        setActiveFilters(mergedFilters);
        setCurrentPage(1);
        setTotalPages(0);
        if (reset) {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        const loadCityDropdowns = async () => {
            if (selectedBox !== "box-city") return;
            const states = await fetchStateDropDown();
            setCityStateOptions(states);
        };
        loadCityDropdowns();
    }, [selectedBox]);

    useEffect(() => {
        const loadAreaDropdowns = async () => {
            if (selectedBox !== "box-area") return;
            const states = await fetchStateDropDown();
            setAreaStateOptions(states);
            const franchises = await fetchFranchiseDropDown();
            setAreaFranchiseOptions(franchises);
            if (!selectedAreaStateId) {
                setAreaCityOptions([]);
                return;
            }
            const cities = await fetchCityDropDown([selectedAreaStateId]);
            setAreaCityOptions(cities);
        };
        loadAreaDropdowns();
    }, [selectedBox, selectedAreaStateId]);

    const handleAreaStateFilterChange = async (stateId: string) => {
        setSelectedAreaStateId(stateId);
        setSelectedAreaCityId("");
        if (!stateId) {
            setAreaCityOptions([]);
            await handleFilterChange({ state_id: "", city_id: "" });
            return;
        }
        const cities = await fetchCityDropDown([stateId]);
        setAreaCityOptions(cities);
        await handleFilterChange({ state_id: stateId, city_id: "" });
    };

    const handleAreaCityFilterChange = async (cityId: string) => {
        setSelectedAreaCityId(cityId);
        await handleFilterChange({ city_id: cityId });
    };

    const handleAreaFranchiseFilterChange = async (franchiseId: string) => {
        setSelectedAreaFranchiseId(franchiseId);
        await handleFilterChange({ franchise_id: franchiseId });
    };

    const handleCityStateFilterChange = async (stateId: string) => {
        setSelectedCityStateId(stateId);
        await handleFilterChange({ state_id: stateId });
    };

    const cityStateFilterOptions = [{ value: "", label: "All States" }, ...cityStateOptions];
    const stateFilterOptions = [{ value: "", label: "All States" }, ...areaStateOptions];
    const cityFilterOptions = [{ value: "", label: "All Cities" }, ...areaCityOptions];
    const franchiseFilterOptions = [{ value: "", label: "All Franchises" }, ...areaFranchiseOptions];

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
                ActionColumnComponent ? (
                    <ActionColumnComponent
                        row={row}
                        onView={() => {
                            AddEditStateDialog.show(true, row.original, () => refreshData("box-state"), true);
                        }}
                        onDelete={async () => {
                            openConfirmDialog(
                                "Are you sure you want to void this state? ",
                                "Void",   
                                "Cancel",
                                async () => {
                                    let response = await deleteState(row.original._id);
                                    if (response) {
                                        refreshData("box-state");
                                    }
                                });
                        }}
                    />
                ) : (
                    <span>-</span>
                )
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
        {
            Header: "Status", accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: { row: any }) => (
                ActionColumnComponent ? (
                    <ActionColumnComponent
                        row={row}
                        onView={() => {
                            AddEditCityDialog.show(true, row.original, () => refreshData("box-city"), true);
                        }}
                        onDelete={async () => {
                            openConfirmDialog(
                                "Are you sure you want to void this city? ",
                                "Void",
                                "Cancel",
                                async () => {
                                    let response = await deleteCity(row.original._id);
                                    if (response) {
                                        refreshData("box-city");
                                    }
                                });
                        }}
                    />
                ) : (
                    <span>-</span>
                )
            ),
        },
    ], [currentPage, pageSize]);

    const pinCodesCell = ({ row }: any) => {
        const rawPinCodes =
            row?.original?.pincodes ?? row?.original?.pincode ?? row?.original?.pin_codes ?? [];

        const pinCodes = Array.isArray(rawPinCodes)
            ? rawPinCodes
            : typeof rawPinCodes === "string"
              ? rawPinCodes.split(",")
              : [];

        const normalized = pinCodes.map((p: any) => String(p).trim()).filter(Boolean);

        if (normalized.length === 0) return "-";

        return (
            <div className="pin-code-hover-wrapper">
                <span className="pin-code-hover-trigger">
                    {normalized.length === 1 ? (
                        normalized[0]
                    ) : (
                        <>
                            {normalized[0]}...
                            <span className="pin-code-more-count"> +{normalized.length - 1}</span>
                        </>
                    )}
                </span>
                {normalized.length > 1 && (
                    <div className="pin-code-hover-card">
                        {normalized.map((p: string) => (
                            <div key={p} className="pin-code-hover-item">
                                {p}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const areaColumns = React.useMemo(() => [
        {
            Header: "SR No",
            accessor: "serial_no", 
            Cell: ({ row }: any) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            Header: "State",
            accessor: "state_name",
            Cell: ({ row }: any) => row?.original?.state_name ?? "-",
        },
        { Header: "City", accessor: "city_name" },
        { Header: "Area", accessor: "name" },
        {
            Header: "Pin code",
            accessor: "pincodes",
            Cell: pinCodesCell,
        },
        {
            Header: "Status",
            accessor: "is_active",
            Cell: statusCell("is_active"),
        },
        {
            Header: "Action",
            accessor: "action",
            Cell: ({ row }: any) => (
                ActionColumnComponent ? (
                    <ActionColumnComponent
                        row={row}
                        onView={() =>
                            AddEditAreaDialog.show(true, row.original, () => refreshData("box-area"), true)
                        }
                        onDelete={async () => {
                            openConfirmDialog(
                                "Are you sure you want to void this area?",
                                "Void",
                                "Cancel",
                                async () => {
                                    let res = await deleteArea(row.original._id);
                                    if (res) refreshData("box-area");
                                }
                            );
                        }}
                    />
                ) : (
                    <span>-</span>
                )
            ),
        },
    ], [currentPage, pageSize]);

    return (
        <>
            <div className="main-page-content">
                {HeaderComponent ? (
                    <HeaderComponent
                        title="Location Management"
                        register={headerRegister}
                        setValue={setHeaderValue}
                    />
                ) : (
                    <h4>Location Management</h4>
                )}

                <div className="box-container">
                    {["box-state", "box-city", "box-area"].map((id) => {
                        if (SummaryBoxComponent) {
                            return (
                                <SummaryBoxComponent
                                    key={id}
                                    divId={id}
                                    title={capitalizeString(id.replace("box-", "").replace("-", " "))}
                                    data={id === "box-state" ? stateData : id === "box-city" ? cityData : areaData}
                                    onSelect={(divId: string) => {
                                        setSelectedBox(divId);
                                        setSelectedCityStateId("");
                                        setSelectedAreaStateId("");
                                        setSelectedAreaCityId("");
                                        setSelectedAreaFranchiseId("");
                                        setAreaCityOptions([]);
                                        handleFilterChange({}, true);
                                    }}
                                    isSelected={selectedBox === id}
                                    onFilterChange={(filter: { status?: string }) => {
                                        handleFilterChange(filter);
                                    }}
                                    isAddShow={true}
                                    addButtonLable={capitalizeString(id.replace("box-", "Add ").replace("-", " "))}
                                    onAddClick={() => {
                                        id === "box-state"
                                            ? AddEditStateDialog.show(false, null, () => refreshData(selectedBox))
                                            : id === "box-area"
                                            ? AddEditAreaDialog.show(false, null, () => refreshData(selectedBox))
                                            : AddEditCityDialog.show(false, null, () => refreshData(selectedBox));
                                    }}
                                />
                            );
                        }
                        return (
                            <div key={id} className="box">
                                {capitalizeString(id.replace("box-", "").replace("-", " "))}
                            </div>
                        );
                    })}
                </div>

                {UtilityBoxComponent ? (
                    <UtilityBoxComponent
                        title={
                            selectedBox === "box-state"
                                ? "States"
                                : selectedBox === "box-city"
                                  ? "Cities"
                                  : "Areas"
                        }
                        searchHint={`Search ${selectedBox === "box-state" ? "State" : selectedBox === "box-city" ? "City" : "Area"} Name`}
                        toolsInlineRow={selectedBox === "box-city" || selectedBox === "box-area"}
                        titleFiltersSearchRow={selectedBox === "box-city" || selectedBox === "box-area"}
                        controlSlot={
                            selectedBox === "box-city" ? (
                                <div className="filters-container">
                                    <label className="fw-medium">State</label>
                                    {FormSelectComponent ? (
                                        <FormSelectComponent
                                            label=""
                                            controlId="state"
                                            options={cityStateFilterOptions}
                                            register={cityFilterRegister as unknown as UseFormRegister<any>}
                                            fieldName="city_state_id"
                                            asCol={false}
                                            noBottomMargin={true}
                                            selectWidth="220px"
                                            defaultValue={selectedCityStateId}
                                            setValue={setCityFilterValue as (name: string, value: any) => void}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                handleCityStateFilterChange(e.target.value)
                                            }
                                        />
                                    ) : null}
                                </div>
                            ) : selectedBox === "box-area" ? (
                                <>
                                    <div className="filters-container">
                                        <label className="fw-medium">State</label>
                                        {FormSelectComponent ? (
                                            <FormSelectComponent
                                                label=""
                                                controlId="state"
                                                options={stateFilterOptions}
                                                register={areaFilterRegister as unknown as UseFormRegister<any>}
                                                fieldName="area_state_id"
                                                asCol={false}
                                                noBottomMargin={true}
                                                selectWidth="220px"
                                                defaultValue={selectedAreaStateId}
                                                setValue={setAreaFilterValue as (name: string, value: any) => void}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                    handleAreaStateFilterChange(e.target.value)
                                                }
                                            />
                                        ) : null}
                                    </div>
                                    <div
                                        className="filters-container"
                                    >
                                        <label className="fw-medium">City</label>
                                        {FormSelectComponent ? (
                                            <FormSelectComponent
                                                label=""
                                                controlId="city"
                                                options={cityFilterOptions}
                                                register={areaFilterRegister as unknown as UseFormRegister<any>}
                                                fieldName="area_city_id"
                                                asCol={false}
                                                noBottomMargin={true}
                                                selectWidth="220px"
                                                defaultValue={selectedAreaCityId}
                                                setValue={setAreaFilterValue as (name: string, value: any) => void}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                    if (!selectedAreaStateId) return;
                                                    handleAreaCityFilterChange(e.target.value);
                                                }}
                                            />
                                        ) : null}
                                    </div>
                                    <div className="filters-container">
                                        <label className="fw-medium">Franchise</label>
                                        {FormSelectComponent ? (
                                            <FormSelectComponent
                                                label=""
                                                controlId="franchise"
                                                options={franchiseFilterOptions}
                                                register={areaFilterRegister as unknown as UseFormRegister<any>}
                                                fieldName="area_franchise_id"
                                                asCol={false}
                                                noBottomMargin={true}
                                                selectWidth="220px"
                                                defaultValue={selectedAreaFranchiseId}
                                                setValue={setAreaFilterValue as (name: string, value: any) => void}
                                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                    handleAreaFranchiseFilterChange(e.target.value)
                                                }
                                            />
                                        ) : null}
                                    </div>
                                </>
                            ) : undefined
                        }
                        onDownloadClick={async () => {
                            selectedBox === "box-state"
                                ? await exportData(ApiPaths.EXPORT_STATE)
                                : selectedBox === "box-area"
                                  ? await exportData(ApiPaths.EXPORT_AREA)
                                  : await exportData(ApiPaths.EXPORT_CITY);
                        }}
                        onSortClick={(value: "-1" | "1") => {
                            handleFilterChange({ sort: value });
                        }}
                        onMoreClick={() => {}}
                        onSearch={(value: string) => handleFilterChange({ name: value })}
                    />
                ) : null}

                {TableComponent ? <TableComponent
                    columns={selectedBox === "box-state" ? stateColumns : selectedBox === "box-city" ? cityColumns : areaColumns}
                    data={selectedBox === "box-state" ? stateList : selectedBox === "box-city" ? cityList : areaList}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onLimitChange={(pageSize: number) => {
                        setPageSize(pageSize);
                        setCurrentPage(1);
                    }}
                    theadClass="table-light"
                /> : null}

            </div>
        </>
    );
}

export default LocationManagement;