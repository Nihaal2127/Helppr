import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import { useForm } from "react-hook-form";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomImageUploader from "../../components/CustomImageUploader";
import { DetailsRow, FullDetailsRow } from "../../helper/utility";
import { openDialog } from "../../helper/DialogManager";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";
import { AppConstant } from "../../constant/AppConstant";
import type { RequestedCategoryRow } from "../../services/myFranchiseService";
import {
  createRequestedCategory,
  updateRequestedCategory,
} from "../../services/myFranchiseService";
import sampleCategoryViewImage from "../../assets/icons/profile.svg";

type RequestedCategoryFormValues = {
  name: string;
  desc: string;
};

type RequestedCategoryDialogProps = {
  onClose: () => void;
  onRefreshData: () => void;
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
  showAdd: (onRefreshData: () => void) => void;
  showView: (request: RequestedCategoryRow, onRefreshData: () => void) => void;
} = (props) => {
  const { onClose, onRefreshData } = props;
  const isAdd = props.mode === "add";
  const request = isAdd ? null : props.request;

  const [isEditing, setIsEditing] = useState(isAdd);
  const [fileInputs, setFileInputs] = useState<File[]>([]);

  useEffect(() => {
    setIsEditing(isAdd);
    setFileInputs([]);
  }, [isAdd, request]);

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
    }
  }, [isAdd, request, isEditing, reset]);

  const readImageDataUrl = (files: File[]): Promise<string | undefined> => {
    if (!files.length) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
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
      service_ids: isAdd
        ? ([] as string[])
        : (request?.service_ids ?? []).map(String),
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
    ? "Add category"
    : isEditing
    ? "Edit category"
    : "Category request details";

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
            <FullDetailsRow
              title="Description"
              value={request.description || "-"}
            />
            <Row className="row custom-personal-row">
              <label className="col custom-personal-row-title">Status</label>
              <label className="col custom-personal-row-value text-truncate">
                <span style={{ color: "orange", fontWeight: 600 }}>
                  Pending
                </span>
              </label>
            </Row>
            <div className="mt-2">
              <p
                className="mb-1"
                style={{ color: "var(--primary-color)", fontWeight: 600 }}
              >
                Category image
              </p>
              <img
                alt=""
                src={displayImg}
                style={{
                  maxWidth: 160,
                  maxHeight: 160,
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        </div>
      </section>
    );
  };

  const existingForUploader = useMemo(
    () => (request?.image_url ? [String(request.image_url)] : []),
    [request?.image_url]
  );

  const renderFormBody = () => (
    <form
      noValidate
      id="franchise-requested-category-form"
      className="franchise-requested-category-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmitForm)(e);
      }}
    >
      <Row className="g-3">
        <Col xs={12}>
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
        <Col xs={12} md={6}>
          <CustomImageUploader
            label="Upload category image"
            maxFiles={1}
            isEditable={!isAdd}
            existingImages={existingForUploader}
            onFileChange={(files) => {
              setFileInputs(files);
            }}
          />
        </Col>
        <Col xs={12} md={6}>
          <CustomFormInput
            label="Description"
            controlId="desc"
            placeholder="Describe the category and how it will be used"
            register={register}
            error={errors.desc}
            asCol={false}
            validation={{ required: "Description is required" }}
            as="textarea"
            rows={5}
          />
        </Col>
      </Row>
    </form>
  );

  return (
    <Modal
      show
      onHide={onClose}
      centered
      scrollable
      dialogClassName="franchise-requested-category-modal-dialog custom-big-modal"
      contentClassName="franchise-requested-category-modal-content"
      enforceFocus={false}
    >
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          {modalTitle}
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>
      <Modal.Body className="franchise-requested-category-modal-body px-4 pb-3 pt-0">
        {!isAdd && !isEditing && renderViewBody()}
        {(isAdd || isEditing) && renderFormBody()}
      </Modal.Body>
      {(isAdd || isEditing) && (
        <Modal.Footer className="franchise-requested-category-modal-footer border-0 px-4 pb-4 pt-0">
          <Button
            type="submit"
            form="franchise-requested-category-form"
            className="custom-btn-primary"
          >
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
        </Modal.Footer>
      )}
    </Modal>
  );
};

RequestedCategoryDialog.showAdd = (onRefreshData: () => void) => {
  openDialog("franchise-requested-category-modal", (close) => (
    <RequestedCategoryDialog
      mode="add"
      request={null}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

RequestedCategoryDialog.showView = (
  request: RequestedCategoryRow,
  onRefreshData: () => void
) => {
  openDialog("franchise-requested-category-modal", (close) => (
    <RequestedCategoryDialog
      mode="view-edit"
      request={request}
      onClose={close}
      onRefreshData={onRefreshData}
    />
  ));
};

export default RequestedCategoryDialog;
