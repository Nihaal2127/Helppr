import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { FranchiseModel } from "../../models/FranchiseModels";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { DetailsRow, getStatusOptions } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateFranchise } from "../../services/franchiseService";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import {
    MOCK_FRANCHISE_CATEGORY_DROPDOWN,
    MOCK_FRANCHISE_SERVICES_LIST,
    USE_MOCK_FRANCHISE_CATALOG,
} from "../../mockData/franchiseCatalogMock";
import { openDialog } from "../../helper/DialogManager";

type AddEditFranchiseDialogProps = {
    isEditable: boolean;
    isViewMode?: boolean;
    franchise: FranchiseModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

type OptionType = {
    value: string;
    label: string;
};

type ServiceLite = {
    _id: string;
    name: string;
    category_id: string;
    category_name?: string;
};

type ViewCategoryServicesGroup = {
    categoryId: string;
    categoryLabel: string;
    services: string[];
};

const UNCATEGORIZED_KEY = "__uncategorized__";
/** Services with no resolvable category_id — single row, never labeled "Other". */
const FLAT_SERVICES_KEY = "__services_flat__";

function parseMultiSelectIds(selectedOptions: OptionType[], allOptions: OptionType[]): string[] {
    const isSelectAllSelected = selectedOptions.some((o) => o.value === "select-all");
    const all = allOptions.filter((s) => s.value !== "select-all");
    if (isSelectAllSelected) {
        const isAllSelected =
            selectedOptions.length - 1 === all.length &&
            all.every((svc) => selectedOptions.some((sel) => sel.value === svc.value));
        return isAllSelected ? [] : all.map((s) => s.value);
    }
    return selectedOptions.map((o) => o.value).filter((v) => v !== "select-all");
}

type FranchiseFormValues = Omit<FranchiseModel, "area_id"> & {
    area_id: string[];
    desc: string;
    desc2: string;
};

const stateOptions: OptionType[] = [
    { value: "andhra_pradesh", label: "Andhra Pradesh" },
    { value: "telangana", label: "Telangana" },
];

const cityOptionsMap: Record<string, OptionType[]> = {
    andhra_pradesh: [
        { value: "vijayawada", label: "Vijayawada" },
        { value: "visakhapatnam", label: "Visakhapatnam" },
        { value: "guntur", label: "Guntur" },
    ],
    telangana: [
        { value: "hyderabad", label: "Hyderabad" },
        { value: "warangal", label: "Warangal" },
        { value: "karimnagar", label: "Karimnagar" },
    ],
};

const areaOptionsMap: Record<string, OptionType[]> = {
    vijayawada: [
        { value: "benz_circle", label: "Benz Circle" },
        { value: "patamata", label: "Patamata" },
        { value: "governorpet", label: "Governorpet" },
        { value: "kanuru", label: "Kanuru" },
        { value: "poranki", label: "Poranki" },
        { value: "penamaluru", label: "Penamaluru" },
        { value: "one_town", label: "One Town" },
        { value: "satyanarayanapuram", label: "Satyanarayanapuram" },
        { value: "moghalrajpuram", label: "Moghalrajpuram" },
        { value: "gunadala", label: "Gunadala" },
    ],
    visakhapatnam: [
        { value: "mvp_colony", label: "MVP Colony" },
        { value: "gajuwaka", label: "Gajuwaka" },
        { value: "dwarka_nagar", label: "Dwarka Nagar" },
        { value: "maddilapalem", label: "Maddilapalem" },
        { value: "nad_junction", label: "NAD Junction" },
        { value: "seethammadhara", label: "Seethammadhara" },
        { value: "akkayyapalem", label: "Akkayyapalem" },
        { value: "rushikonda", label: "Rushikonda" },
        { value: "beach_road", label: "Beach Road" },
        { value: "kancharapalem", label: "Kancharapalem" },
    ],
    guntur: [
        { value: "brodipet", label: "Brodipet" },
        { value: "arundelpet", label: "Arundelpet" },
        { value: "lakshmipuram", label: "Lakshmipuram" },
        { value: "nallapadu", label: "Nallapadu" },
        { value: "vidyanagar", label: "Vidyanagar" },
        { value: "kothapet", label: "Kothapet" },
        { value: "gujjanagundla", label: "Gujjanagundla" },
        { value: "svn_colony", label: "SVN Colony" },
        { value: "ashok_nagar", label: "Ashok Nagar" },
        { value: "pattabhipuram", label: "Pattabhipuram" },
    ],
    hyderabad: [
        { value: "ameerpet", label: "Ameerpet" },
        { value: "madhapur", label: "Madhapur" },
        { value: "kukatpally", label: "Kukatpally" },
        { value: "gachibowli", label: "Gachibowli" },
        { value: "hitech_city", label: "Hitech City" },
        { value: "begumpet", label: "Begumpet" },
        { value: "sr_nagar", label: "SR Nagar" },
        { value: "jubilee_hills", label: "Jubilee Hills" },
        { value: "banjara_hills", label: "Banjara Hills" },
        { value: "mehdipatnam", label: "Mehdipatnam" },
        { value: "dilsukhnagar", label: "Dilsukhnagar" },
        { value: "lb_nagar", label: "LB Nagar" },
    ],
    warangal: [
        { value: "hanamkonda", label: "Hanamkonda" },
        { value: "kazipet", label: "Kazipet" },
        { value: "enumamula", label: "Enumamula" },
        { value: "subedari", label: "Subedari" },
        { value: "balasamudram", label: "Balasamudram" },
        { value: "waddepally", label: "Waddepally" },
        { value: "kakaji_colony", label: "Kakaji Colony" },
        { value: "mattwada", label: "Mattwada" },
    ],
    karimnagar: [
        { value: "mankammathota", label: "Mankammathota" },
        { value: "rekurthi", label: "Rekurthi" },
        { value: "kothirampur", label: "Kothirampur" },
        { value: "mukarampura", label: "Mukarampura" },
        { value: "ramnagar", label: "Ramnagar" },
        { value: "vidyanagar", label: "Vidyanagar" },
        { value: "saptagiri_colony", label: "Saptagiri Colony" },
        { value: "algunur", label: "Algunur" },
    ],
};

const AddEditFranchiseDialog: React.FC<AddEditFranchiseDialogProps> & {
    show: (isEditable: boolean, franchise: FranchiseModel | null, onRefreshData: () => void, isViewMode?: boolean) => void;
} = ({ isEditable, isViewMode = false, franchise, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FranchiseFormValues>({
        defaultValues: {
            name: franchise?.name || "",
            desc: (franchise as any)?.desc || "",
            desc2: (franchise as any)?.desc2 || "",
            state_id: franchise?.state_id || "",
            city_id: franchise?.city_id || "",
            area_id: franchise?.area_id
                ? Array.isArray(franchise.area_id)
                    ? franchise.area_id
                    : [franchise.area_id]
                : [],
            admin_id: franchise?.admin_id || "",
            is_active: franchise?.is_active ?? true,
        },
    });

    const [areaIds, setAreaIds] = useState<string[]>(
        franchise?.area_id
            ? Array.isArray(franchise.area_id)
                ? franchise.area_id
                : [franchise.area_id]
            : []
    );

    const [adminOptions, setAdminOptions] = useState<OptionType[]>([
        { value: "admin_1", label: "Admin 1" },
        { value: "admin_2", label: "Admin 2" },
        { value: "admin_3", label: "Admin 3" },
        { value: "add_new_admin", label: "+ Add New Admin" },
    ]);
    const [localViewMode, setLocalViewMode] = useState(isViewMode);

    const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
    const [allServices, setAllServices] = useState<ServiceLite[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [serviceIds, setServiceIds] = useState<string[]>([]);

    const selectedState = watch("state_id");
    const selectedCity = watch("city_id");
    const selectedAdmin = watch("admin_id");

    const cityOptions = useMemo(() => {
        return cityOptionsMap[selectedState] || [];
    }, [selectedState]);

    const areaOptions = useMemo(() => {
        return areaOptionsMap[selectedCity] || [];
    }, [selectedCity]);

    const serviceOptions = useMemo(
        () => [{ value: "select-all", label: "Select All" }, ...allServices.map((s) => ({ value: s._id, label: s.name }))],
        [allServices]
    );

    const selectedCategoryOptions = useMemo(
        () => categoryOptions.filter((c) => categoryIds.includes(c.value)),
        [categoryOptions, categoryIds]
    );

    const selectedServiceOptions = useMemo(
        () => serviceOptions.filter((s) => serviceIds.includes(s.value)),
        [serviceOptions, serviceIds]
    );

    /** View mode: one row per category with its services in the adjacent column. */
    const viewCategoryServiceGroups = useMemo((): ViewCategoryServicesGroup[] => {
        if (!franchise) return [];

        const svcIds = (franchise.service_ids ?? []).map(String);
        const svcNames = franchise.service_names;
        const catIdsOrder = (franchise.category_ids ?? []).map(String);
        const catNames = franchise.category_names;

        const serviceLabel = (sid: string, index: number): string => {
            const fromAll = allServices.find((x) => String(x._id) === sid);
            if (fromAll?.name) return fromAll.name;
            if (Array.isArray(svcNames) && svcNames[index] != null && svcNames[index] !== "") {
                return String(svcNames[index]);
            }
            return sid;
        };

        const categoryLabel = (cid: string): string => {
            if (cid === FLAT_SERVICES_KEY) return "Services";
            const opt = categoryOptions.find((o) => String(o.value) === cid && o.value !== "select-all");
            if (opt?.label) return opt.label;
            const idx = catIdsOrder.indexOf(cid);
            if (Array.isArray(catNames) && idx >= 0 && catNames[idx] != null && String(catNames[idx]).trim()) {
                return String(catNames[idx]);
            }
            const svc = allServices.find((x) => String(x.category_id) === cid);
            if (svc?.category_name) return svc.category_name;
            return cid;
        };

        const byCat = new Map<string, string[]>();
        const insertOrder: string[] = [];

        const pushService = (cid: string, label: string) => {
            if (!byCat.has(cid)) {
                byCat.set(cid, []);
                insertOrder.push(cid);
            }
            const arr = byCat.get(cid)!;
            if (!arr.includes(label)) arr.push(label);
        };

        svcIds.forEach((sid, index) => {
            const label = serviceLabel(sid, index);
            const s = allServices.find((x) => String(x._id) === sid);
            const cid = s?.category_id ? String(s.category_id) : "";
            pushService(cid || UNCATEGORIZED_KEY, label);
        });

        for (const cid of catIdsOrder) {
            if (!byCat.has(cid)) {
                byCat.set(cid, []);
                if (!insertOrder.includes(cid)) insertOrder.push(cid);
            }
        }

        /** Merge API-unknown services into real categories (round-robin); never show "Other". */
        const orphanLabels = [...(byCat.get(UNCATEGORIZED_KEY) ?? [])];
        if (orphanLabels.length) {
            byCat.delete(UNCATEGORIZED_KEY);
            const uIdx = insertOrder.indexOf(UNCATEGORIZED_KEY);
            if (uIdx !== -1) insertOrder.splice(uIdx, 1);

            const uniqueInsert = insertOrder.filter((c) => c !== UNCATEGORIZED_KEY).filter((c, i, a) => a.indexOf(c) === i);
            const pool = catIdsOrder.length > 0 ? catIdsOrder : uniqueInsert;

            if (pool.length > 0) {
                orphanLabels.forEach((label, i) => {
                    const cid = pool[i % pool.length];
                    if (!byCat.has(cid)) {
                        byCat.set(cid, []);
                        if (!insertOrder.includes(cid)) insertOrder.push(cid);
                    }
                    const arr = byCat.get(cid)!;
                    if (!arr.includes(label)) arr.push(label);
                });
            } else {
                if (!byCat.has(FLAT_SERVICES_KEY)) {
                    byCat.set(FLAT_SERVICES_KEY, []);
                    insertOrder.push(FLAT_SERVICES_KEY);
                }
                const flat = byCat.get(FLAT_SERVICES_KEY)!;
                orphanLabels.forEach((label) => {
                    if (!flat.includes(label)) flat.push(label);
                });
            }
        }

        const built: ViewCategoryServicesGroup[] = [];
        const seen = new Set<string>();

        for (const cid of catIdsOrder) {
            if (!byCat.has(cid)) continue;
            built.push({
                categoryId: cid,
                categoryLabel: categoryLabel(cid),
                services: byCat.get(cid)!,
            });
            seen.add(cid);
        }
        for (const cid of insertOrder) {
            if (cid === UNCATEGORIZED_KEY) continue;
            if (seen.has(cid)) continue;
            built.push({
                categoryId: cid,
                categoryLabel: categoryLabel(cid),
                services: byCat.get(cid) ?? [],
            });
            seen.add(cid);
        }

        if (built.length === 0 && Array.isArray(catNames) && catNames.length > 0 && svcIds.length === 0) {
            return catNames.map((label, i) => ({
                categoryId: `cat-name-${i}`,
                categoryLabel: String(label),
                services: [],
            }));
        }

        return built;
    }, [franchise, allServices, categoryOptions]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const [cats, svcRes] = await Promise.all([
                    USE_MOCK_FRANCHISE_CATALOG
                        ? Promise.resolve(MOCK_FRANCHISE_CATEGORY_DROPDOWN.map((c) => ({ ...c })))
                        : fetchCategoryDropDown(),
                    USE_MOCK_FRANCHISE_CATALOG
                        ? Promise.resolve({
                              response: true,
                              services: MOCK_FRANCHISE_SERVICES_LIST,
                              totalPages: 1,
                          })
                        : fetchService(1, 500, {}),
                ]);
                if (cancelled) return;
                const catList = Array.isArray(cats) ? cats.filter((c: any) => c?.value) : [];
                setCategoryOptions([{ value: "select-all", label: "Select All" }, ...catList]);
                const list = svcRes?.response && Array.isArray(svcRes.services) ? svcRes.services : [];
                setAllServices(
                    list.map((s: any) => ({
                        _id: String(s._id),
                        name: String(s.name ?? ""),
                        category_id: String(s.category_id ?? ""),
                        category_name: s.category_name ? String(s.category_name) : undefined,
                    }))
                );
            } catch {
                if (!cancelled) {
                    setCategoryOptions([{ value: "select-all", label: "Select All" }]);
                    setAllServices([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!franchise && !isEditable) {
            setCategoryIds([]);
            setServiceIds([]);
        }
    }, [franchise, isEditable]);

    useEffect(() => {
        if (isEditable && franchise) {
            setValue("name", franchise.name || "");
            setValue("desc", (franchise as any)?.desc || "");
            setValue("desc2", (franchise as any)?.desc2 || "");
            setValue("state_id", franchise.state_id || "");
            setValue("city_id", franchise.city_id || "");
            setValue("admin_id", franchise.admin_id || "");
            setValue("is_active", franchise.is_active ?? true);

            const editAreaIds = franchise.area_id
                ? Array.isArray(franchise.area_id)
                    ? franchise.area_id
                    : [franchise.area_id]
                : [];

            setAreaIds(editAreaIds);
            setValue("area_id", editAreaIds);

            const c = franchise.category_ids ?? [];
            const s = franchise.service_ids ?? [];
            setCategoryIds(Array.isArray(c) ? c.map(String) : []);
            setServiceIds(Array.isArray(s) ? s.map(String) : []);
        }
    }, [isEditable, franchise, setValue]);

    useEffect(() => {
        if (isEditable) return;
        setValue("city_id", "");
        setAreaIds([]);
        setValue("area_id", []);
    }, [selectedState, isEditable, setValue]);

    useEffect(() => {
        if (isEditable) return;
        setAreaIds([]);
        setValue("area_id", []);
    }, [selectedCity, isEditable, setValue]);

    const handleAreaSelection = (selectedOptions: OptionType[]) => {
        const selectedIds = selectedOptions.map((option) => option.value);
        setAreaIds(selectedIds);
        setValue("area_id", selectedIds, { shouldValidate: true });
    };

    const handleCategorySelection = (selectedOptions: OptionType[]) => {
        const selectedIds = parseMultiSelectIds(selectedOptions, categoryOptions);
        const removedCategoryIds = categoryIds.filter((id) => !selectedIds.includes(id));
        setCategoryIds(selectedIds);

        const auto = allServices
            .filter((svc) => selectedIds.includes(String(svc.category_id)))
            .map((svc) => String(svc._id));

        setServiceIds((prev) => {
            const withoutDeselectedCategories = prev.filter((sid) => {
                const svc = allServices.find((x) => String(x._id) === String(sid));
                if (!svc) return true;
                return !removedCategoryIds.includes(String(svc.category_id));
            });
            const manual = withoutDeselectedCategories.filter((sid) => {
                const svc = allServices.find((x) => String(x._id) === String(sid));
                if (!svc) return true;
                if (selectedIds.length === 0) return true;
                return !selectedIds.includes(String(svc.category_id));
            });
            const merged = auto.concat(manual);
            const uniq: string[] = [];
            for (let i = 0; i < merged.length; i++) {
                const id = merged[i];
                if (uniq.indexOf(id) === -1) uniq.push(id);
            }
            return uniq;
        });
    };

    const handleServiceSelection = (selectedOptions: OptionType[]) => {
        const selectedIds = parseMultiSelectIds(selectedOptions, serviceOptions);
        setServiceIds(selectedIds);
    };

    /** If no service from a category remains selected, drop that category from the Category field. */
    useEffect(() => {
        if (allServices.length === 0) return;
        setCategoryIds((prev) =>
            prev.filter((catId) =>
                serviceIds.some((sid) => {
                    const svc = allServices.find((x) => String(x._id) === String(sid));
                    return Boolean(svc && String(svc.category_id) === String(catId));
                })
            )
        );
    }, [serviceIds, allServices]);

    const handleAddAdmin = useCallback(() => {
        const adminName = window.prompt("Enter new admin name");
        if (!adminName || !adminName.trim()) {
            setValue("admin_id", "", { shouldValidate: true });
            return;
        }

        const trimmedName = adminName.trim();
        const adminValue = trimmedName.toLowerCase().replace(/\s+/g, "_");

        const exists = adminOptions.some(
            (item) =>
                item.label.toLowerCase() === trimmedName.toLowerCase() ||
                item.value.toLowerCase() === adminValue.toLowerCase()
        );

        if (exists) {
            showErrorAlert("Admin already exists");
            setValue("admin_id", "", { shouldValidate: true });
            return;
        }

        const newAdmin = {
            value: adminValue,
            label: trimmedName,
        };

        setAdminOptions((prev) => {
            const filtered = prev.filter((item) => item.value !== "add_new_admin");
            return [...filtered, newAdmin, { value: "add_new_admin", label: "+ Add New Admin" }];
        });

        setValue("admin_id", newAdmin.value, { shouldValidate: true });
    }, [adminOptions, setValue]);

    useEffect(() => {
        if (selectedAdmin === "add_new_admin") {
            handleAddAdmin();
        }
    }, [selectedAdmin, handleAddAdmin]);

    const onSubmitEvent = async (data: FranchiseFormValues) => {
        if (areaIds.length === 0) {
            showErrorAlert("Please select area");
            return;
        }

        const selectedStateLabel =
            stateOptions.find((item) => item.value === data.state_id)?.label || "";

        const selectedCityLabel =
            cityOptions.find((item) => item.value === data.city_id)?.label || "";

        const selectedAreaLabels = areaOptions
            .filter((item) => areaIds.includes(item.value))
            .map((item) => item.label);

        const selectedAdminLabel =
            adminOptions.find(
                (item) =>
                    item.value === data.admin_id && item.value !== "add_new_admin"
            )?.label || "";

        const categoryOpts = categoryOptions.filter((c) => c.value !== "select-all");
        const selectedCategoryLabels = categoryOpts
            .filter((c) => categoryIds.includes(c.value))
            .map((c) => c.label);
        const selectedServiceLabels = allServices
            .filter((s) => serviceIds.includes(String(s._id)))
            .map((s) => s.name);

        const payload = {
            name: data.name,
            desc: data.desc,
            state_id: data.state_id,
            state_name: selectedStateLabel,
            city_id: data.city_id,
            city_name: selectedCityLabel,
            area_id: areaIds,
            area_name: selectedAreaLabels,
            admin_id: data.admin_id,
            admin_name: selectedAdminLabel,
            is_active: data.is_active,
            category_ids: categoryIds,
            category_names: selectedCategoryLabels,
            service_ids: serviceIds,
            service_names: selectedServiceLabels,
        };

        let response;

        if (isEditable) {
            if (!franchise?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            response = await createOrUpdateFranchise(payload, true, franchise._id);
        } else {
            response = await createOrUpdateFranchise(payload, false);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered size="lg" enforceFocus={false}>
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {localViewMode ? "Franchise Details" : isEditable ? "Edit Franchise" : "Add Franchise"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0">
                {localViewMode && franchise ? (
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Franchise Information</h3>
                            <i
                                className="bi bi-pencil-fill fs-6 text-danger"
                                style={{ cursor: "pointer" }}
                                onClick={() => setLocalViewMode(false)}
                            ></i>
                        </div>

                        <div className="row">
                            <div className="col-md-6 custom-helper-column">
                                <DetailsRow title="Franchise Name" value={franchise.name} />
                                <DetailsRow title="State" value={franchise.state_name ?? franchise.state_id} />
                                <DetailsRow title="City" value={franchise.city_name ?? franchise.city_id} />
                            </div>

                            <div className="col-md-6 custom-helper-column">
                                <div className="row custom-personal-row">
                                    <label className="col-md-3 custom-personal-row-title">Admin</label>
                                    <label className="col-md-9 custom-personal-row-value">
                                        {franchise.admin_name ?? franchise.admin_id ?? "-"}
                                    </label>
                                </div>
                                <div className="row custom-personal-row">
                                    <label className="col-md-3 custom-personal-row-title">Area</label>
                                    <label className="col-md-9 custom-personal-row-value text-wrap">
                                        {Array.isArray((franchise as any).area_name)
                                            ? (franchise as any).area_name.join(", ")
                                            : (franchise as any).area_name ?? franchise.area_id ?? "-"}
                                    </label>
                                </div>
                                <div className="row custom-personal-row">
                                    <label className="col-md-3 custom-personal-row-title">Status</label>
                                    <label className="col-md-9 custom-personal-row-value">
                                        {franchise.is_active ? "Active" : "Inactive"}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-3">
                            <div className="col-12">
                                <div
                                    className="rounded border px-3 py-2"
                                    style={{
                                        backgroundColor: "var(--bg-color)",
                                        borderColor: "var(--lb1-border)",
                                    }}
                                >
                                    <div
                                        className="custom-personal-row-title mb-2"
                                    >
                                        Categories &amp; services
                                    </div>
                                    {viewCategoryServiceGroups.length === 0 ? (
                                        <div className="text-muted small py-1">-</div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table
                                                className="table table-sm table-bordered mb-0 align-middle"
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--content-txt-color)",
                                                    borderColor: "var(--lb1-border)",
                                                }}
                                            >
                                                <thead>
                                                    <tr className="" style={{ borderColor: "var(--lb1-border)" }}>
                                                        <th
                                                            scope="col"
                                                            className="fw-semibold  py-2 ps-3 pe-0"
                                                            style={{ width: "22%", minWidth: "120px", color: "var(--primary-txt-color)" }}
                                                        >
                                                            Category
                                                        </th>
                                                        <th scope="col" className="fw-semibold  py-2 ps-3 pe-0" style={{ color: "var(--primary-txt-color)" }}>
                                                            Services offered
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewCategoryServiceGroups.map((g) => (
                                                        <tr
                                                            key={g.categoryId}
                                                            style={{ borderColor: "var(--lb1-border)" }}
                                                        >
                                                            <td className="align-top py-2 ps-3 text-wrap">
                                                                <span style={{ color: "#101010" }}>
                                                                    {g.categoryLabel}
                                                                </span>
                                                            </td>
                                                            <td className="align-top py-2 ps-3 pe-0">
                                                                <div
                                                                    className="text-wrap"
                                                                >
                                                                    {g.services.length > 0 ? (
                                                                        <span>{g.services.join(", ")}</span>
                                                                    ) : (
                                                                        <span className="text-muted">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 p-3 border rounded">
                            <div className="custom-personal-row-title mb-2">Description / Notes</div>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt-color)" }}>
                                {(franchise as any).description ?? (franchise as any).desc ?? "-"}
                            </div>
                        </div>
                    </section>
                ) : (
                    <form
                        noValidate
                        name="franchise-form"
                        id="franchise-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <Col md={6}>
                                <CustomFormInput
                                    label="Franchise Name"
                                    controlId="name"
                                    placeholder="Enter Franchise Name"
                                    register={register}
                                    error={errors.name}
                                    asCol={false}
                                    validation={{ required: "Franchise name is required" }}
                                />
                            </Col>
                            <Col md={6}>
                                <CustomFormSelect
                                    label="Admin"
                                    controlId="Admin"
                                    options={adminOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="admin_id"
                                    error={errors.admin_id}
                                    asCol={false}
                                    requiredMessage="Please select admin"
                                    defaultValue={isEditable ? franchise?.admin_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="State"
                                    controlId="State"
                                    options={stateOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="state_id"
                                    error={errors.state_id}
                                    asCol={false}
                                    requiredMessage="Please select state"
                                    defaultValue={isEditable ? franchise?.state_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="City"
                                    controlId="City"
                                    options={cityOptions}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="city_id"
                                    error={errors.city_id}
                                    asCol={false}
                                    requiredMessage="Please select city"
                                    defaultValue={isEditable ? franchise?.city_id : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomMultiSelect
                                    label="Area"
                                    controlId="Area"
                                    options={areaOptions}
                                    value={areaOptions.filter((area) => areaIds.includes(area.value))}
                                    onChange={(selectedOptions) => {
                                        handleAreaSelection(selectedOptions as OptionType[]);
                                    }}
                                    selectedChipsMaxHeight="100px"
                                    asCol={false}
                                />
                            </Col>
                            

                            <Col md={6}>
                                <CustomMultiSelect
                                    label="Category"
                                    controlId="Category"
                                    options={categoryOptions}
                                    value={selectedCategoryOptions}
                                    onChange={(opts) => handleCategorySelection(opts as OptionType[])}
                                    asCol={false}
                                    menuPortal
                                    selectedChipsMaxHeight="100px"
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <CustomMultiSelect
                                    label="Services"
                                    controlId="Services"
                                    options={serviceOptions}
                                    value={selectedServiceOptions}
                                    onChange={(opts) => handleServiceSelection(opts as OptionType[])}
                                    asCol={false}
                                    menuPortal
                                    selectedChipsMaxHeight="180px"
                                />
                            </Col>
                        </Row>

                        
                        <Row>
                        <Col md={6}>
                                <CustomRadioSelection
                                    label="Status"
                                    name="is_active"
                                    options={getStatusOptions()}
                                    defaultValue={isEditable ? franchise?.is_active?.toString() : "true"}
                                    isEditable={isEditable}
                                    setValue={setValue}
                                />
                            </Col>
                            <Col md={12}>
                                <CustomFormInput
                                    label="Description"
                                    controlId="desc"
                                    placeholder="Enter Description"
                                    register={register}
                                    error={errors.desc as any}
                                    asCol={false}
                                    validation={{ required: "Description is required" }}
                                    as="textarea"
                                    rows={3}
                                />
                            </Col>

                            
                        </Row>
                    </form>
                )}
            </Modal.Body>

            {!localViewMode && (
                <Modal.Footer>
                    <Button
                        className="btn-danger"
                        type="submit"
                        form="franchise-form"
                    >
                        {isEditable ? "Update" : "Add"}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                </Modal.Footer>
            )}
        </Modal>
    );
};

AddEditFranchiseDialog.show = (
    isEditable: boolean,
    franchise: FranchiseModel | null,
    onRefreshData: () => void,
    isViewMode: boolean = false
) => {
    openDialog("details-modal", (close) => (
        <AddEditFranchiseDialog
            isEditable={isEditable}
            isViewMode={isViewMode}
            franchise={franchise}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditFranchiseDialog;