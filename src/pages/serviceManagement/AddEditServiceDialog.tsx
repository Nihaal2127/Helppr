import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ServiceModel } from "../../models/ServiceModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions } from "../../helper/utility";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateService } from "../../services/servicesService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { openDialog } from "../../helper/DialogManager";
import { DetailsRow, FullDetailsRow } from "../../helper/utility";
import { AppConstant } from "../../constant/AppConstant";

type AddEditServiceDialogProps = {
    isEditable: boolean;
    service: ServiceModel | null;
    onClose: () => void;
    onRefreshData: () => void;
    isViewMode?: boolean;
};

const AddEditServiceDialog: React.FC<AddEditServiceDialogProps> & {
    show: (
        isEditable: boolean,
        service: ServiceModel | null,
        onRefreshData: () => void,
        isViewMode?: boolean
    ) => void;
} = ({ isEditable, service, onClose, onRefreshData, isViewMode = false }) => {
    const [localViewMode, setLocalViewMode] = useState(isViewMode);

    useEffect(() => {
        setLocalViewMode(isViewMode);
    }, [isViewMode, service?._id]);

    const {
        register,
        handleSubmit,
        setValue,
        
        formState: { errors },
    } = useForm<ServiceModel>({
        defaultValues: {
            name: service?.name || "",
            desc: service?.desc || "",
            // Keep numeric inputs empty in add mode so placeholders stay visible.
            price: (service?.price ?? "") as any,
            tax: ((service as any)?.tax ?? "") as any,
            commission: ((service as any)?.commission ?? "") as any,
            min_deposit_type: (service as any)?.min_deposit_type || "",
            min_deposit_value: ((service as any)?.min_deposit_value ?? "") as any,
            is_active: service?.is_active ?? true,
            category_id: service?.category_id || "",
        } as any,
    });

    const [categories, setCategory] = useState<{ value: string; label: string }[]>([]);
    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const [stateIds, setStateIds] = useState<string[]>([]);
    const [cityIds, setCityIds] = useState<string[]>([]);
    const fetchRef = useRef(false);
    const fetchCityRef = useRef(false);

    // const depositType = watch("min_deposit_type");
    const categoryLabelForView =
        service?.category_id &&
        categories.find((c) => c.value === service.category_id)?.label;

    const stateLabelsForView = stateIds
        .map((id) => states.find((s) => s.value === id)?.label)
        .filter(Boolean) as string[];

    const cityLabelsForView = cityIds
        .map((id) => cities.find((c) => c.value === id)?.label)
        .filter(Boolean) as string[];

    const minDepositValueForView =
        service?.min_deposit_type === "per_consultancy" && service.min_deposit_value !== undefined
            ? `${service.min_deposit_value}`
            : "";

    const minDepositLabelForView =
        service?.min_deposit_type
            ? service.min_deposit_type +
              (service.min_deposit_type === "per_consultancy" && minDepositValueForView
                  ? ` (${minDepositValueForView})`
                  : "")
            : "-";

    const fetchCityFromApi = useCallback(async (stateIdList: string[]) => {
        if (fetchCityRef.current) return;
        fetchCityRef.current = true;

        try {
            const cityOptions = await fetchCityDropDown(stateIdList);
            setCity([{ value: "select-all", label: "Select All" }, ...cityOptions]);
        } finally {
            fetchCityRef.current = false;
        }
    }, []);

    const fetchDataFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;

        try {
            const categoryOptions = await fetchCategoryDropDown();
            setCategory(categoryOptions);

            const stateOptions = await fetchStateDropDown();
            setState([{ value: "select-all", label: "Select All" }, ...stateOptions]);

            if (isEditable && service) {
                setStateIds(service.state_ids || []);
                setCityIds(service.city_ids || []);

                if ((service.state_ids || []).length > 0) {
                    await fetchCityFromApi(service.state_ids || []);
                }
            }
        } finally {
            fetchRef.current = false;
        }
    }, [isEditable, service, fetchCityFromApi]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    const handleStateSelection = async (
        selectedOptions: { value: string; label: string }[]
    ) => {
        const isSelectAllSelected = selectedOptions.some(
            (option) => option.value === "select-all"
        );

        let selectedIds: string[] = [];

        if (isSelectAllSelected) {
            const allStates = states.filter((state) => state.value !== "select-all");
            const isAllSelected =
                selectedOptions.length - 1 === allStates.length &&
                allStates.every((state) =>
                    selectedOptions.some((selected) => selected.value === state.value)
                );

            selectedIds = isAllSelected ? [] : allStates.map((state) => state.value);
        } else {
            selectedIds = selectedOptions.map((option) => option.value);
        }

        setStateIds(selectedIds);
        setCity([]);
        setCityIds([]);

        if (selectedIds.length > 0) {
            await fetchCityFromApi(selectedIds);
        }
    };

    const handleCitySelection = (
        selectedOptions: { value: string; label: string }[]
    ) => {
        const isSelectAllSelected = selectedOptions.some(
            (option) => option.value === "select-all"
        );

        let selectedIds: string[] = [];

        if (isSelectAllSelected) {
            const allCities = cities.filter((city) => city.value !== "select-all");
            const isAllSelected =
                selectedOptions.length - 1 === allCities.length &&
                allCities.every((city) =>
                    selectedOptions.some((selected) => selected.value === city.value)
                );

            selectedIds = isAllSelected ? [] : allCities.map((city) => city.value);
        } else {
            selectedIds = selectedOptions.map((option) => option.value);
        }

        setCityIds(selectedIds);
    };

    useEffect(() => {
        if (isEditable && service?.is_active !== undefined) {
            setValue("is_active", service.is_active);
        }
    }, [isEditable, service?.is_active, setValue]);

    useEffect(() => {
        if (service?.category_id && categories.length > 0) {
            const selectedCategory = categories.find(
                (category) => category.value === service.category_id
            );

            if (selectedCategory) {
                setValue("category_id", service.category_id as any, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                });
            }
        }
    }, [categories, service?.category_id, setValue]);

    useEffect(() => {
        if (isEditable && service?.min_deposit_type) {
            setValue("min_deposit_type" as any, (service as any).min_deposit_type, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
            });
        }
    }, [isEditable, service, setValue]);

    const onSubmitEvent = async (data: ServiceModel) => {
        let image_url = "";

        if (fileInputs.length > 0) {
            const formData = new FormData();
            formData.append("type", "2");
            fileInputs.forEach((file) => formData.append("files", file));

            if (isEditable && replaceUrls.length > 0) {
                formData.append("update_file_urls", JSON.stringify(replaceUrls));
            }

            const { response, fileList } = await createOrUpdateDocument(formData, isEditable);

            if (response && fileList.length > 0) {
                image_url = fileList[0].toString();
            }
        }

        if (!isEditable && image_url === "") {
            showErrorAlert("Please select image");
            return;
        }

        const payload = {
            name: data.name,
            desc: data.desc,
            price: Number(data.price),
            tax: Number((data as any).tax),
            commission: Number((data as any).commission),
            min_deposit_type: (data as any).min_deposit_type,
            min_deposit_value:
                (data as any).min_deposit_type === "per_consultancy"
                    ? Number((data as any).min_deposit_value)
                    : 0,
            is_active: data.is_active,
            category_id: data.category_id,
            city_ids: cityIds,
            state_ids: stateIds,
            ...(image_url !== "" && { image_url }),
        };

        let responseService;

        if (isEditable) {
            if (!service?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            responseService = await createOrUpdateService(payload, true, service._id);
        } else {
            responseService = await createOrUpdateService(payload, false);
        }

        if (responseService) {
            onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} size="lg" onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {localViewMode ? "Service Details" : isEditable ? "Edit Service" : "Add Service"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>

            <Modal.Body className="px-4 pb-4 pt-0">
                {localViewMode && service ? (
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Service Information</h3>
                            {isEditable && (
                                <i
                                    className="bi bi-pencil-fill fs-6 text-danger"
                                    style={{ cursor: "pointer" }}
                                    role="button"
                                    aria-label="Edit service"
                                    onClick={() => setLocalViewMode(false)}
                                />
                            )}
                        </div>
                        <div className="row">
                            <div className="col-md-6 custom-helper-column">
                                <FullDetailsRow title="Service ID" value={service.service_id ?? "-"} />
                                <FullDetailsRow title="Category" value={categoryLabelForView ?? service.category_id ?? "-"} />
                                <DetailsRow
                                    title="Price"
                                    value={
                                        service.price !== undefined && service.price !== null
                                            ? `${AppConstant.currencySymbol}${service.price}`
                                            : "-"
                                    }
                                />
                                <FullDetailsRow title="Tax" value={service.tax !== undefined && service.tax !== null ? `${service.tax}${AppConstant.percentageSymbol}` : "-"} />
                                <FullDetailsRow title="Min Deposit" value={minDepositLabelForView} />
                            </div>
                            <div className="col-md-6 custom-helper-column">
                                <FullDetailsRow title="Service Name" value={service.name ?? "-"} />
                                <FullDetailsRow
                                    title="States"
                                    value={stateLabelsForView.length > 0 ? stateLabelsForView.join(", ") : "-"}
                                />
                                 <FullDetailsRow title="Commission" value={service.commission !== undefined && service.commission !== null ? `${service.commission}${AppConstant.percentageSymbol}` : "-"} />

                                <FullDetailsRow
                                    title="Status"
                                    value={service.is_active ? "Active" : "Inactive"}
                                />
                            </div>
                            <div className="col-md-12 custom-helper-column">
                                <Row className="row custom-personal-row">
                                    <label className="col-3 custom-personal-row-title">Description</label>
                                    <label className="col-9 custom-personal-row-value text-wrap">
                                        {service.desc ?? "-"}
                                    </label>
                                </Row>
                                <Row className="row custom-personal-row">
                                    <label className="col-3 custom-personal-row-title">Cities</label>
                                    <label className="col-9 custom-personal-row-value text-wrap">
                                        {cityLabelsForView.length > 0 ? cityLabelsForView.join(", ") : "-"}
                                    </label>
                                </Row>
                            </div>
                            <div className="col-md-12">
                            {service.image_url ? (
                                    <div className="mt-2">
                                        <p className="mb-1" style={{ color: "var(--primary-color)", fontWeight: 600 }}>
                                            Service image
                                        </p>
                                        <img
                                            src={`${AppConstant.IMAGE_BASE_URL}${service.image_url}?t=${Date.now()}`}
                                            alt=""
                                            style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, objectFit: "cover" }}
                                        />
                                    </div>
                                ) : null}
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
                            <Col md={6}>
                                <CustomFormInput
                                    label="Service"
                                    controlId="name"
                                    placeholder="Enter Service Name"
                                    register={register}
                                    error={errors.name}
                                    asCol={false}
                                    validation={{ required: "Service name is required" }}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="Category"
                                    controlId="category"
                                    options={categories}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="category"
                                    error={errors.category_id}
                                    asCol={false}
                                    requiredMessage="Please select category"
                                    defaultValue={isEditable ? service?.category_id : ""}
                                    setValue={(name: string, value: any) => {
                                        setValue(name as any, value, {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                            shouldTouch: true,
                                        });
                                    }}
                                />
                            </Col>

                            <Col md={12}>
                                <CustomMultiSelect
                                    label="State"
                                    controlId="State"
                                    options={states}
                                    value={states.filter((state) => stateIds.includes(state.value))}
                                    onChange={(selectedOptions) => {
                                        handleStateSelection(selectedOptions);
                                    }}
                                    asCol={false}
                                />
                            </Col>

                            <Col md={12}>
                                <CustomMultiSelect
                                    label="City"
                                    controlId="City"
                                    options={cities}
                                    value={cities.filter((city) => cityIds.includes(city.value))}
                                    onChange={(selectedOptions) => {
                                        handleCitySelection(selectedOptions);
                                    }}
                                    asCol={false}
                                />
                            </Col>

                            <Col md={6}>
                                <CustomFormInput
                                    label="Price"
                                    controlId="price"
                                    placeholder="Enter Service Price"
                                    register={register}
                                    error={errors.price}
                                    asCol={false}
                                    inputType="number"
                                    validation={{ required: "Service price is required" }}
                                />
                            </Col>

                            <Col md={6} className="mb-3">
                                <label className="fw-medium mb-1">Tax</label>
                                <div className="custom-form-group">
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step="any"
                                            className={`form-control ${(errors as any).tax ? "is-invalid" : ""}`}
                                            placeholder="Enter Tax"
                                            {...register("tax" as any, {
                                                required: "Tax is required",
                                                valueAsNumber: true,
                                                min: { value: 0, message: "Tax must be between 0 and 100" },
                                                max: { value: 100, message: "Tax must be between 0 and 100" },
                                                validate: (v: number) =>
                                                    Number.isNaN(v) ? "Enter a valid number" : true,
                                            })}
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                    {(errors as any).tax && (
                                        <div className="invalid-feedback d-block">
                                            {(errors as any).tax?.message}
                                        </div>
                                    )}
                                </div>
                            </Col>

                            <Col md={6}>
                                <label className="fw-medium mb-1">Commission</label>
                                <div className="custom-form-group">
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step="any"
                                            className={`form-control ${(errors as any).commission ? "is-invalid" : ""}`}
                                            placeholder="Enter Commission"
                                            {...register("commission" as any, {
                                                required: "Commission is required",
                                                valueAsNumber: true,
                                                min: { value: 0, message: "Commission must be between 0 and 100" },
                                                max: { value: 100, message: "Commission must be between 0 and 100" },
                                                validate: (v: number) =>
                                                    Number.isNaN(v) ? "Enter a valid number" : true,
                                            })}
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                    {(errors as any).commission && (
                                        <div className="invalid-feedback d-block">
                                            {(errors as any).commission?.message}
                                        </div>
                                    )}
                                </div>
                            </Col>

                            <Col md={6}>
                                <CustomFormSelect
                                    label="Payment Type"
                                    controlId="min_deposit_type"
                                    options={[
                                        { value: "per_hour", label: "Per Hour" },
                                        { value: "per_day", label: "Per Day" },
                                        { value: "per_month", label: "Per Month" },
                                        { value: "per_consultancy", label: "Per Consultancy" },
                                    ]}
                                    register={register as unknown as UseFormRegister<any>}
                                    fieldName="min_deposit_type"
                                    error={(errors as any).min_deposit_type}
                                    asCol={false}
                                    requiredMessage="Please select minimum deposit type"
                                    defaultValue={(service as any)?.min_deposit_type || ""}
                                    setValue={(name: string, value: any) => {
                                        setValue(name as any, value, {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                            shouldTouch: true,
                                        });

                                        if (value !== "per_consultancy") {
                                            setValue("min_deposit_value" as any, "" as any, {
                                                shouldValidate: true,
                                                shouldDirty: true,
                                                shouldTouch: true,
                                            });
                                        }
                                    }}
                                />
                            </Col>

                
                            <Col md={6} className="mt-3">
                                <label className="fw-medium mb-1">Minimum Deposit</label>
                                <div className="custom-form-group">
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step="any"
                                            className={`form-control ${(errors as any).min_deposit_value ? "is-invalid" : ""}`}
                                            placeholder="Enter Minimum Deposit"
                                            {...register("min_deposit_value" as any, {
                                                valueAsNumber: true,
                                                validate: (v: number, formValues: any) => {
                                                    const isEmpty =
                                                        v === undefined || v === null || Number.isNaN(v);
                                                    if (formValues.min_deposit_type === "per_consultancy") {
                                                        if (isEmpty) return "Minimum deposit is required";
                                                    } else if (isEmpty) {
                                                        return true;
                                                    }
                                                    const n = Number(v);
                                                    if (n < 0 || n > 100) {
                                                        return "Minimum deposit must be between 0 and 100";
                                                    }
                                                    return true;
                                                },
                                            })}
                                        />
                                        <span className="input-group-text">%</span>
                                    </div>
                                    {(errors as any).min_deposit_value && (
                                        <div className="invalid-feedback d-block">
                                            {(errors as any).min_deposit_value?.message}
                                        </div>
                                    )}
                                </div>
                            </Col> 

                            <Col md={6}>
                                <CustomImageUploader
                                    label="Upload Service Image"
                                    maxFiles={1}
                                    isEditable={isEditable}
                                    existingImages={service?.image_url ? [service.image_url] : []}
                                    onFileChange={(files, replaceUrls) => {
                                        setFileInputs(files);
                                        setReplaceUrl(replaceUrls);
                                    }}
                                />

                                <label style={{ color: "var(--primary-color)" }}>
                                    Image size should be 512*512
                                </label>
                            </Col>

                         

                            <Col md={6} className="mb-3">
                                <CustomRadioSelection
                                    label="Status"
                                    name="is_active"
                                    options={getStatusOptions()}
                                    defaultValue={isEditable ? service?.is_active?.toString() : "true"}
                                    isEditable={isEditable}
                                    setValue={setValue}
                                />
                            </Col>
                            <Col md={12}>
                                <CustomFormInput
                                    label="Description"
                                    controlId="desc"
                                    placeholder="Enter Service Description"
                                    register={register}
                                    error={errors.desc}
                                    asCol={false}
                                    validation={{ required: "Service description is required" }}
                                    as="textarea"
                                    rows={4}
                                />
                            </Col>

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

AddEditServiceDialog.show = (
    isEditable: boolean,
    service: ServiceModel | null,
    onRefreshData: () => void,
    isViewMode: boolean = false
) => {
    openDialog("details-modal", (close) => (
        <AddEditServiceDialog
            isEditable={isEditable}
            isViewMode={isViewMode}
            service={service}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditServiceDialog;