import React, { useState, useEffect, useMemo } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CategoryModel } from "../../models/CategoryModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { DetailsRow, FullDetailsRow, getStatusOptions } from "../../helper/utility";
import { AppConstant } from "../../constant/AppConstant";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateCategory } from "../../services/categoryService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { fetchServiceDropDown } from "../../services/servicesService";
import { fetchFranchiseDropDown } from "../../services/franchiseService";
import { openDialog } from "../../helper/DialogManager";

type AddEditCategoryDialogProps = {
    isEditable: boolean;
    isViewMode?: boolean;
    category: CategoryModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditCategoryDialog: React.FC<AddEditCategoryDialogProps> & {
    show: (
        isEditable: boolean,
        category: CategoryModel | null,
        onRefreshData: () => void,
        isViewMode?: boolean
    ) => void;
} = ({ isEditable, isViewMode = false, category, onClose, onRefreshData }) => {
    const [localViewMode, setLocalViewMode] = useState(isViewMode);

    useEffect(() => {
        setLocalViewMode(isViewMode);
    }, [isViewMode, category?._id]);
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CategoryModel>({
        mode: "onSubmit",
        reValidateMode: "onSubmit",
        defaultValues: {
            name: category?.name || "",
            desc: category?.desc || "",
            is_active: category?.is_active ?? true,
            franchise_id: category?.franchise_id || "",
        },
    });

    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([]);
    const [franchiseOptions, setFranchiseOptions] = useState<{ value: string; label: string }[]>([]);
    const [serviceIds, setServiceIds] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [serviceOpts, franchiseOpts] = await Promise.all([
                fetchServiceDropDown(),
                fetchFranchiseDropDown(),
            ]);
            if (cancelled) return;
            setServiceOptions([{ value: "select-all", label: "Select All" }, ...serviceOpts]);
            setFranchiseOptions([{ value: "", label: "Select Franchise" }, ...franchiseOpts]);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (isEditable && category) {
            // Ensure consistent comparison with dropdown values (usually strings).
            setServiceIds((category.service_ids ?? []).map(String));
            setValue("franchise_id", category.franchise_id || "", { shouldValidate: false });
        } else {
            setServiceIds([]);
            setValue("franchise_id", "", { shouldValidate: false });
        }
    }, [isEditable, category, setValue]);

    // Static fallback: if API doesn't return linked service IDs/names, preselect first N services.
    // This keeps the UI functional until the backend provides proper service_names/service_ids.
    useEffect(() => {
        if (!isEditable || !category) return;

        const hasProvidedIds = Array.isArray(category.service_ids) && category.service_ids.length > 0;
        if (hasProvidedIds) return;

        const count = category.services;
        if (!count || count <= 0) return;

        if (serviceOptions.length === 0) return;
        if (serviceIds.length > 0) return;

        const fallbackIds = serviceOptions
            .filter((s) => s.value !== "select-all")
            .slice(0, count)
            .map((s) => String(s.value));

        setServiceIds(fallbackIds);
    }, [isEditable, category, serviceOptions, serviceIds.length]);

    useEffect(() => {
        if (isEditable && category?.is_active !== undefined) {
            setValue("is_active", category.is_active);
        }
    }, [isEditable, category?.is_active, setValue]);

    const handleServiceSelection = (selectedOptions: { value: string; label: string }[]) => {
        const isSelectAllSelected = selectedOptions.some((option) => option.value === "select-all");

        let selectedIds: string[] = [];

        if (isSelectAllSelected) {
            const allServices = serviceOptions.filter((s) => s.value !== "select-all");
            const isAllSelected =
                selectedOptions.length - 1 === allServices.length &&
                allServices.every((svc) =>
                    selectedOptions.some((selected) => selected.value === svc.value)
                );

            selectedIds = isAllSelected ? [] : allServices.map((svc) => svc.value);
        } else {
            selectedIds = selectedOptions.map((option) => option.value);
        }

        setServiceIds(selectedIds);
    };

    const selectedServiceOptions = useMemo(
        () => serviceOptions.filter((svc) => serviceIds.includes(svc.value)),
        [serviceOptions, serviceIds]
    );

    const linkedServiceNamesForView = useMemo(() => {
        if (!category) return [];
        if (Array.isArray(category.service_names) && category.service_names.length > 0) {
            return category.service_names.map(String).filter(Boolean);
        }
       
        const idsFromApi = (category.service_ids ?? []).map(String);
        const ids = idsFromApi.length > 0 ? idsFromApi : serviceIds;
        return ids
            .map((id) => serviceOptions.find((s) => s.value === id && s.value !== "select-all")?.label)
            .filter(Boolean) as string[];
    }, [category, serviceOptions, serviceIds]);

    const onSubmitEvent = async (data: CategoryModel) => {
        if (!data.franchise_id) {
            showErrorAlert("Please select franchise");
            return;
        }
        if (serviceIds.length === 0) {
            showErrorAlert("Please select at least one service");
            return;
        }

        let image_url = "";
        if (fileInputs.length > 0) {
            const formData = new FormData();
            formData.append("type", "2");
            fileInputs.forEach((file) => formData.append("files", file));
            if (isEditable) {
                if (replaceUrls.length > 0) {
                    formData.append("update_file_urls", JSON.stringify(replaceUrls));
                }
            }

            const { response, fileList } = await createOrUpdateDocument(formData, isEditable);
            if (response) {
                if (fileList.length > 0) {
                    image_url = fileList[0].toString();
                }
            }
        }

        if (!isEditable && image_url === "") {
            showErrorAlert("Please select image");
            return;
        }
        const payload = {
            name: data.name,
            desc: data.desc,
            is_active: data.is_active,
            service_ids: serviceIds,
            franchise_id: data.franchise_id,
            ...(image_url !== "" && { image_url }),
        };

        let responseCategory;
        if (isEditable) {
            if (!category?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            responseCategory = await createOrUpdateCategory(payload, true, category?._id);
        } else {
            responseCategory = await createOrUpdateCategory(payload, false);
        }

        if (responseCategory) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal
            show={true}
            onHide={onClose}
            centered
            size="lg"
            dialogClassName="custom-big-modal"
            enforceFocus={false}
        >
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {localViewMode ? "Category Details" : isEditable ? "Edit Category" : "Add Category"}
                </Modal.Title>
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-0">
                {localViewMode && category ? (
                    <section className="custom-other-details" style={{ padding: "10px" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="mb-0">Category Information</h3>
                            {isEditable && (
                                <i
                                    className="bi bi-pencil-fill fs-6 text-danger"
                                    style={{ cursor: "pointer" }}
                                    role="button"
                                    aria-label="Edit category"
                                    onClick={() => setLocalViewMode(false)}
                                />
                            )}
                        </div>
                        <div className="row">
                            <div className="col-md-6 custom-helper-column">
                                {/* <DetailsRow title="Category ID1" value={category.category_id ?? "-"} /> */}
                                <DetailsRow title="Category Name" value={category.name ?? "-"} />
                                <FullDetailsRow title="Description" value={category.desc ?? "-"} />
                                <FullDetailsRow
                                    title="Services"
                                    value={
                                        linkedServiceNamesForView.length > 0
                                            ? linkedServiceNamesForView.join(", ")
                                            : category.services ?? "-"
                                    }
                                />
                               
                            </div>
                            <div className="col-md-6 custom-helper-column">
                                <DetailsRow
                                    title="Status"
                                    value={category.is_active ? "Active" : "Inactive"}
                                />
                                {category.image_url ? (
                                    <div className="mt-2">
                                        <p className="mb-1" style={{ color: "var(--primary-color)", fontWeight: 600 }}>
                                            Category image
                                        </p>
                                        <img
                                            src={`${AppConstant.IMAGE_BASE_URL}${category.image_url}?t=${Date.now()}`}
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
                                label="Category"
                                controlId="name"
                                placeholder="Enter Category Name"
                                register={register}
                                error={errors.name}
                                asCol={false}
                                validation={{ required: "Category name is required" }}
                            />
                        </Col>
                        
                        <Col md={6}>
                            <CustomMultiSelect
                                label="Services"
                                controlId="Service"
                                options={serviceOptions}
                                value={selectedServiceOptions}
                                onChange={(selectedOptions) => {
                                    handleServiceSelection(selectedOptions);
                                }}
                                asCol={false}
                                menuPortal
                            />
                        </Col>
                       
                        <Col md={6}>
                            <CustomImageUploader
                                label="Upload Category Image"
                                maxFiles={1}
                                isEditable={isEditable}
                                existingImages={category?.image_url ? [category.image_url] : []}
                                onFileChange={(files, replaceUrlsFromUploader) => {
                                    setFileInputs(files);
                                    setReplaceUrl(replaceUrlsFromUploader);
                                }}
                            />
                            <label style={{ color: "var(--primary-color)" }}>Image size should be 512*512</label>
                        </Col>
                        <Col md={6}>
                            <CustomRadioSelection
                                label="Status"
                                name="is_active"
                                options={getStatusOptions()}
                                defaultValue={isEditable ? category?.is_active?.toString() : "true"}
                                isEditable={isEditable}
                                setValue={setValue}
                            />
                        </Col>
                        <Col md={12}>
                            <CustomFormInput
                                label="Description"
                                controlId="desc"
                                placeholder="Enter Category Description"
                                register={register}
                                error={errors.desc}
                                asCol={false}
                                validation={{ required: "Category description is required" }}
                                as="textarea"
                                rows={4}
                            />
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col xs={12} className="text-center  d-flex justify-content-end gap-3 ">
                            <Button type="submit" className="custom-btn-primary">
                                {isEditable ? "Update" : "Add"}
                            </Button>
                         
                            <Button className="custom-btn-secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </form>
                )}
            </Modal.Body>
        </Modal>
    );
};

AddEditCategoryDialog.show = (
    isEditable: boolean,
    category: CategoryModel | null,
    onRefreshData: () => void,
    isViewMode: boolean = false
) => {
    openDialog("details-modal", (close) => (
        <AddEditCategoryDialog
            isEditable={isEditable}
            isViewMode={isViewMode}
            category={category}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditCategoryDialog;
