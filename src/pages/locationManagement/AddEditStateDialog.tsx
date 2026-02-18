import React, { useEffect, } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { StateModel } from "../../models/StateModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateState } from "../../services/stateService";
import { openDialog, } from "../../helper/DialogManager";

type AddEditStateDialogProps = {
    isEditable: boolean;
    state: StateModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditStateDialog: React.FC<AddEditStateDialogProps> & {
    show: (
        isEditable: boolean,
        state: StateModel | null,
        onRefreshData: () => void
    ) => void;
} = ({ isEditable, state, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<StateModel>({
        defaultValues: {
            name: state?.name || "",
            is_active: state?.is_active ?? true,
        },
    });

    useEffect(() => {
        if (isEditable && state?.is_active !== undefined) {
            setValue("is_active", state.is_active);
        }
    }, [isEditable, state?.is_active]);


    const onSubmitEvent = async (data: StateModel) => {
        const payload = {
            name: data.name,
            is_active: data.is_active,
        };
        let response;

        if (isEditable) {
            if (!state?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            response = await createOrUpdateState(payload, true, state._id);
        } else {
            response = await createOrUpdateState(payload, false);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Edit" : "Add"} State
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
                    <Row>

                        <CustomFormInput
                            label=""
                            controlId="name"
                            placeholder="Enter State Name"
                            register={register}
                            error={errors.name}
                            asCol={false}
                            validation={{ required: "State name is required" }}
                        />

                        <CustomRadioSelection
                            label=""
                            name="is_active"
                            options={getStatusOptions()}
                            defaultValue={isEditable ? state?.is_active?.toString() : "true"}
                            isEditable={isEditable}
                            setValue={setValue}
                        />
                    </Row>
                    <Row className="mt-4">
                        <Col xs={6} className="text-center">
                            <Button type="submit" className="custom-btn-primary" >
                                {isEditable ? "Update" : "Add"}
                            </Button>
                        </Col>
                        <Col xs={6} className="text-center" onClick={onClose}>
                            <Button className="custom-btn-secondary">
                                Cancel
                            </Button>
                        </Col>
                    </Row>
                </form>
            </Modal.Body>
        </Modal>
    );
};

AddEditStateDialog.show = (
    isEditable: boolean,
    state: StateModel | null,
    onRefreshData: () => void
) => {
  openDialog("details-modal", (close) => (
        <AddEditStateDialog
            isEditable={isEditable}
            state={state}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditStateDialog;
