import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CategoryModel } from "../../models/CategoryModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import {
  DetailsRow,
  getStatusOptions,
  WideLabelValueBlock,
} from "../../helper/utility";
import { AppConstant } from "../../constant/AppConstant";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import {
  createOrUpdateCategory,
  createOrUpdateCategoryWithRecord,
} from "../../services/categoryService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { fetchServiceDropDown } from "../../services/servicesService";
import { openDialog } from "../../helper/DialogManager";
import AddEditServiceDialog from "./AddEditServiceDialog";

type AddEditCategoryDialogProps = {
  isEditable: boolean;
  isViewMode?: boolean;
  category: CategoryModel | null;
  onClose: () => void;
  onRefreshData: () => void;
};

type CategoryFormValues = CategoryModel & {
  approval_status?: "approve" | "rejected";
  rejection_reason?: string;
};

const SELECT_ALL_OPTION = "select-all";
const ADD_SERVICE_OPTION = "add-service";

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
    reset,
    setValue,
    getValues,
    formState: { errors },
    watch,
  } = useForm<CategoryFormValues>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      name: category?.name || "",
      desc: category?.desc || "",
      is_active: category?.is_active ?? true,
      franchise_id: category?.franchise_id || "",
      approval_status:
        category?.approval_status === "rejected" ||
        category?.is_rejected === true
          ? "rejected"
          : category?.approval_status === "approve" ||
            category?.approval_status === "approved" ||
            category?.is_rejected === false
          ? "approve"
          : category?.is_active === false
          ? "rejected"
          : "approve",
      rejection_reason: (category as any)?.rejection_reason ?? "",
    },
  });

  const [fileInputs, setFileInputs] = useState<File[]>([]);
  const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
  const [imageExplicitlyCleared, setImageExplicitlyCleared] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [draftCategoryId, setDraftCategoryId] = useState<string>("");
  const [draftImageUrl, setDraftImageUrl] = useState<string>("");

  const loadServiceOptions = useCallback(async () => {
    const serviceOpts = await fetchServiceDropDown();
    const options = [
      { value: SELECT_ALL_OPTION, label: "Select All" },
      ...serviceOpts,
      { value: ADD_SERVICE_OPTION, label: "+ Add Service" },
    ];
    setServiceOptions(options);
    return options;
  }, []);

  useEffect(() => {
    if (!category) return;
    reset({
      name: category.name || "",
      desc: category.desc || "",
      is_active: category.is_active ?? true,
      franchise_id: category.franchise_id || "",
      approval_status:
        category.approval_status === "rejected" || category.is_rejected === true
          ? "rejected"
          : category.approval_status === "approve" ||
            category.approval_status === "approved" ||
            category.is_rejected === false
          ? "approve"
          : category.is_active === false
          ? "rejected"
          : "approve",
      rejection_reason: (category as any)?.rejection_reason ?? "",
    } as any);
  }, [category, localViewMode, reset]);

  useEffect(() => {
    if (localViewMode || serviceOptions.length > 0) return;
    void loadServiceOptions();
  }, [localViewMode, serviceOptions.length, loadServiceOptions]);

  useEffect(() => {
    if (isEditable && category) {
      // Supports both old shape (`service_ids`) and API detail shape (`services: [{ _id, name }]`).
      const idsFromServiceIds = Array.isArray((category as any).service_ids)
        ? (category as any).service_ids.map(String)
        : [];
      const idsFromServicesArray = Array.isArray((category as any).services)
        ? (category as any).services
            .map((s: any) => String(s?._id ?? ""))
            .filter(Boolean)
        : [];
      setServiceIds(
        idsFromServiceIds.length > 0 ? idsFromServiceIds : idsFromServicesArray
      );
      setValue("franchise_id", category.franchise_id || "", {
        shouldValidate: false,
      });
      setDraftCategoryId("");
      setDraftImageUrl("");
      setImageExplicitlyCleared(false);
    } else {
      setServiceIds([]);
      setValue("franchise_id", "", { shouldValidate: false });
      setImageExplicitlyCleared(false);
    }
  }, [isEditable, category, setValue]);

  // Static fallback: if API doesn't return linked service IDs/names, preselect first N services.
  // This keeps the UI functional until the backend provides proper service_names/service_ids.
  useEffect(() => {
    if (!isEditable || !category) return;

    const hasProvidedIds =
      Array.isArray(category.service_ids) && category.service_ids.length > 0;
    if (hasProvidedIds) return;

    const count = category.services;
    if (!count || count <= 0) return;

    if (serviceOptions.length === 0) return;
    if (serviceIds.length > 0) return;

    const fallbackIds = serviceOptions
      .filter(
        (s) => s.value !== SELECT_ALL_OPTION && s.value !== ADD_SERVICE_OPTION
      )
      .slice(0, count)
      .map((s) => String(s.value));

    setServiceIds(fallbackIds);
  }, [isEditable, category, serviceOptions, serviceIds.length]);

  useEffect(() => {
    if (isEditable && category?.is_active !== undefined) {
      setValue("is_active", category.is_active);
    }
  }, [isEditable, category?.is_active, setValue]);

  const handleServiceSelection = async (
    selectedOptions: { value: string; label: string }[]
  ) => {
    const currentCategoryName = String(watch("name") ?? "").trim();
    const categoryIdFromRecord =
      (category as any)?._id ??
      (category as any)?.category_id ??
      (category as any)?.id ??
      "";
    const currentCategoryId = String(
      draftCategoryId || categoryIdFromRecord || ""
    ).trim();
    const isSelectAllSelected = selectedOptions.some(
      (option) => option.value === SELECT_ALL_OPTION
    );

    const hasAddServiceOption = selectedOptions.some(
      (option) => option.value === ADD_SERVICE_OPTION
    );
    const optionsWithoutAdd = selectedOptions.filter(
      (option) => option.value !== ADD_SERVICE_OPTION
    );

    if (hasAddServiceOption) {
      let resolvedCategoryId = currentCategoryId;
      if (!resolvedCategoryId) {
        const name = String(getValues("name") ?? "").trim();
        const desc = String(getValues("desc") ?? "").trim();
        const franchise_id = String(getValues("franchise_id") ?? "").trim();

        let uploadedImageUrl = "";
        if (fileInputs.length > 0) {
          const formData = new FormData();
          formData.append("type", "2");
          fileInputs.forEach((file) => formData.append("files", file));
          const { response, fileList } = await createOrUpdateDocument(
            formData,
            false
          );
          if (!response || fileList.length === 0) {
            return;
          }
          uploadedImageUrl = String(fileList[0]);
        }

        const draftRes = await createOrUpdateCategoryWithRecord(
          {
            name,
            desc,
            service_ids: [],
            is_active: true,
            ...(franchise_id ? { franchise_id } : {}),
            ...(uploadedImageUrl ? { image_url: uploadedImageUrl } : {}),
          },
          false
        );
        resolvedCategoryId = String(
          (draftRes.record as any)?._id ??
            (draftRes.record as any)?.category_id ??
            ""
        ).trim();
        if (!draftRes.response || !resolvedCategoryId) {
          return;
        }
        setDraftCategoryId(resolvedCategoryId);
        if (uploadedImageUrl) setDraftImageUrl(uploadedImageUrl);
      }

      const previousServiceIds = new Set(
        serviceOptions
          .filter(
            (s) => s.value !== SELECT_ALL_OPTION && s.value !== ADD_SERVICE_OPTION
          )
          .map((s) => s.value)
      );

      AddEditServiceDialog.show(
        false,
        null,
        async () => {
          const refreshedOptions = await loadServiceOptions();
          setServiceIds((prev) => {
            const next = new Set(prev);
            refreshedOptions
              .filter(
                (s) =>
                  s.value !== SELECT_ALL_OPTION &&
                  s.value !== ADD_SERVICE_OPTION &&
                  !previousServiceIds.has(s.value)
              )
              .forEach((s) => next.add(s.value));
            return Array.from(next);
          });
          onRefreshData();
        },
        false,
        {
          id: resolvedCategoryId,
          label: category?.name || currentCategoryName || "Current Category",
        }
      );
    }

    let selectedIds: string[] = [];

    if (isSelectAllSelected) {
      const allServices = serviceOptions.filter(
        (s) => s.value !== SELECT_ALL_OPTION && s.value !== ADD_SERVICE_OPTION
      );
      const isAllSelected =
        optionsWithoutAdd.length - 1 === allServices.length &&
        allServices.every((svc) =>
          optionsWithoutAdd.some((selected) => selected.value === svc.value)
        );

      selectedIds = isAllSelected ? [] : allServices.map((svc) => svc.value);
    } else {
      selectedIds = optionsWithoutAdd.map((option) => option.value);
    }

    setServiceIds(selectedIds);
  };

  const selectedServiceOptions = useMemo(
    () =>
      serviceOptions.filter(
        (svc) =>
          svc.value !== ADD_SERVICE_OPTION && serviceIds.includes(svc.value)
      ),
    [serviceOptions, serviceIds]
  );

  const linkedServiceNamesForView = useMemo(() => {
    if (!category) return [];
    if (
      Array.isArray((category as any).services) &&
      (category as any).services.length > 0 &&
      typeof (category as any).services[0] === "object"
    ) {
      return (category as any).services
        .map((s: any) => String(s?.name ?? ""))
        .filter(Boolean);
    }
    if (
      Array.isArray(category.service_names) &&
      category.service_names.length > 0
    ) {
      return category.service_names.map(String).filter(Boolean);
    }

    const idsFromApi = (category.service_ids ?? []).map(String);
    const ids = idsFromApi.length > 0 ? idsFromApi : serviceIds;
    return ids
      .map(
        (id) =>
          serviceOptions.find(
            (s) =>
              s.value === id &&
              s.value !== SELECT_ALL_OPTION &&
              s.value !== ADD_SERVICE_OPTION
          )?.label
      )
      .filter(Boolean) as string[];
  }, [category, serviceOptions, serviceIds]);

  const onSubmitEvent = async (data: CategoryFormValues) => {
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

      const { response, fileList } = await createOrUpdateDocument(
        formData,
        isEditable
      );
      if (response) {
        if (fileList.length > 0) {
          image_url = fileList[0].toString();
        }
      }
    }

    const imagePayload: { image_url?: string } = {};
    if (
      isEditable &&
      imageExplicitlyCleared &&
      fileInputs.length === 0 &&
      image_url === ""
    ) {
      imagePayload.image_url = "";
    } else if (image_url !== "" || draftImageUrl !== "") {
      imagePayload.image_url = image_url || draftImageUrl;
    }

    const payload = {
      name: data.name,
      desc: data.desc,
      is_active: data.is_active,
      service_ids: serviceIds,
      franchise_id: data.franchise_id,
      ...imagePayload,
    };

    let responseCategory;
    if (isEditable || draftCategoryId) {
      if (!category?._id) {
        if (!draftCategoryId) {
          showErrorAlert("Unable to update. ID is missing.");
          return;
        }
      }

      responseCategory = await createOrUpdateCategory(
        payload,
        true,
        draftCategoryId || category?._id
      );
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
          {localViewMode
            ? "Category Details"
            : isEditable
            ? "Edit Category"
            : "Add Category"}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        {localViewMode && category ? (
          <section
            className="custom-other-details"
            style={{ padding: "14px 16px", borderRadius: 12 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
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
              <div className="col-md-7 custom-helper-column">
                {/* <DetailsRow title="Category ID1" value={category.category_id ?? "-"} /> */}
                <DetailsRow
                  title="Category Name"
                  value={category.name ?? "-"}
                />
                <Row className="row custom-personal-row mb-2">
                  <label className="col custom-personal-row-title">Status</label>
                  <label className="col custom-personal-row-value text-truncate">
                    <span
                      style={{
                        color: category.is_active ? "#198754" : "#dc3545",
                        fontWeight: 600,
                      }}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </label>
                </Row>
              </div>
              <div className="col-md-5 custom-helper-column">
                {/* reserved for future right-side details */}
              </div>
            </div>
            <div className="row mt-1">
              <div className="col-12">
                <WideLabelValueBlock variant="stacked" label="Description">
                  {category.desc ?? "-"}
                </WideLabelValueBlock>
              </div>
            </div>
            <div className="row">
              <div className="col-md-7 custom-helper-column">
                {category.image_url ? (
                  <div className="mt-2 mb-2">
                    <p
                      className="mb-1"
                      style={{ color: "#000", fontWeight: 600 }}
                    >
                      Category image
                    </p>
                    <img
                      src={`${AppConstant.IMAGE_BASE_URL}${
                        category.image_url
                      }?t=${Date.now()}`}
                      alt="Category"
                      style={{
                        width: "100%",
                        maxWidth: 240,
                        height: 160,
                        borderRadius: 10,
                        objectFit: "contain",
                        background: "#fff",
                        border: "1px solid var(--txtfld-border)",
                      }}
                    />
                  </div>
                ) : null}
                <Row className="row custom-personal-row">
                  <label className="col custom-personal-row-title">
                    Services
                  </label>
                  <label className="col custom-personal-row-value text-wrap"></label>
                </Row>
                <div
                  style={{
                    marginTop: -4,
                    marginBottom: 12,
                    maxHeight: 150,
                    overflowY:
                      linkedServiceNamesForView.length > 6 ? "auto" : "visible",
                    border:
                      linkedServiceNamesForView.length > 0
                        ? "1px solid var(--txtfld-border)"
                        : "none",
                    borderRadius: linkedServiceNamesForView.length > 0 ? 8 : 0,
                    padding: linkedServiceNamesForView.length > 0 ? 8 : 0,
                  }}
                >
                  {linkedServiceNamesForView.length > 0 ? (
                    linkedServiceNamesForView.map((svc: string, idx: number) => (
                      <div
                        key={svc}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "start",
                          padding: "4px 2px",
                          borderBottom:
                            idx !== linkedServiceNamesForView.length - 1
                              ? "1px dashed var(--txtfld-border)"
                              : "none",
                        }}
                      >
                        <span style={{ color: "var(--primary-color)" }}>
                          {idx + 1}.
                        </span>
                        <span style={{ color: "var(--content-txt-color)" }}>
                          {svc}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span />
                  )}
                </div>
              </div>
              <div className="col-md-5 custom-helper-column" />
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
                  value={watch("name") || ""}
                  onChange={(value) =>
                    setValue("name", value as any, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
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
                    void handleServiceSelection(selectedOptions);
                  }}
                  asCol={false}
                  menuPortal
                  stickyBottomOptionValue={ADD_SERVICE_OPTION}
                />
              </Col>

              <Col md={12} className="min-w-0">
                <CustomImageUploader
                  controlId="category-image"
                  label="Category image"
                  hint="Recommended 512 × 512 px. JPG or PNG."
                  maxFiles={1}
                  asCol={false}
                  isEditable={
                    !localViewMode && (!category || isEditable)
                  }
                  existingImages={
                    category?.image_url ? [category.image_url] : []
                  }
                  onFileChange={(files, replaceUrlsFromUploader, meta) => {
                    setFileInputs(files);
                    setReplaceUrl(replaceUrlsFromUploader);
                    if (meta?.imageCleared) {
                      setImageExplicitlyCleared(true);
                      setDraftImageUrl("");
                    }
                    if (files.length > 0) setImageExplicitlyCleared(false);
                  }}
                />
              </Col>
              <Col md={6} className="min-w-0">
                <CustomRadioSelection
                  label="Status"
                  name="is_active"
                  options={getStatusOptions()}
                  defaultValue={
                    category?.is_active !== undefined
                      ? category.is_active.toString()
                      : "true"
                  }
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
                  value={watch("desc") || ""}
                  onChange={(value) =>
                    setValue("desc", value as any, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  error={errors.desc}
                  asCol={false}
                  validation={{ required: "Category description is required" }}
                  as="textarea"
                  rows={4}
                />
              </Col>
            </Row>
            <Row className="mt-4">
              <Col
                xs={12}
                className="text-center  d-flex justify-content-end gap-3 "
              >
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
  openDialog("category-details-modal", (close) => (
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
