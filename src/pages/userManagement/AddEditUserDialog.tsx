import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { getRoleLabel, getStatusOptions } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateUser } from "../../services/userService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";
import CustomTextFieldUpload from "../../components/CustomTextFieldUpload";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog } from "../../helper/DialogManager";
import { indianPincodeRequiredRules, sanitizeIndianPincodeInput } from "../../helper/pincodeValidation";

import { buildViewCategoryServiceGroups } from "./partnerCategoryServiceView";
// import EditPartnerCategoriesServicesDialog from "./EditPartnerCategoriesServicesDialog";

const PARTNER_ROLE = 2;

type OptionType = { value: string; label: string };

type ServiceLite = {
    _id: string;
    name: string;
    category_id: string;
    category_name?: string;
};

/** Same “Select all” semantics as franchise partner setup. */
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

/** Extra fields on the form when adding a partner (not part of `UserModel`). */
type AddPartnerFormFields = {
    partner_bank_holder?: string;
    partner_bank_account_number?: string;
    partner_bank_ifsc?: string;
    partner_bank_legal_name?: string;
    partner_bank_branch?: string;
    bank_account_is_active?: string | boolean;
};

type AddEditUserFormValues = Partial<UserModel> & AddPartnerFormFields;

type AddEditUserDialogProps = {
    role: number;
    isEditable: boolean;
    user: UserModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

function AddEditUserDialogView({ role, isEditable, user, onClose, onRefreshData }: AddEditUserDialogProps) {
    const isAddPartner = role === PARTNER_ROLE && !isEditable;
    const isPartnerEdit = role === PARTNER_ROLE && isEditable;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<AddEditUserFormValues>({
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            phone_number: user?.phone_number || "",
            address: user?.address || "",
            state_id: user?.state_id || "",
            city_id: user?.city_id || "",
            pincode: user?.pincode || "",
            is_active: user?.is_active ?? true,
            partner_bank_holder: "",
            partner_bank_account_number: "",
            partner_bank_ifsc: "",
            partner_bank_legal_name: "",
            partner_bank_branch: "",
            bank_account_is_active: "true",
        },
    });

    const watchedCityId = watch("city_id");

    const [categoryOptions, setCategoryOptions] = useState<OptionType[]>([]);
    const [allServices, setAllServices] = useState<ServiceLite[]>([]);
    const [categoryIds, setCategoryIds] = useState<string[]>([]);
    const [serviceIds, setServiceIds] = useState<string[]>([]);

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

    const viewCategoryServiceGroups = useMemo(() => {
        if (!isPartnerEdit || !user) return [];
        return buildViewCategoryServiceGroups(
            {
                category_ids: categoryIds,
                service_ids: serviceIds,
                category_names: user.category_names ?? undefined,
                service_names: user.service_names ?? undefined,
            },
            allServices,
            categoryOptions
        );
    }, [isPartnerEdit, user, categoryIds, serviceIds, allServices, categoryOptions]);

    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);
    const fetchCityRef = useRef(false);

    const fetchCityFromApi = useCallback(async (stateId: string) => {
        if (fetchCityRef.current) return;
        fetchCityRef.current = true;
        try {
            const cityOptions = await fetchCityDropDown([stateId]);
            setCity(cityOptions);
        } finally {
            fetchCityRef.current = false;
        }
    }, []);

    const fetchStateFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const stateOptions = await fetchStateDropDown();
            setState(stateOptions);

            if (isEditable && user) {
                await fetchCityFromApi(user.state_id ?? "");
            }
        } finally {
            fetchRef.current = false;
        }
    }, [isEditable, user, fetchCityFromApi]);

    useEffect(() => {
        if (!(isAddPartner || isPartnerEdit)) return;
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
    }, [isAddPartner, isPartnerEdit]);

    useEffect(() => {
        if (!(isAddPartner || isPartnerEdit)) return;
        let cancelled = false;
        const effectiveCityId = watchedCityId || (isPartnerEdit ? user?.city_id ?? "" : "");
        if (isAddPartner) {
            setCategoryIds([]);
            setServiceIds([]);
        } else if (
            isPartnerEdit &&
            user?.city_id &&
            watchedCityId &&
            watchedCityId !== user.city_id
        ) {
            setCategoryIds([]);
            setServiceIds([]);
        }
        void (async () => {
            try {
                const cats = await fetchCategoryDropDown(effectiveCityId || undefined);
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
    }, [isAddPartner, isPartnerEdit, watchedCityId, user?.city_id]);

    useEffect(() => {
        if (!isPartnerEdit || !user) return;
        setCategoryIds((user.category_ids ?? []).map(String));
        setServiceIds((user.service_ids ?? []).map(String));
    }, [isPartnerEdit, user?._id]);

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

    useEffect(() => {
        if (!(isAddPartner || isPartnerEdit) || allServices.length === 0) return;
        setCategoryIds((prev) =>
            prev.filter((catId) =>
                serviceIds.some((sid) => {
                    const svc = allServices.find((x) => String(x._id) === String(sid));
                    return Boolean(svc && String(svc.category_id) === String(catId));
                })
            )
        );
    }, [serviceIds, allServices, isAddPartner, isPartnerEdit]);

    const onSubmitEvent = async (data: AddEditUserFormValues) => {

        let profile_url = "";
        if (fileInputs.length > 0) {
            const formData = new FormData();
            formData.append("type", "4");
            fileInputs.forEach((file) => formData.append("files", file));
            if (isEditable) {
                if (replaceUrls.length > 0) {
                    formData.append("update_file_urls", JSON.stringify(replaceUrls));
                }
            }

            let { response, fileList } = await createOrUpdateDocument(formData, isEditable);
            if (response) {
                if (fileList.length > 0) {
                    profile_url = fileList[0].toString();
                }
            }
        }

        if (!isEditable && profile_url === "") {
            showErrorAlert("Please select image");
            return;
        }

        if (isAddPartner || isPartnerEdit) {
            if (!data.city_id) {
                showErrorAlert("Please select city before choosing categories and services.");
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
        }

        if (isAddPartner) {
            const holder = (data.partner_bank_holder ?? "").trim();
            const acct = (data.partner_bank_account_number ?? "").trim();
            const ifsc = (data.partner_bank_ifsc ?? "").trim();
            const bankNm = (data.partner_bank_legal_name ?? "").trim();
            if (!holder || !acct || !ifsc || !bankNm) {
                showErrorAlert("Please complete all required bank fields (account name, number, IFSC, bank name).");
                return;
            }
        }

        const bankIsActive =
            data.bank_account_is_active === undefined || data.bank_account_is_active === null
                ? true
                : typeof data.bank_account_is_active === "string"
                  ? data.bank_account_is_active === "true"
                  : Boolean(data.bank_account_is_active);

        const isActivePayload =
            typeof data.is_active === "string"
                ? data.is_active === "true"
                : typeof data.is_active === "boolean"
                  ? data.is_active
                  : true;

        const payload: Record<string, unknown> = {
            type: role,
            is_from_web: true,
            registration_type: 1,
            created_by_id: getLocalStorage(AppConstant.createdById),
            name: data.name,
            email: data.email,
            phone_number: data.phone_number,
            address: data.address,
            state_id: data.state_id,
            city_id: data.city_id,
            is_active: isActivePayload,
            pincode: sanitizeIndianPincodeInput(String(data.pincode ?? "")),
            ...(profile_url !== "" && { profile_url }),
            ...(role === PARTNER_ROLE && {
                category_ids: categoryIds,
                service_ids: serviceIds,
            }),
            ...(isAddPartner && {
                bank_account: {
                    account_holder_name: (data.partner_bank_holder ?? "").trim(),
                    account_number: (data.partner_bank_account_number ?? "").trim(),
                    ifsc_code: (data.partner_bank_ifsc ?? "").trim(),
                    bank_name: (data.partner_bank_legal_name ?? "").trim(),
                    branch_name: (data.partner_bank_branch ?? "").trim(),
                    is_primary: true,
                    is_active: bankIsActive,
                },
            }),
        };

        let responseUser;
        if (isEditable) {
            if (!user?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }
            responseUser = await createOrUpdateUser(payload, true, user?._id);
        } else {
            responseUser = await createOrUpdateUser(payload, false,);
        }

        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    useEffect(() => {
        void fetchStateFromApi();
    }, [fetchStateFromApi]);

    useEffect(() => {
        if (isEditable && user?.is_active !== undefined) {
            setValue("is_active", user.is_active);
        }
    }, [isEditable, user?.is_active, setValue]);

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                centered
                {...(isAddPartner ? { size: "xl" as const } : {})}
                dialogClassName={`custom-big-modal${isAddPartner ? " add-partner-modal-vh" : ""}`}
                enforceFocus={!(isAddPartner || isPartnerEdit)}
            >
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Update" : "Add"} {getRoleLabel(role)}
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="profile-form"
                        id="profile-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        {isAddPartner ? (
                            <>
                                <Row className="g-3 mb-2">
                                    <Col xs={12} md={6}>
                                        <CustomTextField
                                            label="Name"
                                            controlId="name"
                                            placeholder="Enter Name"
                                            register={register}
                                            error={errors.name}
                                            validation={{ required: "Name is required" }}
                                        />
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <CustomTextField
                                            label="Email"
                                            controlId="email"
                                            placeholder="Enter Email"
                                            register={register}
                                            error={errors.email}
                                            validation={{ required: "Email is required" }}
                                        />
                                    </Col>
                                </Row>
                                <Row className="g-3 mb-2">
                                    <Col xs={12} md={6}>
                                        <CustomTextField
                                            label="Phone No"
                                            controlId="phone_number"
                                            placeholder="Enter Phone No"
                                            register={register}
                                            error={errors.phone_number}
                                            validation={{ required: "Phone no is required" }}
                                        />
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <CustomTextField
                                            label="Address"
                                            controlId="address"
                                            placeholder="Enter Address"
                                            register={register}
                                            error={errors.address}
                                            validation={{ required: "Address is required" }}
                                            as="textarea"
                                            rows={4}
                                        />
                                    </Col>
                                </Row>
                                <Row className="g-3 mb-2">
                                    <Col xs={12} md={6}>
                                        <CustomTextFieldSelect
                                            label="State"
                                            controlId="State"
                                            options={states}
                                            register={register}
                                            fieldName="state_id"
                                            error={errors.state_id}
                                            requiredMessage="Please select state"
                                            defaultValue={isEditable
                                                ? user?.state_id
                                                    ? user?.state_id
                                                    : ""
                                                : ""}
                                            setValue={setValue as (name: string, value: any) => void}
                                            onChange={(e) =>
                                                fetchCityFromApi(e.target.value)
                                            }
                                        />
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <CustomTextFieldSelect
                                            label="City"
                                            controlId="City"
                                            options={cities}
                                            register={register}
                                            fieldName="city_id"
                                            error={errors.city_id}
                                            requiredMessage="Please select city"
                                            defaultValue={isEditable
                                                ? user?.city_id
                                                    ? user?.city_id
                                                    : ""
                                                : ""}
                                            setValue={setValue as (name: string, value: any) => void}
                                        />
                                    </Col>
                                </Row>
                                <Row className="g-3 mb-2">
                                    <Col xs={12} md={6}>
                                        <CustomTextField
                                            label="Pincode"
                                            controlId="pincode"
                                            placeholder="Enter Pincode"
                                            register={register}
                                            error={errors.pincode}
                                            validation={indianPincodeRequiredRules()}
                                            isIndianPincodeField
                                            maxLength={6}
                                        />
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <CustomTextFieldUpload
                                            label="Profile Photo"
                                            {...(user?.profile_url ? { existingImages: [user.profile_url] } : [])}
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                                setReplaceUrl(replaceUrls);
                                            }}
                                        />
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <Row>
                                <CustomTextField
                                    label="Name"
                                    controlId="name"
                                    placeholder="Enter Name"
                                    register={register}
                                    error={errors.name}
                                    validation={{ required: "Name is required" }}
                                />
                                <CustomTextField
                                    label="Email"
                                    controlId="email"
                                    placeholder="Enter Email"
                                    register={register}
                                    error={errors.email}
                                    validation={{ required: "Email is required" }}
                                />
                                <CustomTextField
                                    label="Phone No"
                                    controlId="phone_number"
                                    placeholder="Enter Phone No"
                                    register={register}
                                    error={errors.phone_number}
                                    validation={{ required: "Phone no is required" }}
                                />
                                {!isPartnerEdit && (
                                    <CustomTextField
                                        label="Address"
                                        controlId="address"
                                        placeholder="Enter Address"
                                        register={register}
                                        error={errors.address}
                                        validation={{ required: "Address is required" }}
                                        as="textarea"
                                        rows={4}
                                    />
                                )}
                                <CustomTextFieldSelect
                                    label="State"
                                    controlId="State"
                                    options={states}
                                    register={register}
                                    fieldName="state_id"
                                    error={errors.state_id}
                                    requiredMessage="Please select state"
                                    defaultValue={isEditable
                                        ? user?.state_id
                                            ? user?.state_id
                                            : ""
                                        : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                    onChange={(e) =>
                                        fetchCityFromApi(e.target.value)
                                    }
                                />
                                <CustomTextFieldSelect
                                    label="City"
                                    controlId="City"
                                    options={cities}
                                    register={register}
                                    fieldName="city_id"
                                    error={errors.city_id}
                                    requiredMessage="Please select city"
                                    defaultValue={isEditable
                                        ? user?.city_id
                                            ? user?.city_id
                                            : ""
                                        : ""}
                                    setValue={setValue as (name: string, value: any) => void}
                                />
                                <CustomTextField
                                    label="Pincode"
                                    controlId="pincode"
                                    placeholder="Enter Pincode"
                                    register={register}
                                    error={errors.pincode}
                                    validation={indianPincodeRequiredRules()}
                                    isIndianPincodeField
                                    maxLength={6}
                                />
                                {!isPartnerEdit && (
                                    <CustomTextFieldUpload
                                        label="Profile Photo"
                                        {...(user?.profile_url ? { existingImages: [user.profile_url] } : [])}
                                        onFileChange={(files, replaceUrls) => {
                                            setFileInputs(files);
                                            setReplaceUrl(replaceUrls);
                                        }}
                                    />
                                )}
                            </Row>
                        )}

                        {isAddPartner ? (
                            <>
                                <section className="custom-other-details mt-4" style={{ padding: "10px" }}>
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

                                <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                                    <h3 className="mb-3">Bank information</h3>
                                    <Row className="g-3 mb-2">
                                        <Col xs={12} md={6}>
                                            <CustomTextField
                                                label="Account Name"
                                                controlId="partner_bank_holder"
                                                placeholder="Enter account holder name"
                                                register={register}
                                                error={errors.partner_bank_holder}
                                                validation={{ required: "Account name is required" }}
                                            />
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <CustomTextField
                                                label="Account Number"
                                                controlId="partner_bank_account_number"
                                                placeholder="Enter account number"
                                                register={register}
                                                error={errors.partner_bank_account_number}
                                                validation={{ required: "Account number is required" }}
                                            />
                                        </Col>
                                    </Row>
                                    <Row className="g-3 mb-2">
                                        <Col xs={12} md={6}>
                                            <CustomTextField
                                                label="IFSC Code"
                                                controlId="partner_bank_ifsc"
                                                placeholder="Enter IFSC code"
                                                register={register}
                                                error={errors.partner_bank_ifsc}
                                                validation={{ required: "IFSC code is required" }}
                                            />
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <CustomTextField
                                                label="Bank Name"
                                                controlId="partner_bank_legal_name"
                                                placeholder="Enter bank name"
                                                register={register}
                                                error={errors.partner_bank_legal_name}
                                                validation={{ required: "Bank name is required" }}
                                            />
                                        </Col>
                                    </Row>
                                    {/* <Row className="g-3 mb-2">
                                        <Col xs={12} md={6}>
                                            <CustomTextField
                                                label="Branch Name er"
                                                controlId="partner_bank_branch"
                                                placeholder="Enter branch name"
                                                register={register}
                                                error={errors.partner_bank_branch}
                                            />
                                        </Col>
                                       
                                    </Row> */}
                                </section>
                            </>
                        ) : null}

                        {isPartnerEdit ? (
                            <>
                                <Row className="mt-2">
                                    <Col xs={12}>
                                        <CustomTextFieldUpload
                                            label="Profile Photo"
                                            {...(user?.profile_url ? { existingImages: [user.profile_url] } : [])}
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                                setReplaceUrl(replaceUrls);
                                            }}
                                        />
                                    </Col>
                                </Row>
                                <Row className="mt-2">
                                    <Col xs={12}>
                                        <CustomTextField
                                            label="Address"
                                            controlId="address"
                                            placeholder="Enter Address"
                                            register={register}
                                            error={errors.address}
                                            validation={{ required: "Address is required" }}
                                            as="textarea"
                                            rows={4}
                                        />
                                    </Col>
                                </Row>
                                <Row className="mt-2">
                                    <Col xs={12}>
                                        <CustomTextFieldRadio
                                            label="Status"
                                            name="is_active"
                                            options={getStatusOptions()}
                                            defaultValue={user?.is_active?.toString() ?? "true"}
                                            isEditable={true}
                                            setValue={setValue}
                                        />
                                    </Col>
                                </Row>
                            </>
                        ) : null}

                        <Row className="mt-4">
                            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                                <Button type="submit" className="custom-btn-primary" >
                                    {isEditable ? "Update" : "Add"}
                                </Button>
                            
                                <Button className="custom-btn-secondary" onClick={onClose}>
                                    Cancel
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
}

const AddEditUserDialog = Object.assign(AddEditUserDialogView, {
    show(role: number, isEditable: boolean, user: UserModel | null, onRefreshData: () => void) {
        openDialog("add-user-details-modal", (close) => (
            <AddEditUserDialogView
                role={role}
                isEditable={isEditable}
                user={user}
                onClose={close}
                onRefreshData={onRefreshData}
            />
        ));
    },
}) as typeof AddEditUserDialogView & {
    show: (role: number, isEditable: boolean, user: UserModel | null, onRefreshData: () => void) => void;
};

export default AddEditUserDialog;
