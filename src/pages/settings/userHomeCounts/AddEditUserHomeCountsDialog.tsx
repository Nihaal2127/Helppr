import React from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../../components/CustomCloseButton";
import { showErrorAlert } from "../../../helper/alertHelper";
import CustomTextField from "../../../components/CustomTextField";
import { UserHomeCountsModel } from "../../../models/UserHomeCountsModel";
import { createOrUpdateUserHomeCounts } from "../../../services/userHomeCountsService"

type AddEditUserHomeCountsDialogProps = {
    isEditable: boolean;
    userHomeCounts: UserHomeCountsModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditUserHomeCountsDialog: React.FC<AddEditUserHomeCountsDialogProps> & {
    show: (isEditable: boolean, userHomeCounts: UserHomeCountsModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, userHomeCounts, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UserHomeCountsModel>({
        defaultValues: {
            total_distance_travelled: userHomeCounts?.total_distance_travelled || 0,
            served: userHomeCounts?.served || 0,
            consulted: userHomeCounts?.consulted || 0,
            captured: userHomeCounts?.captured || 0,
        },
    });

    const onSubmitEvent = async (data: UserHomeCountsModel) => {

        const payload = {
            total_distance_travelled: data.total_distance_travelled,
            served: data.served,
            consulted: data.consulted,
            captured: data.captured,
        };

        let response;
        if (isEditable) {
            if (!userHomeCounts?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }
            response = await createOrUpdateUserHomeCounts(payload, true, userHomeCounts?._id);
        } else {
            response = await createOrUpdateUserHomeCounts(payload, false,);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Edit" : "Add"} User Home Counts
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
                            <CustomTextField
                                label="Total Distance Travelled"
                                controlId="total_distance_travelled"
                                placeholder="Enter total distance travelled"
                                register={register}
                                error={errors.total_distance_travelled}
                                validation={{ required: "Total distance travelled is required" }}
                            />
                             <CustomTextField
                                label="Served"
                                controlId="served"
                                placeholder="Enter served"
                                register={register}
                                error={errors.served}
                                validation={{ required: "Served is required" }}
                            />
                             <CustomTextField
                                label="Consulted"
                                controlId="consulted"
                                placeholder="Enter consulted"
                                register={register}
                                error={errors.consulted}
                                validation={{ required: "Consulted fee is required" }}
                            />
                             <CustomTextField
                                label="Captured"
                                controlId="captured"
                                placeholder="Enter captured"
                                register={register}
                                error={errors.captured}
                                validation={{ required: "Captured is required" }}
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
        </>
    );
};

AddEditUserHomeCountsDialog.show = (isEditable: boolean, userHomeCounts: UserHomeCountsModel | null, onRefreshData: () => void) => {
    const existingModal = document.getElementById("add-user-details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "add-user-details-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddEditUserHomeCountsDialog
            isEditable={isEditable}
            userHomeCounts={userHomeCounts}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddEditUserHomeCountsDialog;
