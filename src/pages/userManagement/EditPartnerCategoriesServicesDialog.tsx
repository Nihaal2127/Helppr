import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { UserModel } from "../../models/UserModel";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import { createOrUpdateUser } from "../../services/userService";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";
import { showErrorAlert } from "../../helper/alertHelper";

const PARTNER_ROLE = 2;

type OptionType = { value: string; label: string };

type ServiceLite = {
    _id: string;
    name: string;
    category_id: string;
    category_name?: string;
};

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

export type EditPartnerCategoriesServicesDialogProps = {
    user: UserModel;
    initialCategoryIds: string[];
    initialServiceIds: string[];
    onClose: () => void;
    onSaved: (categoryIds: string[], serviceIds: string[]) => void;
};

function EditPartnerCategoriesServicesDialogView({
    user,
    initialCategoryIds,
    initialServiceIds,
    onClose,
    onSaved,
}: EditPartnerCategoriesServicesDialogProps) {
    const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
    const [allServices, setAllServices] = useState<ServiceLite[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>(() => [...initialCategoryIds]);
    const [serviceIds, setServiceIds] = useState<string[]>(() => [...initialServiceIds]);
    const [saving, setSaving] = useState(false);

    const cityId = user.city_id ?? "";

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const svcRes = await fetchService(1, 500, {});
                if (cancelled) return;
                const list = svcRes?.response && Array.isArray(svcRes.services) ? svcRes.services : [];
                setAllServices(
                    list.map((s) => ({
                        _id: String((s as { _id?: string })._id ?? ""),
                        name: String((s as { name?: string }).name ?? ""),
                        category_id: String((s as { category_id?: string }).category_id ?? ""),
                        category_name: (s as { category_name?: string }).category_name
                            ? String((s as { category_name?: string }).category_name)
                            : undefined,
                    }))
                );
            } catch {
                if (!cancelled) setAllServices([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const cats = await fetchCategoryDropDown(cityId || undefined);
                if (cancelled) return;
                const catList = Array.isArray(cats) ? cats.filter((c: OptionType) => c?.value) : [];
                setCategoryOptions([{ value: "select-all", label: "Select All" }, ...catList]);
            } catch {
                if (!cancelled) setCategoryOptions([{ value: "select-all", label: "Select All" }]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [cityId]);

    const serviceOptions = useMemo(
        () => [
            { value: "select-all", label: "Select All" },
            ...allServices
                .filter((svc) =>
                    categoryIds.length === 0 ? false : categoryIds.includes(String(svc.category_id))
                )
                .map((s) => ({ value: s._id, label: s.name })),
        ],
        [allServices, categoryIds]
    );

    const selectedCategoryOptions = useMemo(
        () => categoryOptions.filter((c) => categoryIds.includes(c.value)),
        [categoryOptions, categoryIds]
    );

    const selectedServiceOptions = useMemo(
        () => serviceOptions.filter((s) => serviceIds.includes(s.value)),
        [serviceOptions, serviceIds]
    );

    const handleCategorySelection = useCallback(
        (selectedOptions: OptionType[]) => {
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
        },
        [allServices, categoryIds, categoryOptions]
    );

    const handleServiceSelection = useCallback((selectedOptions: OptionType[]) => {
        const selectedIds = parseMultiSelectIds(selectedOptions, serviceOptions);
        setServiceIds(selectedIds);
    }, [serviceOptions]);

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

    const handleSave = async () => {
        if (!user.city_id) {
            showErrorAlert("Partner must have a city before editing categories and services.");
            return;
        }
        if (categoryIds.length === 0) {
            showErrorAlert("Please select at least one category.");
            return;
        }
        if (serviceIds.length === 0) {
            showErrorAlert("Please select at least one service.");
            return;
        }
        if (!user._id) {
            showErrorAlert("Unable to update. ID is missing.");
            return;
        }

        const payload: Record<string, unknown> = {
            type: PARTNER_ROLE,
            is_from_web: true,
            registration_type: 1,
            created_by_id: getLocalStorage(AppConstant.createdById),
            name: user.name ?? "",
            email: user.email ?? "",
            phone_number: user.phone_number ?? "",
            address: user.address ?? "",
            state_id: user.state_id ?? "",
            city_id: user.city_id ?? "",
            is_active: user.is_active ?? true,
            pincode: user.pincode ?? "",
            category_ids: categoryIds,
            service_ids: serviceIds,
            ...(user.profile_url && { profile_url: user.profile_url }),
        };

        setSaving(true);
        try {
            const ok = await createOrUpdateUser(payload, true, user._id);
            if (ok) {
                onSaved(categoryIds, serviceIds);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered size="xl" enforceFocus={false} dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Edit categories &amp; services
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <section className="custom-other-details" style={{ padding: "10px" }}>
                    <h3 className="mb-2">Categories and services</h3>
                    <Row>
                        <Col xs={12} md={6}>
                            <CustomMultiSelect
                                label="Categories"
                                controlId="categories"
                                options={categoryOptions}
                                value={selectedCategoryOptions}
                                onChange={(opts) => handleCategorySelection(opts as OptionType[])}
                                asCol={false}
                                menuPortal
                                selectedChipsMaxHeight="120px"
                            />
                        </Col>
                        <Col xs={12} md={6}>
                            <CustomMultiSelect
                                label="Services"
                                controlId="services"
                                options={serviceOptions}
                                value={selectedServiceOptions}
                                onChange={(opts) => handleServiceSelection(opts as OptionType[])}
                                asCol={false}
                                menuPortal
                                selectedChipsMaxHeight="180px"
                            />
                        </Col>
                    </Row>
                </section>
                <Row className="mt-4">
                    <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                        <Button type="button" className="custom-btn-primary" disabled={saving} onClick={() => void handleSave()}>
                            Save
                        </Button>
                        <Button type="button" className="custom-btn-secondary" disabled={saving} onClick={onClose}>
                            Cancel
                        </Button>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
}

export default EditPartnerCategoriesServicesDialogView;
