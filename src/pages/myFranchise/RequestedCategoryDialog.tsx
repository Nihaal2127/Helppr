import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomImageUploader from "../../components/CustomImageUploader";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import { DetailsRow, FullDetailsRow } from "../../helper/utility";
import { openDialog } from "../../helper/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";
import type { RequestedCategoryRow } from "../../services/myFranchiseService";
import {
  createRequestedCategory,
  updateRequestedCategory,
} from "../../services/myFranchiseService";
import { fetchServiceDropDown } from "../../services/servicesService";
import sampleCategoryViewImage from "../../assets/icons/profile.svg";

type ServiceOption = { value: string; label: string };

type RequestedCategoryFormValues = {
  name: string;
  desc: string;
};

type RequestedCategoryDialogProps = {
  onClose: () => void;
  onRefreshData: () => void;
  /** Franchise catalog services as `{ value: _id, label: name }` (no “Select all” row). */
  franchiseServiceOptions: ServiceOption[];
} & (
  | { mode: "add"; request: null }
  | { mode: "view-edit"; request: RequestedCategoryRow }
);

function resolveImageSrc(url?: string): string | null {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith("data:")) return u;
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

const RequestedCategoryDialog: React.FC<RequestedCategoryDialogProps> & {
  showAdd: (franchiseServiceOptions: ServiceOption[], onRefreshData: () => void) => void;
  showView: (
    request: RequestedCategoryRow,
    franchiseServiceOptions: ServiceOption[],
    onRefreshData: () => void
  ) => void;
} = (props) => {
  const { onClose, onRefreshData, franchiseServiceOptions } = props;
  const isAdd = props.mode === "add";
  const request = isAdd ? null : props.request;

  const [isEditing, setIsEditing] = useState(isAdd);
  const [fileInputs, setFileInputs] = useState<File[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const base = franchiseServiceOptions.filter((o) => o.value !== "select-all");
      const withSelectAll = [{ value: "select-all", label: "Select All" }, ...base];
      try {
        const fromApi = await fetchServiceDropDown();
        if (!cancelled && Array.isArray(fromApi) && fromApi.length > 0) {
          setServiceOptions([{ value: "select-all", label: "Select All" }, ...fromApi]);
          return;
        }
      } catch {
        /* fall back */
      }
      if (!cancelled) setServiceOptions(withSelectAll);
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseServiceOptions]);

  useEffect(() => {
    setIsEditing(isAdd);
    setFileInputs([]);
    if (isAdd) {
      setServiceIds([]);
    } else if (request) {
      setServiceIds((request.service_ids ?? []).map(String));
    }
  }, [isAdd, request?._id]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestedCategoryFormValues>({
    defaultValues: { name: "", desc: "" },
  });

  useEffect(() => {
    if (isAdd) {
      reset({ name: "", desc: "" });
      return;
    }
    if (request && isEditing) {
      reset({
        name: request.name,
        desc: request.description ?? "",
      });
      setServiceIds((request.service_ids ?? []).map(String));
    }
  }, [isAdd, request, isEditing, reset]);

  const handleServiceSelection = (selectedOptions: ServiceOption[]) => {
    const isSelectAllSelected = selectedOptions.some((option) => option.value === "select-all");

    let selectedIds: string[] = [];

    if (isSelectAllSelected) {
      const allServices = serviceOptions.filter((s) => s.value !== "select-all");
      const isAllSelected =
        selectedOptions.length - 1 === allServices.length &&
        allServices.every((svc) => selectedOptions.some((selected) => selected.value === svc.value));

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

  const readImageDataUrl = (files: File[]): Promise<string | undefined> => {
    if (!files.length) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(files[0]);
    });
  };

  const onSubmitForm = async (data: RequestedCategoryFormValues) => {
    const name = data.name.trim();
    const description = data.desc.trim();
    if (!name) {
      showErrorAlert("Category name is required");
      return;
    }
    if (serviceIds.length === 0) {
      showErrorAlert("Please select at least one service");
      return;
    }
    if (!description) {
      showErrorAlert("Description is required");
      return;
    }

    let image_url: string | undefined = request?.image_url;
    if (fileInputs.length > 0) {
      try {
        image_url = await readImageDataUrl(fileInputs);
      } catch {
        showErrorAlert("Could not read image file");
        return;
      }
    }

    if (isAdd && !image_url) {
      showErrorAlert("Please select an image");
      return;
    }

    const payload = {
      name,
      service_ids: serviceIds.filter((id) => id !== "select-all"),
      description,
      image_url,
    };

    if (isAdd) {
      const ok = await createRequestedCategory(payload);
      if (ok) {
        showSuccessAlert("Category request submitted");
        onRefreshData();
        onClose();
      }
      return;
    }

    if (!request?._id) {
      showErrorAlert("Unable to update. ID is missing.");
      return;
    }

    const ok = await updateRequestedCategory(request._id, {
      ...payload,
      image_url: image_url ?? request.image_url,
    });
    if (ok) {
      showSuccessAlert("Category request updated");
      onRefreshData();
      onClose();
    }
  };

  const modalTitle = isAdd
    ? "Add category request"
    : isEditing
      ? "Edit category request"
      : "Category request details";

  const servicesDisplayView =
    request && (request.service_names?.length ? request.service_names.join(", ") : "-");

  const renderViewBody = () => {
    if (!request) return null;
    const img = resolveImageSrc(request.image_url);
    const displayImg = img ?? sampleCategoryViewImage;
    return (
      <section className="custom-other-details" style={{ padding: "10px" }}>
        <Row className="d-flex justify-content-between align-items-center mb-2">
          <Col>
            <h3 className="mb-0">Request information</h3>
          </Col>
          <Col className="text-end">
            <i
              className="bi bi-pencil-fill fs-6 text-danger"
              style={{ cursor: "pointer" }}
              role="button"
              aria-label="Edit request"
              onClick={() => setIsEditing(true)}
            />
          </Col>
        </Row>
        <div className="row">
          <div className="col-md-12 custom-helper-column">
            <DetailsRow title="Category name" value={request.name} />
            <FullDetailsRow title="Services" value={servicesDisplayView ?? "-"} />
            <FullDetailsRow title="Description" value={request.description || "-"} />
            <Row className="row custom-personal-row">
              <label className="col custom-personal-row-title">Status</label>
              <label className="col custom-personal-row-value text-truncate">
                <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>
              </label>
            </Row>
            <div className="mt-2">
              <p className="mb-1" style={{ color: "var(--primary-color)", fontWeight: 600 }}>
                Category image
              </p>
              <img
                alt=""
                src={displayImg}
                style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  };

  const existingForUploader = useMemo(
    () =>
      request?.image_url && !String(request.image_url).startsWith("data:")
        ? [request.image_url]
        : [],
    [request?.image_url]
  );

  const renderFormBody = () => (
    <form
      noValidate
      id="franchise-requested-category-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmitForm)(e);
      }}
    >
      <Row>
        <Col md={12}>
          <CustomFormInput
            label="Category name"
            controlId="name"
            placeholder="Enter category name"
            register={register}
            error={errors.name}
            asCol={false}
            validation={{ required: "Category name is required" }}
          />
        </Col>
        <Col md={12}>
          <CustomMultiSelect
            label="Services"
            controlId="Service"
            options={serviceOptions}
            value={selectedServiceOptions}
            onChange={(selectedOptions) => {
              handleServiceSelection(selectedOptions as ServiceOption[]);
            }}
            asCol={false}
            menuPortal
            selectedChipsMaxHeight="150px"
          />
        </Col>
        <Col md={12}>
          <CustomImageUploader
            label="Upload category image"
            maxFiles={1}
            isEditable={!isAdd}
            existingImages={existingForUploader}
            onFileChange={(files) => {
              setFileInputs(files);
            }}
          />
          <label style={{ color: "var(--primary-color)" }}>Image size should be 512*512</label>
          {request?.image_url && String(request.image_url).startsWith("data:") ? (
            <div className="mt-2">
              <p className="small text-muted mb-1">Current image</p>
              <img
                alt=""
                src={request.image_url}
                style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, objectFit: "cover" }}
              />
            </div>
          ) : null}
        </Col>
        <Col md={12}>
          <CustomFormInput
            label="Description"
            controlId="desc"
            placeholder="Enter description"
            register={register}
            error={errors.desc}
            asCol={false}
            validation={{ required: "Description is required" }}
            as="textarea"
            rows={4}
          />
        </Col>
      </Row>
      <Row className="mt-4">
        <Col xs={12} className="text-center d-flex justify-content-end gap-3">
          <Button type="submit" className="custom-btn-primary">
            {isAdd ? "Submit request" : "Update"}
          </Button>
          <Button
            type="button"
            className="custom-btn-secondary"
            onClick={() => {
              if (!isAdd && isEditing) {
                setIsEditing(false);
                return;
              }
              onClose();
            }}
          >
            Cancel
          </Button>
        </Col>
      </Row>
    </form>
  );

  return (
    <Modal
      show
      onHide={onClose}
      centered
      dialogClassName="custom-big-modal"
      enforceFocus={false}
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          {modalTitle}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="px-4 pb-4 pt-0">
        {!isAdd && !isEditing && renderViewBody()}
        {(isAdd || isEditing) && renderFormBody()}
      </Modal.Body>
    </Modal>
  );
};

RequestedCategoryDialog.showAdd = (
  franchiseServiceOptions: ServiceOption[],
  onRefreshData: () => void
) => {
  openDialog("franchise-requested-category-modal", (close) => (
    <RequestedCategoryDialog
      mode="add"
      request={null}
      franchiseServiceOptions={franchiseServiceOptions}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

RequestedCategoryDialog.showView = (
  request: RequestedCategoryRow,
  franchiseServiceOptions: ServiceOption[],
  onRefreshData: () => void
) => {
  openDialog("franchise-requested-category-modal", (close) => (
    <RequestedCategoryDialog
      mode="view-edit"
      request={request}
      franchiseServiceOptions={franchiseServiceOptions}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default RequestedCategoryDialog;
