import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Row, Col, Form, InputGroup } from "react-bootstrap";
import Select from "react-select";
import type { SingleValue } from "react-select";
import CustomCloseButton from "../../components/CustomCloseButton";
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

export type PartnerServiceRow = {
    id: string;
    serviceId: string;
    description: string;
    price: string;
};

export type PartnerCategoryBlock = {
    id: string;
    categoryId: string;
    serviceRows: PartnerServiceRow[];
};

function newId(): string {
    return `pcl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyServiceRow(): PartnerServiceRow {
    return { id: newId(), serviceId: "", description: "", price: "" };
}

function emptyBlock(initialCategoryId: string): PartnerCategoryBlock {
    return {
        id: newId(),
        categoryId: initialCategoryId,
        serviceRows: [emptyServiceRow()],
    };
}

/** Same react-select look as `CustomFormSelect` (portal menu for modals). */
const partnerModalSelectStyles = {
    control: (provided: Record<string, unknown>) => ({
        ...provided,
        borderColor: "var(--primary-color)",
        boxShadow: "none",
        borderRadius: "8px",
        fontSize: "14px",
        minHeight: "38px",
        height: "38px",
        backgroundColor: "var(--bg-color)",
        fontFamily: "'Inter', sans-serif",
        color: "var(--content-txt-color)",
        marginBottom: 0,
        cursor: "pointer",
        "&:hover": { borderColor: "var(--primary-color)" },
    }),
    valueContainer: (provided: Record<string, unknown>) => ({
        ...provided,
        paddingTop: 2,
        paddingBottom: 2,
    }),
    option: (provided: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? "var(--txtfld-border)"
            : state.isFocused
              ? "var(--primary-color)"
              : "",
        color: state.isSelected || state.isFocused ? "var(--bg-color)" : "var(--primary-color)",
        cursor: "pointer",
        fontSize: "14px",
    }),
    singleValue: (provided: Record<string, unknown>) => ({
        ...provided,
        color: "var(--content-txt-color)",
    }),
    placeholder: (provided: Record<string, unknown>) => ({
        ...provided,
        fontSize: "14px",
        color: "var(--placeholder-txt)",
        fontFamily: "Inter, sans-serif",
    }),
    menuPortal: (provided: Record<string, unknown>) => ({ ...provided, zIndex: 9999 }),
    menu: (provided: Record<string, unknown>) => ({ ...provided, zIndex: 9999 }),
    indicatorsContainer: (provided: Record<string, unknown>) => ({ ...provided, height: "36px" }),
};

type PartnerSingleSelectProps = {
    instanceId: string;
    label: string;
    options: OptionType[];
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
};

function PartnerSingleSelect({ instanceId, label, options, value, onChange, placeholder }: PartnerSingleSelectProps) {
    const selected = useMemo(
        () => options.find((o) => String(o.value) === String(value)) ?? null,
        [options, value]
    );

    return (
        <Form.Group controlId={instanceId}>
            {label ? <Form.Label className="fw-medium mb-1">{label}</Form.Label> : null}
            <Select<OptionType, false>
                instanceId={instanceId}
                inputId={`${instanceId}-input`}
                className="react-select react-select-container"
                classNamePrefix="react-select"
                isMulti={false}
                isClearable={false}
                isSearchable
                options={options}
                value={selected}
                placeholder={placeholder}
                onChange={(opt: SingleValue<OptionType>) => {
                    const v = opt?.value;
                    onChange(v !== undefined && v !== null ? String(v) : "");
                }}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                menuPosition="fixed"
                styles={partnerModalSelectStyles}
            />
        </Form.Group>
    );
}

export type EditPartnerCategoriesServicesDialogProps = {
    user: UserModel;
    initialCategoryIds: string[];
    initialServiceIds: string[];
    onClose: () => void;
    onSaved: (categoryIds: string[], serviceIds: string[]) => void;
};

/** Group flat `service_ids` into blocks: consecutive services with the same category share one block. */
function buildBlocksFromInitial(
    serviceIds: string[],
    allServices: ServiceLite[],
    user: UserModel,
    initialCategoryIds: string[]
): PartnerCategoryBlock[] {
    if (serviceIds.length === 0) {
        return [emptyBlock(initialCategoryIds[0] ?? "")];
    }

    const blocks: PartnerCategoryBlock[] = [];
    let flatIndex = 0;

    for (const sid of serviceIds) {
        const svc = allServices.find((s) => String(s._id) === String(sid));
        const cid = svc ? String(svc.category_id) : initialCategoryIds[0] ?? "";
        const row: PartnerServiceRow = {
            id: newId(),
            serviceId: String(sid),
            description: String(user.service_descriptions?.[flatIndex] ?? ""),
            price:
                user.service_prices?.[flatIndex] !== undefined && user.service_prices?.[flatIndex] !== null
                    ? String(user.service_prices[flatIndex])
                    : "",
        };
        flatIndex++;

        const last = blocks[blocks.length - 1];
        if (last && String(last.categoryId) === String(cid) && cid) {
            last.serviceRows.push(row);
        } else {
            blocks.push({ id: newId(), categoryId: cid, serviceRows: [row] });
        }
    }

    return blocks.length > 0 ? blocks : [emptyBlock(initialCategoryIds[0] ?? "")];
}

function EditPartnerCategoriesServicesDialogView({
    user,
    initialCategoryIds,
    initialServiceIds,
    onClose,
    onSaved,
}: EditPartnerCategoriesServicesDialogProps) {
    const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
    const [allServices, setAllServices] = useState<ServiceLite[]>([]);
    const [blocks, setBlocks] = useState<PartnerCategoryBlock[]>([]);
    const [saving, setSaving] = useState(false);

    const cityId = user.city_id ?? "";
    const didInit = useRef(false);

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

    const categorySelectOptions = useMemo((): OptionType[] => {
        const rest = categoryOptions.filter((c) => c.value !== "select-all");
        return [{ value: "", label: "Select category" }, ...rest];
    }, [categoryOptions]);

    const serviceOptionsForCategory = useCallback(
        (categoryId: string): OptionType[] => {
            if (!categoryId) {
                return [{ value: "", label: "Select category first" }];
            }
            const list = allServices
                .filter((svc) => String(svc.category_id) === String(categoryId))
                .map((s) => ({ value: s._id, label: s.name }));
            return [{ value: "", label: "Select service" }, ...list];
        },
        [allServices]
    );

    useEffect(() => {
        if (didInit.current) return;
        if (initialServiceIds.length > 0 && allServices.length === 0) return;

        didInit.current = true;
        setBlocks(buildBlocksFromInitial(initialServiceIds, allServices, user, initialCategoryIds));
    }, [allServices, initialServiceIds, initialCategoryIds, user.service_descriptions, user.service_prices]);

    const addCategoryBlock = useCallback(() => {
        setBlocks((prev) => [...prev, emptyBlock("")]);
    }, []);

    const removeCategoryBlock = useCallback((blockId: string) => {
        setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== blockId)));
    }, []);

    const updateBlockCategory = useCallback((blockId: string, categoryId: string) => {
        setBlocks((prev) =>
            prev.map((b) =>
                b.id === blockId
                    ? {
                          ...b,
                          categoryId,
                          serviceRows: b.serviceRows.map((r) => ({ ...r, serviceId: "" })),
                      }
                    : b
            )
        );
    }, []);

    const addServiceRow = useCallback((blockId: string) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === blockId ? { ...b, serviceRows: [...b.serviceRows, emptyServiceRow()] } : b))
        );
    }, []);

    const updateServiceRow = useCallback(
        (blockId: string, rowId: string, patch: Partial<Omit<PartnerServiceRow, "id">>) => {
            setBlocks((prev) =>
                prev.map((b) =>
                    b.id !== blockId
                        ? b
                        : {
                              ...b,
                              serviceRows: b.serviceRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
                          }
                )
            );
        },
        []
    );

    const removeServiceRow = useCallback((blockId: string, rowId: string) => {
        setBlocks((prev) =>
            prev.map((b) => {
                if (b.id !== blockId) return b;
                if (b.serviceRows.length <= 1) {
                    return b;
                }
                return { ...b, serviceRows: b.serviceRows.filter((r) => r.id !== rowId) };
            })
        );
    }, []);

    const handleSave = async () => {
        if (!user.city_id) {
            showErrorAlert("Partner must have a city before editing categories and services.");
            return;
        }
        if (!user._id) {
            showErrorAlert("Unable to update. ID is missing.");
            return;
        }

        type FlatRow = { categoryId: string; serviceId: string; description: string; price: string };
        const flat: FlatRow[] = [];
        for (const b of blocks) {
            for (const r of b.serviceRows) {
                flat.push({
                    categoryId: b.categoryId,
                    serviceId: r.serviceId,
                    description: r.description,
                    price: r.price,
                });
            }
        }

        const meaningful = flat.filter(
            (x) =>
                x.categoryId ||
                x.serviceId ||
                x.description.trim() !== "" ||
                x.price.trim() !== ""
        );

        for (const x of meaningful) {
            if (!x.categoryId || !x.serviceId) {
                showErrorAlert("Each filled row needs a category and a service (check every block).");
                return;
            }
        }

        if (meaningful.length === 0) {
            showErrorAlert("Add at least one category with a service, description, and price.");
            return;
        }

        const categoryIdsOrdered: string[] = [];
        for (const x of meaningful) {
            if (!categoryIdsOrdered.includes(x.categoryId)) {
                categoryIdsOrdered.push(x.categoryId);
            }
        }

        const serviceIds = meaningful.map((x) => x.serviceId);
        const serviceDescriptions = meaningful.map((x) => x.description.trim());
        const servicePrices = meaningful.map((x) => x.price.trim());
        const serviceNames = meaningful.map(
            (x) => allServices.find((s) => String(s._id) === x.serviceId)?.name ?? ""
        );

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
            category_ids: categoryIdsOrdered,
            service_ids: serviceIds,
            service_names: serviceNames,
            service_descriptions: serviceDescriptions,
            service_prices: servicePrices,
            ...(user.profile_url && { profile_url: user.profile_url }),
        };

        setSaving(true);
        try {
            const ok = await createOrUpdateUser(payload, true, user._id);
            if (ok) {
                onSaved(categoryIdsOrdered, serviceIds);
            }
        } finally {
            setSaving(false);
        }
    };

    const controlStyle: React.CSSProperties = {
        borderRadius: "8px",
        borderColor: "var(--primary-color)",
        fontSize: "14px",
        backgroundColor: "var(--bg-color)",
        color: "var(--content-txt-color)",
        minHeight: "38px",
    };

    /** Outlined circle — matches modal title (`.custom-modal-title` uses `var(--navi-color)`). */
    const outlineAddBtn: React.CSSProperties = {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "1px solid green",
        backgroundColor: "transparent",
        color: "green",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "none",
        padding: 0,
        transition: "background-color 0.15s ease, filter 0.15s ease",
    };

    const outlineDeleteBtn: React.CSSProperties = {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "1px solid var(--navi-color)",
        backgroundColor: "transparent",
        color: "var(--navi-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: "none",
        padding: 0,
        transition: "background-color 0.15s ease, filter 0.15s ease",
    };

    const hoverIconBtn = (e: React.MouseEvent<HTMLButtonElement>, on: boolean) => {
        (e.currentTarget as HTMLButtonElement).style.filter = on ? "brightness(0.94)" : "";
    };

    return (
        <Modal
            show={true}
            onHide={onClose}
            centered
            size="xl"
            enforceFocus={false}
            dialogClassName="custom-big-modal edit-partner-catalog-modal-vh"
        >
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    Edit categories &amp; services
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                <section className="custom-other-details" style={{ padding: "10px" }}>
                    <h3 className="mb-2">Categories and services</h3>
                  
                    {blocks.map((block) => (
                        <div
                            key={block.id}
                            className="rounded-3 border px-3 py-3 mb-4"
                            style={{
                                borderColor: "var(--lb1-border)",
                                backgroundColor: "var(--bg-color)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                            }}
                        >
                            <Row className="g-3 align-items-end mb-3">
                                <Col xs={12} md>
                                    <PartnerSingleSelect
                                        instanceId={`${block.id}-category`}
                                        label="Category"
                                        options={categorySelectOptions}
                                        value={block.categoryId}
                                        placeholder="Select category"
                                        onChange={(cid) => updateBlockCategory(block.id, cid)}
                                    />
                                </Col>
                                <Col xs="auto" className="d-flex align-items-end gap-2 pb-1">
                                    <button
                                        type="button"
                                        title="Add another category block"
                                        aria-label="Add another category block"
                                        style={outlineAddBtn}
                                        onClick={addCategoryBlock}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onMouseEnter={(e) => hoverIconBtn(e, true)}
                                        onMouseLeave={(e) => hoverIconBtn(e, false)}
                                    >
                                        <i className="bi bi-plus fs-6" aria-hidden />
                                    </button>
                                    {blocks.length > 1 ? (
                                        <button
                                            type="button"
                                            title="Remove this category block"
                                            aria-label="Remove this category block"
                                            style={outlineDeleteBtn}
                                            onClick={() => removeCategoryBlock(block.id)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onMouseEnter={(e) => hoverIconBtn(e, true)}
                                            onMouseLeave={(e) => hoverIconBtn(e, false)}
                                        >
                                            <i className="bi bi-trash fs-6" aria-hidden />
                                        </button>
                                    ) : null}
                                </Col>
                            </Row>

                            {block.serviceRows.map((row) => (
                                <Row key={row.id} className="g-3 align-items-start mb-2">
                                    <Col xs={12} md={3} lg={3}>
                                        <PartnerSingleSelect
                                            instanceId={`${block.id}-${row.id}-service`}
                                            label="Service"
                                            options={serviceOptionsForCategory(block.categoryId)}
                                            value={row.serviceId}
                                            placeholder="Select service"
                                            onChange={(sid) => updateServiceRow(block.id, row.id, { serviceId: sid })}
                                        />
                                    </Col>
                                    <Col xs={12} md={5} lg={6}>
                                        <Form.Group controlId={`desc-${block.id}-${row.id}`}>
                                            <Form.Label className="fw-medium mb-1">Description</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={1}
                                                className="custom-form-input"
                                                style={{ ...controlStyle, resize: "vertical" }}
                                                placeholder="Describe this offering"
                                                value={row.description}
                                                onChange={(e) =>
                                                    updateServiceRow(block.id, row.id, { description: e.target.value })
                                                }
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col xs={12} md={2} lg={2}>
                                        <Form.Group controlId={`price-${block.id}-${row.id}`}>
                                            <Form.Label className="fw-medium mb-1">Price</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text
                                                    className="custom-form-input text-muted"
                                                    style={{
                                                        ...controlStyle,
                                                        borderTopRightRadius: 0,
                                                        borderBottomRightRadius: 0,
                                                        fontWeight: 600,
                                                      }}
                                                >
                                                    {AppConstant.currencySymbol}
                                                </InputGroup.Text>
                                                <Form.Control
                                                    type="text"
                                                    inputMode="decimal"
                                                    className="custom-form-input border-start-0"
                                                    style={{
                                                        ...controlStyle,
                                                        borderLeft: 0,
                                                        borderTopLeftRadius: 0,
                                                        borderBottomLeftRadius: 0,
                                                    }}
                                                    placeholder="e.g. 499"
                                                    value={row.price}
                                                    onChange={(e) =>
                                                        updateServiceRow(block.id, row.id, { price: e.target.value })
                                                    }
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                    <Col
                                        xs={12}
                                        
                                        className="d-flex flex-row align-items-end justify-content-end gap-2 pt-2 pt-md-4 col-lg-auto"
                                    >
                                        <button
                                            type="button"
                                            title="Add another service in this category"
                                            aria-label="Add another service in this category"
                                            style={outlineAddBtn}
                                            onClick={() => addServiceRow(block.id)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onMouseEnter={(e) => hoverIconBtn(e, true)}
                                            onMouseLeave={(e) => hoverIconBtn(e, false)}
                                        >
                                            <i className="bi bi-plus fs-6" aria-hidden />
                                        </button>
                                        {block.serviceRows.length > 1 ? (
                                            <button
                                                type="button"
                                                title="Remove this service row"
                                                aria-label="Remove this service row"
                                                style={outlineDeleteBtn}
                                                onClick={() => removeServiceRow(block.id, row.id)}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onMouseEnter={(e) => hoverIconBtn(e, true)}
                                                onMouseLeave={(e) => hoverIconBtn(e, false)}
                                            >
                                                <i className="bi bi-trash fs-6" aria-hidden />
                                            </button>
                                        ) : null}
                                    </Col>
                                </Row>
                            ))}
                        </div>
                    ))}
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
