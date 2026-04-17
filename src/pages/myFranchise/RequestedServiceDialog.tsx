import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { useForm, UseFormRegister } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader from "../../components/CustomImageUploader";
import { DetailsRow, FullDetailsRow } from "../../helper/utility";
import { openDialog } from "../../helper/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";
import type { RequestedServiceRow } from "../../services/myFranchiseService";
import {
  createRequestedService,
  updateRequestedService,
} from "../../services/myFranchiseService";
import { fetchCategoryDropDown } from "../../services/categoryService";
import sampleServiceViewImage from "../../assets/icons/profile.svg";

type CategoryOption = { value: string; label: string };

type RequestedServiceFormValues = {
  name: string;
  category_id: string;
  desc: string;
};

type RequestedServiceDialogProps = {
  onClose: () => void;
  onRefreshData: () => void;
  categoryOptions: CategoryOption[];
} & (
  | { mode: "add"; request: null }
  | { mode: "view-edit"; request: RequestedServiceRow }
);

function resolveImageSrc(url?: string): string | null {
  if (!url || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith("data:")) return u;
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

const RequestedServiceDialog: React.FC<RequestedServiceDialogProps> & {
  showAdd: (categoryOptions: CategoryOption[], onRefreshData: () => void) => void;
  showView: (request: RequestedServiceRow, categoryOptions: CategoryOption[], onRefreshData: () => void) => void;
} = (props) => {
  const { onClose, onRefreshData, categoryOptions } = props;
  const isAdd = props.mode === "add";
  const request = isAdd ? null : props.request;

  const [isEditing, setIsEditing] = useState(isAdd);
  const [fileInputs, setFileInputs] = useState<File[]>([]);
  const [effectiveCategoryOptions, setEffectiveCategoryOptions] = useState<CategoryOption[]>(categoryOptions);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fromApi = await fetchCategoryDropDown();
        if (!cancelled && Array.isArray(fromApi) && fromApi.length > 0) {
          setEffectiveCategoryOptions(fromApi);
          return;
        }
      } catch {
        /* fall back to franchise categories */
      }
      if (!cancelled) {
        setEffectiveCategoryOptions(categoryOptions);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryOptions]);

  useEffect(() => {
    setIsEditing(isAdd);
    setFileInputs([]);
  }, [isAdd, request?._id]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RequestedServiceFormValues>({
    defaultValues: {
      name: "",
      category_id: "",
      desc: "",
    },
  });

  useEffect(() => {
    if (isAdd) {
      reset({ name: "", category_id: "", desc: "" });
      return;
    }
    if (request && isEditing) {
      reset({
        name: request.name,
        category_id: request.category_id,
        desc: request.description ?? "",
      });
    }
  }, [isAdd, request, isEditing, reset]);

  const readImageDataUrl = (files: File[]): Promise<string | undefined> => {
    if (!files.length) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(files[0]);
    });
  };

  const onSubmitForm = async (data: RequestedServiceFormValues) => {
    const name = data.name.trim();
    const category_id = String(data.category_id ?? "").trim();
    const description = data.desc.trim();
    if (!name) {
      showErrorAlert("Service name is required");
      return;
    }
    if (!category_id) {
      showErrorAlert("Please select a category");
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

    if (isAdd) {
      const ok = await createRequestedService({
        name,
        category_id,
        description,
        image_url,
      });
      if (ok) {
        showSuccessAlert("Service request submitted");
        onRefreshData();
        onClose();
      }
      return;
    }

    if (!request?._id) {
      showErrorAlert("Unable to update. ID is missing.");
      return;
    }

    const ok = await updateRequestedService(request._id, {
      name,
      category_id,
      description,
      image_url: image_url ?? request.image_url,
    });
    if (ok) {
      showSuccessAlert("Service request updated");
      onRefreshData();
      onClose();
    }
  };

  const modalTitle = isAdd
    ? "Add service request"
    : isEditing
      ? "Edit service request"
      : "Service request details";

  const renderViewBody = () => {
    if (!request) return null;
    const img = resolveImageSrc(request.image_url);
    const displayImg = img ?? sampleServiceViewImage;
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
              onClick={() => setIsEditing(true)}
            />
          </Col>
        </Row>
        <div className="row">
          <div className="col-md-12 custom-helper-column">
            <DetailsRow title="Service name" value={request.name} />
            <DetailsRow title="Category" value={request.category_name} />
            <FullDetailsRow title="Description" value={request.description || "-"} />
            <Row className="row custom-personal-row">
              <label className="col custom-personal-row-title">Status</label>
              <label className="col custom-personal-row-value text-truncate">
                <span style={{ color: "orange", fontWeight: 600 }}>Pending</span>
              </label>
            </Row>
            <div className="mt-2">
              <p className="mb-1" style={{ color: "var(--primary-color)", fontWeight: 600 }}>
                Service image
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
      id="franchise-requested-service-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmitForm)(e);
      }}
    >
      <Row>
        <Col md={6}>
          <CustomFormInput
            label="Service name"
            controlId="name"
            placeholder="Enter service name"
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
            options={effectiveCategoryOptions}
            register={register as unknown as UseFormRegister<any>}
            fieldName="category_id"
            error={errors.category_id as any}
            asCol={false}
            requiredMessage="Please select category"
            placeholder="Select category"
            defaultValue={isAdd ? "" : request?.category_id ?? ""}
            setValue={(name: string, value: any) => {
              setValue(name as keyof RequestedServiceFormValues, value, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true,
              });
            }}
            menuPortal
          />
        </Col>
        <Col md={12}>
          <CustomImageUploader
            label="Upload Service Image"
            maxFiles={1}
            isEditable={!isAdd}
            existingImages={existingForUploader}
            onFileChange={(files, _replaceUrls) => {
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
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
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

RequestedServiceDialog.showAdd = (categoryOptions: CategoryOption[], onRefreshData: () => void) => {
  openDialog("franchise-requested-service-modal", (close) => (
    <RequestedServiceDialog
      mode="add"
      request={null}
      categoryOptions={categoryOptions}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

RequestedServiceDialog.showView = (
  request: RequestedServiceRow,
  categoryOptions: CategoryOption[],
  onRefreshData: () => void
) => {
  openDialog("franchise-requested-service-modal", (close) => (
    <RequestedServiceDialog
      mode="view-edit"
      request={request}
      categoryOptions={categoryOptions}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default RequestedServiceDialog;
