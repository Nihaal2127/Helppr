import React, {  useMemo,useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { showErrorAlert } from "../../lib/global/alertHelper";
import { showAddEditServiceDialog } from "./AddEditServiceDialog";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader, {
  resolveExistingImageSrc,
} from "../../components/CustomImageUploader";
import { FieldLabelText } from "../../components/RequiredFieldMark";
import { FullDetailsRow } from "../../helper/utility";
import { showSuccessAlert } from "../../lib/global/alertHelper";
import { openDialog } from "../../lib/global/DialogManager";

const STATIC_CATEGORY_OPTIONS = [
  { value: "Food", label: "Food" },
  { value: "doordelivery", label: "doordelivery" },
  { value: "buildingworkes", label: "buildingworkes" },
  { value: "clothing", label: "clothing" },
  { value: "leather factory", label: "leather factory" },
  { value: "Health care", label: "Health care" },
];
const SELECT_ALL_OPTION = "select-all";

const STATIC_SERVICE_OPTIONS = [
  { value: "s1", label: "Home Cleaning" },
  { value: "s2", label: "Pipe Repair" },
  { value: "s3", label: "Wiring" },
  { value: "s4", label: "Wall Painting" },
];

export type SubCategoryDetails = {
  _id: string;
  name: string;
  category_name: string;
  is_active: boolean;
  desc?: string;
  image_url?: string;
};

type SubCategoryFormValues = {
  name: string;
  category_id: string;
  desc: string;
};

type Props = {
  subCategory: SubCategoryDetails | null;
  isViewMode?: boolean;
  onClose: () => void;
  /** Category name typed on Add Category, shown in the Category field. */
  presetCategoryName?: string;
  onSaved?: (saved: { name: string; category_name: string }) => void;
};

const AddEditSubCategoryDialog: React.FC<Props> & {
  show: (
    subCategory?: SubCategoryDetails | null,
    isViewMode?: boolean,
    options?: {
      presetCategoryName?: string;
      onSaved?: (saved: { name: string; category_name: string }) => void;
    }
  ) => void;
} = ({
  subCategory,
  isViewMode = false,
  onClose,
  presetCategoryName = "",
  onSaved,
}) => {
  const [localViewMode, setLocalViewMode] = useState(isViewMode);
  const isEditable = Boolean(subCategory);
  const [serviceIds, setServiceIds] = useState<string[]>([]);

const serviceOptions = useMemo(
  () => [
    { value: SELECT_ALL_OPTION, label: "Select All" },
    ...STATIC_SERVICE_OPTIONS,
  ],
  []
);

const selectedServiceOptions = useMemo(
  () => STATIC_SERVICE_OPTIONS.filter((s) => serviceIds.includes(s.value)),
  [serviceIds]
);

const handleServiceSelection = (
  selectedOptions: { value: string; label: string }[]
) => {
  const isSelectAll = selectedOptions.some(
    (o) => o.value === SELECT_ALL_OPTION
  );
  if (isSelectAll) {
    const allSelected =
      serviceIds.length === STATIC_SERVICE_OPTIONS.length;
    setServiceIds(
      allSelected ? [] : STATIC_SERVICE_OPTIONS.map((s) => s.value)
    );
    return;
  }
  setServiceIds(selectedOptions.map((o) => o.value));
};

const addServiceMenuFooter = (
  <button
    type="button"
    className="w-100 text-start border-0 bg-transparent py-2 px-3"
    style={{
      color: "var(--primary-color)",
      fontWeight: 600,
      fontSize: 14,
    }}
    onMouseDown={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onClick={() => showAddEditServiceDialog(false, null, () => {})}
  >
    + Add Service
  </button>
);

  const presetCategory = String(presetCategoryName ?? "").trim();
  const matchedPresetCategory = STATIC_CATEGORY_OPTIONS.find(
    (option) => option.value.trim().toLowerCase() === presetCategory.toLowerCase()
  );
  const initialCategoryName =
    subCategory?.category_name ||
    matchedPresetCategory?.value ||
    presetCategory ||
    "";
  const categoryOptions = useMemo(() => {
    if (
      !initialCategoryName ||
      STATIC_CATEGORY_OPTIONS.some(
        (option) =>
          option.value.trim().toLowerCase() ===
          initialCategoryName.trim().toLowerCase()
      )
    ) {
      return STATIC_CATEGORY_OPTIONS;
    }
    return [
      ...STATIC_CATEGORY_OPTIONS,
      { value: initialCategoryName, label: initialCategoryName },
    ];
  }, [initialCategoryName]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubCategoryFormValues>({
    mode: "onSubmit",
    defaultValues: {
      name: subCategory?.name ?? "",
      category_id: initialCategoryName,
      desc: subCategory?.desc ?? "",
    },
  });

  const onSubmitEvent = (data: SubCategoryFormValues) => {
    if (serviceIds.length === 0) {
      showErrorAlert("Please select at least one service");
      return;
    }
    onSaved?.({
      name: String(data.name ?? "").trim(),
      category_name: presetCategory
        ? initialCategoryName
        : String(data.category_id ?? "").trim(),
    });
    showSuccessAlert(
      isEditable ? "Sub Category updated" : "Sub Category added"
    );
    onClose();
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
            ? "Sub Category Details"
            : isEditable
            ? "Edit Sub Category"
            : "Add Sub Category"}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        {localViewMode && subCategory ? (
          <section
            className="custom-other-details modal-readonly-details"
            style={{ padding: "14px 16px", borderRadius: 12 }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="mb-0">Sub Category Information</h3>
              <i
                className="bi bi-pencil-fill fs-6 text-danger"
                style={{ cursor: "pointer" }}
                role="button"
                aria-label="Edit sub category"
                onClick={() => setLocalViewMode(false)}
              />
            </div>

            <Row className="g-3 align-items-start">
              <Col xs={12} md={6}>
                <FullDetailsRow
                  title="Sub Category Name"
                  value={subCategory.name || "-"}
                />
              </Col>
              <Col xs={12} md={6}>
                <FullDetailsRow
                  title="Status"
                  value={
                    <span
                      style={{
                        color: subCategory.is_active ? "#198754" : "#dc3545",
                        fontWeight: 600,
                      }}
                    >
                      {subCategory.is_active ? "Active" : "Inactive"}
                    </span>
                  }
                />
              </Col>
            </Row>

            <Row className="g-3 align-items-start mt-1">
              <Col xs={12} md={6}>
                <FullDetailsRow
                  title="Category"
                  value={subCategory.category_name || "-"}
                />
              </Col>
            </Row>

            <Row className="g-3 mt-1">
              <Col xs={12}>
                <h3>Description</h3>
                <div
                  className="mb-0 w-100"
                  style={{
                    color: "var(--content-txt-color)",
                    fontSize: "0.95rem",
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {subCategory.desc?.trim() ? subCategory.desc.trim() : "-"}
                </div>
              </Col>
            </Row>

            <Row className="g-3 mt-3 align-items-start">
              <Col xs={12} md={6}>
                <p
                  className="mb-2"
                  style={{ color: "var(--primary-color)", fontWeight: 600 }}
                >
                  Sub Category image
                </p>
                {subCategory.image_url ? (
                  <img
                    src={resolveExistingImageSrc(subCategory.image_url)}
                    alt="Sub Category"
                    className="d-block"
                    style={{
                      maxWidth: "min(100%, 280px)",
                      maxHeight: 200,
                      borderRadius: 8,
                      objectFit: "contain",
                      background: "#fff",
                      border: "1px solid var(--txtfld-border)",
                    }}
                  />
                ) : (
                  <span className="text-muted small">No image</span>
                )}
              </Col>
            </Row>
          </section>
        ) : (
          <form noValidate onSubmit={handleSubmit(onSubmitEvent)}>
            <Row className="g-4 align-items-start">
              <Col md={6}>
                <CustomFormInput
                  label="Sub Category name"
                  controlId="name"
                  placeholder="Enter Sub Category Name"
                  register={register}
                  value={watch("name") || ""}
                  onChange={(value) =>
                    setValue("name", value as any, { shouldValidate: true })
                  }
                  error={errors.name}
                  asCol={false}
                  validation={{ required: "Sub Category name is required" }}
                />
              </Col>

              <Col md={6}>
                {presetCategory ? (
                  <CustomFormInput
                    label="Category"
                    controlId="locked-category"
                    placeholder=""
                    value={initialCategoryName}
                    register={register}
                    error={undefined as any}
                    asCol={false}
                    isEditable={false}
                  />
                ) : (
                  <CustomFormSelect
                    label="Category"
                    controlId="category"
                    options={categoryOptions}
                    register={register as unknown as UseFormRegister<any>}
                    fieldName="category_id"
                    error={errors.category_id}
                    asCol={false}
                    requiredMessage="Please select category"
                    defaultValue={watch("category_id") || ""}
                    setValue={(name: string, value: any) =>
                      setValue(name as any, value, { shouldValidate: true })
                    }
                  />
                )}
              </Col>

              <Col md={12}>
                <CustomFormInput
                  label="Description"
                  controlId="desc"
                  placeholder="Enter Sub Category Description"
                  register={register}
                  value={watch("desc") || ""}
                  onChange={(value) =>
                    setValue("desc", value as any, { shouldValidate: true })
                  }
                  error={errors.desc}
                  asCol={false}
                  validation={{ required: "Description is required" }}
                  as="textarea"
                  rows={4}
                />
              </Col>

              <Col xs={12} md={6} className="min-w-0">
                <label className="form-label fw-medium mb-2 d-block">
                  <FieldLabelText label="Sub Category image" required />
                </label>
                <CustomImageUploader
                  label=""
                  hideLabel
                  maxFiles={1}
                  isEditable={isEditable}
                  existingImages={
                    subCategory?.image_url ? [subCategory.image_url] : []
                  }
                  onFileChange={() => {}}
                />

              </Col>
              <Col xs={12} md={6} className="min-w-0">
                <label className="form-label fw-medium mb-2 d-block">
                    <FieldLabelText label="Services" required />
                </label>
                <CustomMultiSelect
                    label=""
                    controlId="Service"
                    options={serviceOptions}
                    value={selectedServiceOptions}
                    onChange={handleServiceSelection}
                    asCol={false}
                    menuPortal
                    menuFooter={addServiceMenuFooter}
                />
                </Col>
               </Row>

            <Row className="mt-4">
              <Col xs={12} className="d-flex justify-content-end gap-3">
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

AddEditSubCategoryDialog.show = (
  subCategory = null,
  isViewMode = false,
  options
) => {
  openDialog("sub-category-details-modal", (close) => (
    <AddEditSubCategoryDialog
      subCategory={subCategory}
      isViewMode={isViewMode}
      presetCategoryName={options?.presetCategoryName}
      onSaved={options?.onSaved}
      onClose={close}
    />
  ));
};

export default AddEditSubCategoryDialog;