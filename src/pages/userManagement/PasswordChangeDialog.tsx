import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { getRoleLabel, getStatusOptions, showLog } from "../../helper/utility";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateUser } from "../../services/userService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldRadio from "../../components/CustomTextFieldRadio";
import CustomTextFieldUpload from "../../components/CustomTextFieldUpload";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";

type PasswordChangeDialogProps = {
    user: UserModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const PasswordChangeDialog: React.FC<PasswordChangeDialogProps> & {
    show: (user: UserModel, onRefreshData: () => void) => void;
} = ({ user, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<UserModel>();

    const onSubmitEvent = async (data: any) => {
        const payload = {
            type: user.type,
            password: data.password
        };

        let responseUser = await createOrUpdateUser(payload, true, user?._id);

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
                        Change Password
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="change-password-form"
                        id="change-password-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <CustomTextField
                                label="New Password"
                                controlId="password"
                                placeholder="Enter New Password"
                                register={register}
                                error={errors.password}
                                validation={{ required: "New password is required" }}
                                inputType="password"                             
                                asCol={false}
                            />
                            <CustomTextField
                                label="Confirm Password"
                                controlId="confirm_password"
                                placeholder="Enter Confirm Password"
                                register={register}
                                error={errors.confirm_password}
                                validation={{
                                    required: "Confirm password is required",
                                    validate: (value: string) =>
                                        value === watch("password") || "Passwords do not match",
                                }}
                                inputType="password"
                                asCol={false}
                            />
                        </Row>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    Save
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

PasswordChangeDialog.show = (user: UserModel, onRefreshData: () => void) => {
    const existingModal = document.getElementById("password-change-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "password-change-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <PasswordChangeDialog
            user={user}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default PasswordChangeDialog;
