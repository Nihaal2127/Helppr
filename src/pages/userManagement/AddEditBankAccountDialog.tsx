import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { showErrorAlert } from "../../helper/alertHelper";
import { createOrUpdateUser } from "../../services/userService";
import CustomTextField from "../../components/CustomTextField";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";

type AddEditBankAccountDialogProps = {
    isEditable: boolean;
    user: UserModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditBankAccountDialog: React.FC<AddEditBankAccountDialogProps> & {
    show: (isEditable: boolean, user: UserModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, user, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<UserModel>({
        defaultValues: {
            name: user?.name || "",
            email: user?.email || "",
            phone_number: user?.phone_number || "",
            address: user?.address || "",
            state_id: user?.state_id || "",
            city_id: user?.city_id || "",
            is_active: user?.is_active ?? true,
        },
    });

    const onSubmitEvent = async (data: UserModel) => {

        const payload = {
            type: 2,
            is_from_web: true,
            registration_type:1,
            created_by_id:getLocalStorage(AppConstant.createdById),
            name: data.name,
            email: data.email,
            phone_number: data.phone_number,
            address: data.address,
            state_id: data.state_id,
            city_id: data.city_id,
            is_active: data.is_active,
        };

        let responseUser;
        if (isEditable) {
            if (!user?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }
            responseUser = await createOrUpdateUser(payload, true, user?._id);
        } else {
            responseUser = await createOrUpdateUser(payload, false,);
        }

        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Edit" : "Add"} Bank
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
                                label="Account Name"
                                controlId="name"
                                placeholder="Enter Account Name"
                                register={register}
                                error={errors.name}
                                validation={{ required: "Account name is required" }}
                            />
                            <CustomTextField
                                label="Account Number"
                                controlId="email"
                                placeholder="Enter Account Number"
                                register={register}
                                error={errors.email}
                                validation={{ required: "Account number is required" }}
                            />
                            <CustomTextField
                                label="IFSC Code"
                                controlId="phone_number"
                                placeholder="Enter IFSC Code"
                                register={register}
                                error={errors.phone_number}
                                validation={{ required: "IFSC code is required" }}
                            />
                            <CustomTextField
                                label="Bank Name"
                                controlId="address"
                                placeholder="Enter Bank Name"
                                register={register}
                                error={errors.address}
                                validation={{ required: "Bank name is required" }}
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

AddEditBankAccountDialog.show = (isEditable: boolean, user: UserModel | null, onRefreshData: () => void) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddEditBankAccountDialog
            isEditable={isEditable}
            user={user}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddEditBankAccountDialog;
