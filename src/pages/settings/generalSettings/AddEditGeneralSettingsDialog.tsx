import React from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import CustomTextField from "../../../components/CustomTextField";
import { openDialog } from "../../../helper/DialogManager";
import { GeneralSettingsModel } from "./index";

type AddEditGeneralSettingsDialogProps = {
  settingsData: GeneralSettingsModel;
  onClose: () => void;
  onSave: (data: GeneralSettingsModel) => void;
};

const AddEditGeneralSettingsDialog: React.FC<AddEditGeneralSettingsDialogProps> & {
  show: (
    settingsData: GeneralSettingsModel,
    onSave: (data: GeneralSettingsModel) => void
  ) => void;
} = ({ settingsData, onClose, onSave }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GeneralSettingsModel>({
    defaultValues: {
      free_quotes_per_user: settingsData?.free_quotes_per_user || 0,
      no_of_quotes: settingsData?.no_of_quotes || 0,
      price: settingsData?.price || "",
    },
  });

  const onSubmitEvent = (data: GeneralSettingsModel) => {
    onSave(data);
    onClose();
  };

  return (
    <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
      <Modal.Header className="py-3 px-4 border-bottom-0">
        <Modal.Title as="h5" className="custom-modal-title">
          Update General Settings
        </Modal.Title>
        <CustomCloseButton onClose={onClose} />
      </Modal.Header>

      <Modal.Body className="px-4 pb-4 pt-0">
        <form
          noValidate
          name="general-settings-form"
          id="general-settings-form"
          onSubmit={handleSubmit(onSubmitEvent)}
        >
          <Row>
            <CustomTextField
              label="Free Quotes per User"
              controlId="free_quotes_per_user"
              placeholder="Enter free quotes per user"
              register={register}
              error={errors.free_quotes_per_user}
              validation={{ required: "Free quotes per user is required" }}
            />

            <CustomTextField
              label="No of Quotes"
              controlId="no_of_quotes"
              placeholder="Enter number of quotes"
              register={register}
              error={errors.no_of_quotes}
              validation={{ required: "No of quotes is required" }}
            />

            <CustomTextField
              label="Price"
              controlId="price"
              placeholder="Enter price"
              register={register}
              error={errors.price}
              validation={{ required: "Price is required" }}
            />
          </Row>

          <div className="d-flex justify-content-end align-items-center gap-3 mt-4">
            <Button type="submit" className="custom-btn-primary px-4">
              Update
            </Button>
            <Button
              type="button"
              className="custom-btn-secondary px-4"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

AddEditGeneralSettingsDialog.show = (
  settingsData: GeneralSettingsModel,
  onSave: (data: GeneralSettingsModel) => void
) => {
  openDialog("general-settings-modal", (close) => (
    <AddEditGeneralSettingsDialog
      settingsData={settingsData}
      onClose={close}
      onSave={onSave}
    />
  ));
};

export default AddEditGeneralSettingsDialog;