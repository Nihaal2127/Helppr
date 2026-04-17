export type ViewCategoryServicesGroup = {
    categoryId: string;
    categoryLabel: string;
    services: string[];
};

type OptionType = { value: string; label: string };

type ServiceLite = {
    _id: string;
    name: string;
    category_id: string;
    category_name?: string;
};

const UNCATEGORIZED_KEY = "__uncategorized__";
const FLAT_SERVICES_KEY = "__services_flat__";

export type PartnerCategoryViewSource = {
    category_ids?: string[] | null;
    service_ids?: string[] | null;
    category_names?: string[] | null;
    service_names?: string[] | null;
};

/** One row per category with services (same rules as franchise view). */
export function buildViewCategoryServiceGroups(
    source: PartnerCategoryViewSource | null | undefined,
    allServices: ServiceLite[],
    categoryOptions: OptionType[]
): ViewCategoryServicesGroup[] {
    if (!source) return [];

    const svcIds = (source.service_ids ?? []).map(String);
    const svcNames = source.service_names;
    const catIdsOrder = (source.category_ids ?? []).map(String);
    const catNames = source.category_names;

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

    if (built.length === 0 && Array.isArray(catNames) && catNames.length > 0 && svcIds.length === 0) {
        return catNames.map((label, i) => ({
            categoryId: `cat-name-${i}`,
            categoryLabel: String(label),
            services: [],
        }));
    }

    return built;
}
