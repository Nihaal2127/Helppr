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
import { createOrUpdateDocument } from "../../services/documentUploadService";
import { openDialog } from "../../helper/DialogManager";
import {
  FullDetailsRow,
  WideLabelValueBlock,
  sanitizePercentInput,
  validatePercentRange,
} from "../../helper/utility";
import { AppConstant } from "../../constant/AppConstant";

type AddEditServiceDialogProps = {
  isEditable: boolean;
  service: ServiceModel | null;
  onClose: () => void;
  onRefreshData: () => void;
  isViewMode?: boolean;
  lockCategory?: { id?: string; label?: string };
};

const normalizePaymentType = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "per_hour") return "per_hour";
  if (key === "per_day") return "per_day";
  if (key === "per_month") return "per_month";
  if (key === "per_consultancy") return "per_consultancy";
  return "";
};

const paymentTypeLabel = (value: string): string => {
  if (value === "per_hour") return "Per Hour";
  if (value === "per_day") return "Per Day";
  if (value === "per_month") return "Per Month";
  if (value === "per_consultancy") return "Per Consultancy";
  return "-";
};

const AddEditServiceDialog: React.FC<AddEditServiceDialogProps> & {
  show: (
    isEditable: boolean,
    service: ServiceModel | null,
    onRefreshData: () => void,
    isViewMode?: boolean,
    lockCategory?: { id?: string; label?: string }
  ) => void;
} = ({
  isEditable,
  service,
  onClose,
  onRefreshData,
  isViewMode = false,
  lockCategory,
}) => {
  const [localViewMode, setLocalViewMode] = useState(isViewMode);

  useEffect(() => {
    setLocalViewMode(isViewMode);
  }, [isViewMode, service?._id]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<
    ServiceModel & {
      approval_status?: "pending" | "approve" | "rejected";
      rejection_reason?: string;
    }
  >({
    // Backend returns `payment_type` / `minimum_deposit`; UI form uses
    // `min_deposit_type` / `min_deposit_value`.
    defaultValues: {
      name: service?.name || "",
      desc: service?.desc || "",
      tax: ((service as any)?.tax ?? "") as any,
      commission: ((service as any)?.commission ?? "") as any,
      min_deposit_type:
        normalizePaymentType(
          (service as any)?.min_deposit_type ?? (service as any)?.payment_type
        ) ?? "",
      min_deposit_value:
        ((service as any)?.min_deposit_value ??
          (service as any)?.minimum_deposit ??
          "") as any,
      is_active: service?.is_active ?? true,
      category_id: service?.category_id || "",
      approval_status:
        service?.approval_status === "rejected" || service?.is_rejected === true
          ? "rejected"
          : service?.approval_status === "approve" ||
            service?.is_rejected === false
          ? "approve"
          : "pending",
      rejection_reason: (service as any)?.rejection_reason ?? "",
    } as any,
  });

  useEffect(() => {
    reset({
      name: service?.name || "",
      desc: service?.desc || "",
      tax: ((service as any)?.tax ?? "") as any,
      commission: ((service as any)?.commission ?? "") as any,
      min_deposit_type:
        normalizePaymentType(
          (service as any)?.min_deposit_type ?? (service as any)?.payment_type
        ) ?? "",
      min_deposit_value:
        ((service as any)?.min_deposit_value ??
          (service as any)?.minimum_deposit ??
          "") as any,
      is_active: service?.is_active ?? true,
      category_id: service?.category_id || lockCategory?.id || "",
      approval_status:
        service?.approval_status === "rejected" || service?.is_rejected === true
          ? "rejected"
          : service?.approval_status === "approve" ||
            service?.is_rejected === false
          ? "approve"
          : "pending",
      rejection_reason: (service as any)?.rejection_reason ?? "",
    } as any);
  }, [service, lockCategory?.id, localViewMode, reset]);

  const [categories, setCategory] = useState<
    { value: string; label: string }[]
  >([]);
  const [fileInputs, setFileInputs] = useState<File[]>([]);
  const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
  const [imageExplicitlyCleared, setImageExplicitlyCleared] = useState(false);
  const fetchRef = useRef(false);

  // const depositType = watch("min_deposit_type");
  const categoryLabelForView =
    service?.category_id &&
    categories.find((c) => c.value === service.category_id)?.label;

  const normalizedServicePaymentType = normalizePaymentType(
    (service as any)?.min_deposit_type ?? (service as any)?.payment_type
  );

  const paymentTypeForView = paymentTypeLabel(normalizedServicePaymentType);
  const minimumDepositForView =
    (service as any)?.minimum_deposit ?? (service as any)?.min_deposit_value;
  const minimumDepositLabelForView =
    minimumDepositForView !== undefined && minimumDepositForView !== null
      ? `${minimumDepositForView}${AppConstant.percentageSymbol}`
      : "-";

  const fetchDataFromApi = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;

    try {
      if (lockCategory) {
        setCategory([
          {
            value: lockCategory.id || "",
            label: lockCategory.label || "Selected Category",
          },
        ]);
        if (lockCategory.id) {
          setValue("category_id", lockCategory.id as any, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        return;
      }
      const categoryOptions = await fetchCategoryDropDown();
      setCategory(categoryOptions);
    } finally {
      fetchRef.current = false;
    }
  }, [lockCategory, setValue]);

  useEffect(() => {
    void fetchDataFromApi();
  }, [fetchDataFromApi]);

  useEffect(() => {
    setImageExplicitlyCleared(false);
  }, [service?._id]);

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
    const depositType = normalizePaymentType(
      (service as any)?.min_deposit_type ?? (service as any)?.payment_type
    );
    if (isEditable && depositType) {
      setValue("min_deposit_type" as any, depositType, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [isEditable, service, setValue]);

  const approvalStatus = watch("approval_status");
  const watchedServiceName = watch("name");
  const watchedServiceDesc = watch("desc");

  const onSubmitEvent = async (
    data: ServiceModel & {
      approval_status?: "pending" | "approve" | "rejected";
      rejection_reason?: string;
    }
  ) => {
    const resolvedCategoryId = String(
      lockCategory?.id || data.category_id || ""
    ).trim();
    const normalizedPaymentType = normalizePaymentType(
      (data as any).min_deposit_type
    );
    const normalizedMinDeposit = Number((data as any).min_deposit_value ?? 0);

    let image_url = "";

    if (fileInputs.length > 0) {
      const formData = new FormData();
      formData.append("type", "2");
      fileInputs.forEach((file) => formData.append("files", file));

      if (isEditable && replaceUrls.length > 0) {
        formData.append("update_file_urls", JSON.stringify(replaceUrls));
      }

      const { response, fileList } = await createOrUpdateDocument(
        formData,
        isEditable
      );

      if (response && fileList.length > 0) {
        image_url = fileList[0].toString();
      }
    }

    const payload = {
      name: data.name,
      desc: data.desc,
      tax: Number((data as any).tax),
      commission: Number((data as any).commission),
      payment_type: normalizedPaymentType,
      minimum_deposit: normalizedMinDeposit,
      // Keep legacy keys temporarily for backward compatibility in consumers.
      min_deposit_type: normalizedPaymentType,
      min_deposit_value: normalizedMinDeposit,
      is_active:
        isEditable && service?.is_request
          ? data.approval_status === "rejected"
            ? false
            : data.approval_status === "approve"
            ? true
            : service?.is_active ?? true
          : isEditable
          ? data.approval_status !== "rejected"
          : data.is_active,
      ...(isEditable &&
        service?.is_request && {
          is_rejected:
            data.approval_status === "rejected"
              ? true
              : data.approval_status === "approve"
              ? false
              : null,
        }),
      ...(isEditable && {
        rejection_reason:
          data.approval_status === "rejected"
            ? (data.rejection_reason ?? "").trim()
            : "",
      }),
      category_id: resolvedCategoryId,
      ...(() => {
        if (
          isEditable &&
          imageExplicitlyCleared &&
          fileInputs.length === 0 &&
          image_url === ""
        ) {
          return { image_url: "" };
        }
        if (image_url !== "") return { image_url };
        return {};
      })(),
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
    <Modal
      show={true}
      size="lg"
      onHide={onClose}
      centered
      dialogClassName="custom-big-modal"
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          {localViewMode
            ? "Service Details"
            : isEditable
            ? "Edit Service"
            : "Add Service"}
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
                {/* <FullDetailsRow title="Service ID" value={service.service_id ?? "-"} /> */}
                <FullDetailsRow
                  title="Category"
                  value={
                    (service as any).category_name ??
                    categoryLabelForView ??
                    service.category_id ??
                    "-"
                  }
                />
                <FullDetailsRow
                  title="Tax"
                  value={
                    service.tax !== undefined && service.tax !== null
                      ? `${service.tax}${AppConstant.percentageSymbol}`
                      : "-"
                  }
                />
                <FullDetailsRow
                  title="Payment Type"
                  value={paymentTypeForView}
                />
              </div>
              <div className="col-md-6 custom-helper-column">
                <FullDetailsRow
                  title="Service Name"
                  value={service.name ?? "-"}
                />
                {/* <FullDetailsRow
                                    title="States"
                                    value={stateLabelsForView.length > 0 ? stateLabelsForView.join(", ") : "-"}
                                /> */}
                <FullDetailsRow
                  title="Commission"
                  value={
                    service.commission !== undefined &&
                    service.commission !== null
                      ? `${service.commission}${AppConstant.percentageSymbol}`
                      : "-"
                  }
                />

                <FullDetailsRow
                  title="Status"
                  value={service.is_active ? "Active" : "Inactive"}
                />
                <FullDetailsRow
                  title="Minimum Deposit"
                  value={minimumDepositLabelForView}
                />
              </div>
              <div className="col-md-12 custom-helper-column">
                <WideLabelValueBlock variant="stacked" label="Description">
                  {service.desc ?? "-"}
                </WideLabelValueBlock>
                {/* <Row className="row custom-personal-row">
                                    <label className="col-3 custom-personal-row-title">Cities</label>
                                    <label className="col-9 custom-personal-row-value text-wrap">
                                        {cityLabelsForView.length > 0 ? cityLabelsForView.join(", ") : "-"}
                                    </label>
                                </Row> */}
              </div>
              <div className="col-md-12">
                {service.image_url ? (
                  <div className="mt-2">
                    <p
                      className="mb-1"
                      style={{ color: "var(--primary-color)", fontWeight: 600 }}
                    >
                      Service image
                    </p>
                    <img
                      src={`${AppConstant.IMAGE_BASE_URL}${
                        service.image_url
                      }?t=${Date.now()}`}
                      alt=""
                      style={{
                        maxWidth: 160,
                        maxHeight: 160,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
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
                  value={(watchedServiceName as any) ?? ""}
                  onChange={(value) => {
                    setValue("name" as any, value as any, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Col>

              {!lockCategory ? (
                <Col md={6}>
                  <CustomFormSelect
                    label="Category"
                    controlId="category"
                    options={categories}
                    register={register as unknown as UseFormRegister<any>}
                    fieldName="category_id"
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
              ) : (
                <Col md={6}>
                  <CustomFormInput
                    label="Category"
                    controlId="locked-category"
                    placeholder=""
                    value={lockCategory.label || "Selected Category"}
                    register={register}
                    error={undefined as any}
                    asCol={false}
                    isEditable={false}
                  />
                </Col>
              )}

              <Col md={6} className="mb-3">
                <label className="fw-medium mb-1">Tax</label>
                <div className="custom-form-group">
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`form-control ${
                        (errors as any).tax ? "is-invalid" : ""
                      }`}
                      placeholder="Enter Tax"
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.value = sanitizePercentInput(target.value);
                      }}
                      {...register("tax" as any, {
                        validate: (v: string) =>
                          validatePercentRange(v, {
                            required: true,
                            label: "Tax",
                          }),
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
                      type="text"
                      inputMode="numeric"
                      className={`form-control ${
                        (errors as any).commission ? "is-invalid" : ""
                      }`}
                      placeholder="Enter Commission"
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.value = sanitizePercentInput(target.value);
                      }}
                      {...register("commission" as any, {
                        validate: (v: string) =>
                          validatePercentRange(v, {
                            required: true,
                            label: "Commission",
                          }),
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

              <Col md={6} className="mt-3">
                <CustomFormSelect
                  label="Payment Type"
                  controlId="Payment Type"
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
                  requiredMessage="Please select payment type"
                  defaultValue={
                    normalizePaymentType(
                      (service as any)?.min_deposit_type ??
                        (service as any)?.payment_type
                    ) ?? ""
                  }
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
                      type="text"
                      inputMode="numeric"
                      className={`form-control ${
                        (errors as any).min_deposit_value ? "is-invalid" : ""
                      }`}
                      placeholder="Enter Minimum Deposit"
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.value = sanitizePercentInput(target.value);
                      }}
                      {...register("min_deposit_value" as any, {
                        validate: (v: string, formValues: any) => {
                          const isEmpty =
                            v === undefined ||
                            v === null ||
                            String(v).trim() === "";
                          if (
                            formValues.min_deposit_type === "per_consultancy"
                          ) {
                            if (isEmpty) {
                              return validatePercentRange(v, {
                                required: true,
                                label: "Minimum deposit",
                              });
                            }
                          }
                          return validatePercentRange(v, {
                            required: false,
                            label: "Minimum deposit",
                          });
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

              <Col md={12} className="min-w-0">
                <CustomImageUploader
                  controlId="service-image"
                  label="Service image"
                  hint="Recommended 512 × 512 px. JPG or PNG."
                  maxFiles={1}
                  asCol={false}
                  isEditable={!localViewMode && (!service || isEditable)}
                  existingImages={service?.image_url ? [service.image_url] : []}
                  onFileChange={(files, replaceUrls, meta) => {
                    setFileInputs(files);
                    setReplaceUrl(replaceUrls);
                    if (meta?.imageCleared) setImageExplicitlyCleared(true);
                    if (files.length > 0) setImageExplicitlyCleared(false);
                  }}
                />
              </Col>

              <Col md={6} className="mb-3 min-w-0">
                {isEditable && service?.is_request ? (
                  <CustomRadioSelection
                    label="Approval Status"
                    name="approval_status"
                    options={[
                      { label: "Pending", value: "pending" },
                      { label: "Accept", value: "approve" },
                      { label: "Reject", value: "rejected" },
                    ]}
                    defaultValue={
                      service?.approval_status === "rejected" ||
                      service?.is_rejected === true
                        ? "rejected"
                        : service?.approval_status === "approve" ||
                          service?.is_rejected === false
                        ? "approve"
                        : "pending"
                    }
                    isEditable={isEditable}
                    setValue={setValue}
                  />
                ) : (
                  <CustomRadioSelection
                    label="Status"
                    name="is_active"
                    options={getStatusOptions()}
                    defaultValue={
                      service?.is_active !== undefined
                        ? service.is_active.toString()
                        : "true"
                    }
                    isEditable={isEditable}
                    setValue={setValue}
                  />
                )}
              </Col>
              {isEditable &&
                service?.is_request &&
                approvalStatus === "rejected" && (
                <Col md={12}>
                  <CustomFormInput
                    label="Rejection Reason"
                    controlId="rejection_reason"
                    placeholder="Enter reason for rejection"
                    register={register}
                    error={(errors as any).rejection_reason}
                    asCol={false}
                    validation={{
                      validate: (value: string) =>
                        value?.trim() ? true : "Rejection reason is required",
                    }}
                    as="textarea"
                    rows={3}
                  />
                </Col>
              )}
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
                  value={(watchedServiceDesc as any) ?? ""}
                  onChange={(value) => {
                    setValue("desc" as any, value as any, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                />
              </Col>
            </Row>

            <Row className="mt-4">
              <Col
                xs={12}
                className="text-center d-flex justify-content-end gap-3 "
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

AddEditServiceDialog.show = (
  isEditable: boolean,
  service: ServiceModel | null,
  onRefreshData: () => void,
  isViewMode: boolean = false,
  lockCategory?: { id?: string; label?: string }
) => {
  openDialog("service-details-modal", (close) => (
    <AddEditServiceDialog
      isEditable={isEditable}
      isViewMode={isViewMode}
      service={service}
      lockCategory={lockCategory}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default AddEditServiceDialog;
