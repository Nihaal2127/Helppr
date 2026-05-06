import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  createOrUpdateFranchise,
  fetchFranchise,
} from "../../services/franchiseService";
import { assignFranchiseToAdminUser } from "../../services/settingsService";
import { fetchAreaDropDown } from "../../services/areaService";
import {
  fetchCategory,
  fetchCategoryDropDown,
} from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import { fetchStateDropDown } from "../../services/stateService";
import { fetchCityDropDown } from "../../services/cityService";
import {
  fetchUser,
  WEB_MANAGEMENT_USER_TYPE,
} from "../../services/userService";
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
const isMongoObjectId = (value: string) =>
  /^[a-f\d]{24}$/i.test(String(value ?? "").trim());

/** Each franchise has at most one `admin_id`; map admin user id -> franchise _id they manage. */
async function loadFranchiseAdminOccupancy(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  const pageSize = 200;
  for (;;) {
    const res = await fetchFranchise(page, pageSize, {}, []);
    if (!res.response) break;
    for (const f of res.franchises) {
      const aid = String(f.admin_id ?? "").trim();
      const fid = String(f._id ?? "").trim();
      if (aid && fid) map.set(aid, fid);
    }
    if (!res.totalPages || page >= res.totalPages) break;
    page += 1;
    if (page > 100) break;
  }
  return map;
}

function filterAdminsNotAssignedElsewhere(
  options: OptionType[],
  occupancy: Map<string, string>,
  currentFranchiseId: string
): OptionType[] {
  return options.filter((opt) => {
    const assignedToFranchiseId = occupancy.get(opt.value);
    if (!assignedToFranchiseId) return true;
    if (currentFranchiseId && assignedToFranchiseId === currentFranchiseId)
      return true;
    return false;
  });
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function parseMultiSelectIds(
  selectedOptions: OptionType[],
  allOptions: OptionType[]
): string[] {
  const isSelectAllSelected = selectedOptions.some(
    (o) => o.value === "select-all"
  );
  const all = allOptions.filter((s) => s.value !== "select-all");
  if (isSelectAllSelected) {
    const isAllSelected =
      selectedOptions.length - 1 === all.length &&
      all.every((svc) =>
        selectedOptions.some((sel) => sel.value === svc.value)
      );
    return isAllSelected ? [] : all.map((s) => s.value);
  }
  return selectedOptions.map((o) => o.value).filter((v) => v !== "select-all");
}

type FranchiseFormValues = Omit<FranchiseModel, "area_id"> & {
  area_id: string[];
  desc: string;
  desc2: string;
};

const STATIC_STATE_OPTIONS: OptionType[] = [
  { value: "andhra_pradesh", label: "Andhra Pradesh" },
  { value: "telangana", label: "Telangana" },
];

const STATIC_CITY_OPTIONS_MAP: Record<string, OptionType[]> = {
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

const AddEditFranchiseDialog: React.FC<AddEditFranchiseDialogProps> & {
  show: (
    isEditable: boolean,
    franchise: FranchiseModel | null,
    onRefreshData: () => void,
    isViewMode?: boolean
  ) => void;
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

  const [adminOptions, setAdminOptions] = useState<OptionType[]>([]);
  const [stateOptions, setStateOptions] = useState<OptionType[]>([]);
  const [cityOptions, setCityOptions] = useState<OptionType[]>([]);
  const [localViewMode, setLocalViewMode] = useState(isViewMode);

  const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
  const [allServices, setAllServices] = useState<ServiceLite[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [fetchedAreaOptions, setFetchedAreaOptions] = useState<
    OptionType[] | null
  >(null);
  const skipInitialStateResetRef = useRef(true);
  const skipInitialCityResetRef = useRef(true);

  const selectedState = watch("state_id");
  const selectedCity = watch("city_id");

  const areaOptions = useMemo(() => {
    return fetchedAreaOptions ?? [];
  }, [fetchedAreaOptions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedCity?.trim()) {
        setFetchedAreaOptions(null);
        return;
      }
      setFetchedAreaOptions([]);
      const opts = await fetchAreaDropDown(selectedCity, selectedState);
      if (!cancelled) setFetchedAreaOptions(opts);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, selectedState]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loadAllFranchiseAdmins = async (): Promise<OptionType[]> => {
          const pageSize = 200;
          let page = 1;
          const allUsers: any[] = [];

          for (;;) {
            // Use /user/getAll only for Franchise dialog admin dropdown.
            // type=1 => Franchise Admin
            // eslint-disable-next-line no-await-in-loop
            const res = await fetchUser(
              false,
              WEB_MANAGEMENT_USER_TYPE.FRANCHISE_ADMIN,
              page,
              pageSize,
              { status: "true" }
            );
            if (!res.response) break;

            allUsers.push(...(res.users ?? []));
            if (!res.totalPages || page >= res.totalPages) break;
            page += 1;
            if (page > 100) break;
          }

          const unique = new Map<string, OptionType>();
          allUsers.forEach((u: any) => {
            const value = String(u?._id ?? "").trim();
            if (!value) return;
            const label = String(
              u?.name ?? u?.email ?? u?.phone_number ?? ""
            ).trim();
            if (!label) return;
            if (!unique.has(value)) {
              unique.set(value, { value, label });
            }
          });

          return Array.from(unique.values()).sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
          );
        };

        const [states, usersResult, occupancy] = await Promise.all([
          fetchStateDropDown(),
          loadAllFranchiseAdmins(),
          loadFranchiseAdminOccupancy(),
        ]);
        if (cancelled) return;
        const currentId = String(franchise?._id ?? "").trim();
        setStateOptions(states);
        setAdminOptions(
          filterAdminsNotAssignedElsewhere(usersResult, occupancy, currentId)
        );
      } catch {
        if (cancelled) return;
        setStateOptions(STATIC_STATE_OPTIONS);
        setAdminOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchise?._id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedState?.trim()) {
        setCityOptions([]);
        return;
      }
      try {
        const rows = await fetchCityDropDown([selectedState]);
        if (!cancelled) {
          setCityOptions(rows.map((r) => ({ value: r.value, label: r.label })));
        }
      } catch {
        if (!cancelled)
          setCityOptions(STATIC_CITY_OPTIONS_MAP[selectedState] || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  const serviceOptions = useMemo(
    () => [
      { value: "select-all", label: "Select All" },
      ...allServices.map((s) => ({ value: s._id, label: s.name })),
    ],
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
      if (
        Array.isArray(svcNames) &&
        svcNames[index] != null &&
        svcNames[index] !== ""
      ) {
        return String(svcNames[index]);
      }
      return sid;
    };

    const categoryLabel = (cid: string): string => {
      if (cid === FLAT_SERVICES_KEY) return "Services";
      const opt = categoryOptions.find(
        (o) => String(o.value) === cid && o.value !== "select-all"
      );
      if (opt?.label) return opt.label;
      const idx = catIdsOrder.indexOf(cid);
      if (
        Array.isArray(catNames) &&
        idx >= 0 &&
        catNames[idx] != null &&
        String(catNames[idx]).trim()
      ) {
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

      const uniqueInsert = insertOrder
        .filter((c) => c !== UNCATEGORIZED_KEY)
        .filter((c, i, a) => a.indexOf(c) === i);
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

    if (
      built.length === 0 &&
      Array.isArray(catNames) &&
      catNames.length > 0 &&
      svcIds.length === 0
    ) {
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
        if (USE_MOCK_FRANCHISE_CATALOG) {
          const cats = MOCK_FRANCHISE_CATEGORY_DROPDOWN.map((c) => ({ ...c }));
          if (cancelled) return;
          const catList = Array.isArray(cats)
            ? cats.filter((c: any) => c?.value)
            : [];
          setCategoryOptions([
            { value: "select-all", label: "Select All" },
            ...catList,
          ]);
          setAllServices(
            MOCK_FRANCHISE_SERVICES_LIST.map((s: any) => ({
              _id: String(s._id),
              name: String(s.name ?? ""),
              category_id: String(s.category_id ?? ""),
              category_name: s.category_name
                ? String(s.category_name)
                : undefined,
            }))
          );
          return;
        }

        const catById = new Map<string, OptionType>();
        let cpage = 1;
        const climit = 200;
        for (;;) {
          const cres = await fetchCategory(cpage, climit, {}, []);
          if (cancelled) return;
          if (!cres.response) break;
          for (const c of cres.categories) {
            const id = String((c as { _id?: string })._id ?? "").trim();
            if (id)
              catById.set(id, {
                value: id,
                label: String((c as { name?: string }).name ?? "").trim() || id,
              });
          }
          if (!cres.totalPages || cpage >= cres.totalPages) break;
          cpage += 1;
          if (cpage > 50) break;
        }
        const dropCats = await fetchCategoryDropDown();
        if (cancelled) return;
        for (const c of dropCats) {
          if (c.value && c.value !== "select-all" && !catById.has(c.value)) {
            catById.set(c.value, c);
          }
        }
        const catList = Array.from(catById.values()).sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        );
        setCategoryOptions([
          { value: "select-all", label: "Select All" },
          ...catList,
        ]);

        const mergedServices: unknown[] = [];
        let spage = 1;
        const slimit = 500;
        for (;;) {
          const svcRes = await fetchService(spage, slimit, {});
          if (cancelled) return;
          if (!svcRes.response || !Array.isArray(svcRes.services)) break;
          mergedServices.push(...svcRes.services);
          if (!svcRes.totalPages || spage >= svcRes.totalPages) break;
          spage += 1;
          if (spage > 50) break;
        }
        setAllServices(
          mergedServices.map((s: any) => ({
            _id: String(s._id),
            name: String(s.name ?? ""),
            category_id: String(s.category_id ?? ""),
            category_name: s.category_name
              ? String(s.category_name)
              : undefined,
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
      setValue(
        "desc",
        (franchise as any)?.desc ?? (franchise as any)?.description ?? ""
      );
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

      const rawCategoryIds = toStringArray(
        (franchise as any).category_ids ?? (franchise as any).categories ?? []
      );
      const rawServiceIds = toStringArray(
        (franchise as any).service_ids ?? (franchise as any).services ?? []
      );

      const categoryIdsFromApi = rawCategoryIds.filter(isMongoObjectId);
      const serviceIdsFromApi = rawServiceIds.filter(isMongoObjectId);

      const categoryNames = toStringArray(
        (franchise as any).category_names ?? []
      );
      const serviceNames = toStringArray(
        (franchise as any).service_names ?? []
      );

      const categoryIdsFromNames =
        categoryIdsFromApi.length > 0
          ? categoryIdsFromApi
          : categoryOptions
              .filter(
                (c) =>
                  c.value !== "select-all" &&
                  categoryNames.some(
                    (n) =>
                      n.toLowerCase() ===
                      String(c.label ?? "")
                        .trim()
                        .toLowerCase()
                  )
              )
              .map((c) => String(c.value));

      const serviceIdsFromNames =
        serviceIdsFromApi.length > 0
          ? serviceIdsFromApi
          : allServices
              .filter((s) =>
                serviceNames.some(
                  (n) =>
                    n.toLowerCase() ===
                    String(s.name ?? "")
                      .trim()
                      .toLowerCase()
                )
              )
              .map((s) => String(s._id));

      const dedupCategoryIds = Array.from(new Set(categoryIdsFromNames));
      const dedupServiceIds = Array.from(new Set(serviceIdsFromNames));

      setCategoryIds(dedupCategoryIds);
      setServiceIds(dedupServiceIds);
    }
  }, [isEditable, franchise, setValue, categoryOptions, allServices]);

  useEffect(() => {
    if (skipInitialStateResetRef.current) {
      skipInitialStateResetRef.current = false;
      return;
    }
    setValue("city_id", "");
    setAreaIds([]);
    setValue("area_id", []);
  }, [selectedState, setValue]);

  useEffect(() => {
    if (skipInitialCityResetRef.current) {
      skipInitialCityResetRef.current = false;
      return;
    }
    setAreaIds([]);
    setValue("area_id", []);
  }, [selectedCity, setValue]);

  const handleAreaSelection = (selectedOptions: OptionType[]) => {
    const selectedIds = selectedOptions.map((option) => option.value);
    setAreaIds(selectedIds);
    setValue("area_id", selectedIds, { shouldValidate: true });
  };

  const handleCategorySelection = (selectedOptions: OptionType[]) => {
    const selectedIds = parseMultiSelectIds(selectedOptions, categoryOptions);
    const removedCategoryIds = categoryIds.filter(
      (id) => !selectedIds.includes(id)
    );
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

  const onSubmitEvent = async (data: FranchiseFormValues) => {
    if (areaIds.length === 0) {
      showErrorAlert("Please select area");
      return;
    }

    if (categoryIds.some((id) => !isMongoObjectId(id))) {
      showErrorAlert("Please select valid categories.");
      return;
    }
    if (serviceIds.some((id) => !isMongoObjectId(id))) {
      showErrorAlert("Please select valid services.");
      return;
    }

    const selectedStateLabel =
      stateOptions.find((item) => item.value === data.state_id)?.label ||
      STATIC_STATE_OPTIONS.find((item) => item.value === data.state_id)
        ?.label ||
      "";

    const selectedCityLabel =
      cityOptions.find((item) => item.value === data.city_id)?.label || "";

    const selectedAreaLabels = areaOptions
      .filter((item) => areaIds.includes(item.value))
      .map((item) => item.label);

    const selectedAdminLabel =
      adminOptions.find((item) => item.value === data.admin_id)?.label || "";

    const categoryOpts = categoryOptions.filter(
      (c) => c.value !== "select-all"
    );
    const selectedCategoryLabels = categoryOpts
      .filter((c) => categoryIds.includes(c.value))
      .map((c) => c.label);
    const selectedServiceLabels = allServices
      .filter((s) => serviceIds.includes(String(s._id)))
      .map((s) => s.name);

    const contactValue = String((franchise as any)?.contact ?? "").trim();

    const payload = {
      name: data.name,
      description: data.desc,
      desc: data.desc,
      state_id: data.state_id,
      state_name: selectedStateLabel,
      city_id: data.city_id,
      city_name: selectedCityLabel,
      area_id: areaIds,
      area_name: selectedAreaLabels,
      admin_id: data.admin_id,
      admin_name: selectedAdminLabel,
      ...(contactValue ? { contact: contactValue } : {}),
      is_active: data.is_active,
      categories: categoryIds,
      category_ids: categoryIds,
      category_names: selectedCategoryLabels,
      services: serviceIds,
      service_ids: serviceIds,
      service_names: selectedServiceLabels,
    };

    if (isEditable && !franchise?._id) {
      showErrorAlert("Unable to update. ID is missing.");
      return;
    }

    const saveResult = isEditable
      ? await createOrUpdateFranchise(payload, true, franchise!._id)
      : await createOrUpdateFranchise(payload, false);

    if (!saveResult.ok) return;

    const franchiseIdForUser =
      isEditable && franchise?._id
        ? String(franchise._id)
        : saveResult.franchiseId;
    const adminId = String(data.admin_id ?? "").trim();

    if (adminId && franchiseIdForUser) {
      await assignFranchiseToAdminUser({
        adminUserId: adminId,
        franchiseId: franchiseIdForUser,
        stateId: String(data.state_id ?? "").trim(),
        cityId: String(data.city_id ?? "").trim(),
      });
    } else if (adminId && !franchiseIdForUser) {
      showErrorAlert(
        "Franchise was saved, but the server did not return the franchise id. Assign this admin to the franchise under Settings → Role."
      );
    }

    onClose && onClose();
    onRefreshData();
  };

  return (
    <Modal show={true} onHide={onClose} centered size="lg" enforceFocus={false}>
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          {localViewMode
            ? "Franchise Details"
            : isEditable
            ? "Edit Franchise"
            : "Add Franchise"}
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
                <DetailsRow
                  title="State"
                  value={franchise.state_name ?? franchise.state_id}
                />
                <DetailsRow
                  title="City"
                  value={franchise.city_name ?? franchise.city_id}
                />
              </div>

              <div className="col-md-6 custom-helper-column">
                <div className="row custom-personal-row">
                  <label className="col-md-3 custom-personal-row-title">
                    Admin
                  </label>
                  <label className="col-md-9 custom-personal-row-value">
                    {franchise.admin_name ?? franchise.admin_id ?? "-"}
                  </label>
                </div>
                <div className="row custom-personal-row">
                  <label className="col-md-3 custom-personal-row-title">
                    Area
                  </label>
                  <label className="col-md-9 custom-personal-row-value text-wrap">
                    {Array.isArray((franchise as any).area_name)
                      ? (franchise as any).area_name.join(", ")
                      : (franchise as any).area_name ??
                        franchise.area_id ??
                        "-"}
                  </label>
                </div>
                <div className="row custom-personal-row">
                  <label className="col-md-3 custom-personal-row-title">
                    Status
                  </label>
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
                  <div className="custom-personal-row-title mb-2">
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
                          <tr
                            className=""
                            style={{ borderColor: "var(--lb1-border)" }}
                          >
                            <th
                              scope="col"
                              className="fw-semibold  py-2 ps-3 pe-0"
                              style={{
                                width: "22%",
                                minWidth: "120px",
                                color: "var(--primary-txt-color)",
                              }}
                            >
                              Category
                            </th>
                            <th
                              scope="col"
                              className="fw-semibold  py-2 ps-3 pe-0"
                              style={{ color: "var(--primary-txt-color)" }}
                            >
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
                                <div className="text-wrap">
                                  {g.services.length > 0 ? (
                                    <ul className="mb-0 ps-3">
                                      {g.services.map((svcName, si) => (
                                        <li key={`${g.categoryId}-svc-${si}`}>
                                          {svcName}
                                        </li>
                                      ))}
                                    </ul>
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
              <div className="custom-personal-row-title mb-2">
                Description / Notes
              </div>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--txt-color)",
                }}
              >
                {(franchise as any).description ??
                  (franchise as any).desc ??
                  "-"}
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
                  value={areaOptions.filter((area) =>
                    areaIds.includes(area.value)
                  )}
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
                  onChange={(opts) =>
                    handleCategorySelection(opts as OptionType[])
                  }
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
                  onChange={(opts) =>
                    handleServiceSelection(opts as OptionType[])
                  }
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
                  defaultValue={
                    isEditable ? franchise?.is_active?.toString() : "true"
                  }
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
          <Button className="btn-danger" type="submit" form="franchise-form">
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
