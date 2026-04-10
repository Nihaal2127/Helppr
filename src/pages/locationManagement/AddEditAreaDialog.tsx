import React, { useEffect, useRef, useState } from "react";
import { useForm, UseFormRegister, Controller, FieldError } from "react-hook-form";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { AreaModel } from "../../models/AreaModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomFormSelect from "../../components/CustomFormSelect";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { DetailsRow, getStatusOptions } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateArea } from "../../services/areaService";
import { fetchStateDropDown } from "../../services/stateService";
import { fetchCityDropDown } from "../../services/cityService";
import { openDialog } from "../../helper/DialogManager";

type PincodeTagFieldProps = {
    value: string[];
    onChange: (next: string[]) => void;
    onBlur: () => void;
    error?: FieldError;
    placeholder?: string;
    label?: string;
};

const PincodeTagField: React.FC<PincodeTagFieldProps> = ({
    value,
    onChange,
    onBlur,
    error,
    placeholder = "Type pincode and press Enter",
    label = "Pin codes",
}) => {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const mergeNewTokens = (tokens: string[]) => {
        const trimmed = tokens.map((t) => t.trim()).filter(Boolean);
        if (!trimmed.length) return;
        const seen = new Set(value);
        const next = [...value];
        for (const t of trimmed) {
            if (seen.has(t)) continue;
            seen.add(t);
            next.push(t);
        }
        if (next.length !== value.length) {
            onChange(next);
        }
        setDraft("");
    };

    const addDraftAsTag = () => {
        if (!draft.trim()) return;
        mergeNewTokens([draft]);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addDraftAsTag();
        } else if (e.key === "Backspace" && !draft && value.length > 0) {
            e.preventDefault();
            onChange(value.slice(0, -1));
        }
    };

    const removeAt = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <Form.Group as="div" controlId="pincode">
            {label?.trim() && <Form.Label className="fw-medium">{label}</Form.Label>}
            <div
                className={`area-pincode-tag-field${error ? " is-invalid" : ""}`}
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="area-pincode-tag">
                        <span className="area-pincode-tag__text">{tag}</span>
                        <button
                            type="button"
                            className="area-pincode-tag__remove"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={(ev) => {
                                ev.stopPropagation();
                                removeAt(i);
                            }}
                            aria-label={`Remove ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="area-pincode-tag-field__input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => {
                        if (draft.trim()) {
                            addDraftAsTag();
                        }
                        onBlur();
                    }}
                    onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (text.includes(",") || text.includes("\n")) {
                            e.preventDefault();
                            mergeNewTokens(text.split(/[,\n]+/));
                        }
                    }}
                    placeholder={value.length === 0 ? placeholder : ""}
                />
            </div>
            {error && (
                <Form.Control.Feedback type="invalid" style={{ display: "block" }}>
                    {error.message}
                </Form.Control.Feedback>
            )}
        </Form.Group>
    );
};

type Props = {
    isEditable: boolean;
    isViewMode?: boolean;
    area: AreaModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const parseAreaPincodesArray = (row: AreaModel | null): string[] => {
    if (!row) return [];
    const raw = (row as any)?.pincodes ?? (row as any)?.pincode ?? (row as any)?.pin_codes ?? [];
    const parts: string[] = Array.isArray(raw)
        ? raw.map(String)
        : typeof raw === "string"
          ? raw.split(",")
          : [];
    const seen = new Set<string>();
    return parts
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => {
            if (seen.has(p)) return false;
            seen.add(p);
            return true;
        });
};

const formatAreaPincodesDisplay = (row: AreaModel | null): string => {
    const normalized = parseAreaPincodesArray(row);
    return normalized.length ? normalized.join(", ") : "-";
};

const AddEditAreaDialog: React.FC<Props> & {
    show: (
        isEditable: boolean,
        area: AreaModel | null,
        onRefreshData: () => void,
        isViewMode?: boolean
    ) => void;
} = ({ isEditable, isViewMode = false, area, onClose, onRefreshData }) => {
    const [localViewMode, setLocalViewMode] = useState(isViewMode);

    type AreaFormValues = {
        state_id: string;
        city_id: string;
        name: string;
        pincode: string[];
        is_active: boolean | string;
    };

    const initialPincodes = parseAreaPincodesArray(area);

    const [states, setStates] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCities] = useState<{ value: string; label: string; state_id?: string }[]>([]);
    const [selectedStateId, setSelectedStateId] = useState<string>("");

    const fetchRef = useRef(false);
    const initStateFromCityRef = useRef(false);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<AreaFormValues>({
        defaultValues: {
            name: area?.name || "",
            state_id: "",
            city_id: area?.city_id || "",
            pincode: initialPincodes,
            is_active: area?.is_active ?? true,
        },
    });

    const fetchStatesFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const stateOptions = await fetchStateDropDown();
            setStates(stateOptions);
        } finally {
            fetchRef.current = false;
        }
    };

    const fetchCitiesForState = async (stateIdList: string[]) => {
        const cityOptions = await fetchCityDropDown(stateIdList);
        setCities(cityOptions);
    };

    useEffect(() => {
        fetchStatesFromApi();
    }, []);

    // If editing, infer state selection from the provided city_id
    useEffect(() => {
        const init = async () => {
            if (!isEditable || !area?.city_id) return;
            if (states.length === 0) return;
            if (initStateFromCityRef.current) return;

            initStateFromCityRef.current = true;

            // Fetch cities for all states so we can infer which state owns the city.
            const allStateIds = states.map((s) => s.value);
            const allCities = await fetchCityDropDown(allStateIds);
            const matchedCity: any = allCities.find((c: any) => c.value === area.city_id);

            if (matchedCity?.state_id) {
                setSelectedStateId(matchedCity.state_id);
                setValue("state_id", matchedCity.state_id);
                await fetchCitiesForState([matchedCity.state_id]);
            } else {
                setCities(allCities as any);
            }

            setValue("city_id", area.city_id);
        };

        init();
    }, [isEditable, area?.city_id, states, setValue]);

    useEffect(() => {
        if (localViewMode || !isEditable || !area) return;
        setValue("name", area.name || "");
        if (area.is_active !== undefined) {
            setValue("is_active", area.is_active);
        }
        setValue("pincode", parseAreaPincodesArray(area));
    }, [localViewMode, isEditable, area, setValue]);

    const handleStateChange = async (e: any) => {
        const value = e.target.value as string;
        setSelectedStateId(value);
        setValue("state_id", value);

        setCities([]);
        setValue("city_id", "");

        if (!value) return;
        await fetchCitiesForState([value]);
    };

    const onSubmitEvent = async (data: AreaFormValues) => {
        const pinCodes = (data.pincode || []).map((p) => p.trim()).filter(Boolean);

        const payload = {
            name: data.name,
            state_id: data.state_id,
            city_id: data.city_id,
            pincodes: pinCodes,
            is_active: data.is_active,
        };

        let response;

        if (isEditable) {
            if (!area?._id) {
                showErrorAlert("Unable to update. ID missing.");
                return;
            }
            response = await createOrUpdateArea(payload, true, area._id);
        } else {
            response = await createOrUpdateArea(payload, false);
        }

        if (response) {
            onClose();
            onRefreshData();
        }
    };

    const areaStateLabel =
        (area as any)?.state_name ||
        states.find((s) => s.value === (area as any)?.state_id)?.label ||
        (area as any)?.state_id ||
        "-";

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {localViewMode ? "Area Details" : isEditable ? "Edit Area" : "Add Area"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0">
                {localViewMode && area ? (
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Area Information</h3>
                            <i
                                className="bi bi-pencil-fill fs-6 text-danger"
                                style={{ cursor: "pointer" }}
                                role="button"
                                aria-label="Edit area"
                                onClick={() => setLocalViewMode(false)}
                            />
                        </div>

                        <div className="row">
                            <div className="col-md-12 custom-helper-column">
                                <DetailsRow title="Area Name" value={area.name ?? "-"} />
                                <DetailsRow title="State" value={areaStateLabel} />
                                <DetailsRow title="City" value={area.city_name ?? "-"} />
                                <DetailsRow title="Pin codes" value={formatAreaPincodesDisplay(area)} />
                                <DetailsRow
                                    title="Status"
                                    value={area.is_active ? "Active" : "Inactive"}
                                />
                            </div>
                        </div>

                    </section>
                ) : (
                    <form
                        noValidate
                        name="profile-form"
                        id="profile-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <CustomFormSelect
                                label="State"
                                controlId="state"
                                options={states}
                                register={register as unknown as UseFormRegister<any>}
                                fieldName="state_id"
                                error={errors.state_id}
                                asCol={false}
                                requiredMessage="Please select state"
                                defaultValue={selectedStateId}
                                setValue={setValue as (name: string, value: any) => void}
                                onChange={handleStateChange}
                            />

                            <CustomFormSelect
                                label="City"
                                controlId="city"
                                options={cities}
                                register={register as unknown as UseFormRegister<any>}
                                fieldName="city_id"
                                error={errors.city_id}
                                asCol={false}
                                requiredMessage="Please select city"
                                defaultValue={isEditable ? area?.city_id || "" : ""}
                                setValue={setValue as (name: string, value: any) => void}
                            />

                            <CustomFormInput
                                label="Area"
                                controlId="name"
                                placeholder="Enter Area"
                                register={register}
                                error={errors.name}
                                asCol={false}
                                validation={{ required: "Area is required" }}
                            />

                            <Controller<AreaFormValues, "pincode">
                                name="pincode"
                                control={control}
                                rules={{
                                    validate: (value) => {
                                        return (Array.isArray(value) && value.length > 0) || "Pincode is required";
                                    },
                                }}
                                render={({ field, fieldState }) => (
                                    <PincodeTagField
                                        label="Pin codes"
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        error={fieldState.error}
                                        placeholder="Type pincode and press Enter"
                                    />
                                )}
                            />

                            <CustomRadioSelection
                                label="Status"
                                name="is_active"
                                options={getStatusOptions()}
                                defaultValue={isEditable ? area?.is_active?.toString() : "true"}
                                isEditable={isEditable}
                                setValue={setValue}
                            />
                        </Row>

                        <Row className="mt-4">
                            <Col xs={12} className="text-center d-flex justify-content-end gap-3 ">
                                <Button type="submit" className="custom-btn-primary">
                                    {isEditable ? "Update" : "Add"}
                                </Button>
                             
                                <Button className="custom-btn-secondary" onClick={onClose}>Cancel</Button>
                            </Col>
                        </Row>
                    </form>
                )}
            </Modal.Body>
        </Modal>
    );
};

AddEditAreaDialog.show = (
    isEditable: boolean,
    area: AreaModel | null,
    onRefreshData: () => void,
    isViewMode: boolean = false
) => {
    openDialog("details-modal", (close) => (
        <AddEditAreaDialog
            isEditable={isEditable}
            isViewMode={isViewMode}
            area={area}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditAreaDialog;