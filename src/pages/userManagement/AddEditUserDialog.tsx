import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { getRoleLabel, getStatusOptions } from "../../helper/utility";
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
import { openDialog } from "../../helper/DialogManager";

type AddEditUserDialogProps = {
    role: number;
    isEditable: boolean;
    user: UserModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditUserDialog: React.FC<AddEditUserDialogProps> & {
    show: (role: number, isEditable: boolean, user: UserModel | null, onRefreshData: () => void) => void;
} = ({ role, isEditable, user, onClose, onRefreshData }) => {
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
            pincode: user?.pincode || "",
            is_active: user?.is_active ?? true,
        },
    });

    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);
    const fetchCityRef = useRef(false);

    const fetchStateFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const stateOptions = await fetchStateDropDown();
            setState(stateOptions);

            if (isEditable && user) {
                await fetchCityFromApi(user.state_id ?? "");
            }
        } finally {
            fetchRef.current = false;
        }
    };

    const fetchCityFromApi = async (stateId: string) => {
        if (fetchCityRef.current) return;
        fetchCityRef.current = true;
        try {
            const cityOptions = await fetchCityDropDown([stateId]);
            setCity(cityOptions);
        } finally {
            fetchCityRef.current = false;
        }
    };

    const onSubmitEvent = async (data: UserModel) => {

        let profile_url = "";
        if (fileInputs.length > 0) {
            const formData = new FormData();
            formData.append("type", "4");
            fileInputs.forEach((file) => formData.append("files", file));
            if (isEditable) {
                if (replaceUrls.length > 0) {
                    formData.append("update_file_urls", JSON.stringify(replaceUrls));
                }
            }

            let { response, fileList } = await createOrUpdateDocument(formData, isEditable);
            if (response) {
                if (fileList.length > 0) {
                    profile_url = fileList[0].toString();
                }
            }
        }

        if (!isEditable && profile_url === "") {
            showErrorAlert("Please select image");
            return;
        }
        const payload = {
            type: role,
            is_from_web: true,
            registration_type: 1,
            created_by_id: getLocalStorage(AppConstant.createdById),
            name: data.name,
            email: data.email,
            phone_number: data.phone_number,
            address: data.address,
            state_id: data.state_id,
            city_id: data.city_id,
            is_active: data.is_active,
            pincode: data.pincode,
            ...(profile_url !== "" && { profile_url })
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

    useEffect(() => {
        fetchStateFromApi();
    }, []);

    useEffect(() => {
        if (isEditable && user?.is_active !== undefined) {
            setValue("is_active", user.is_active);
        }
    }, [isEditable, user?.is_active]);

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Update" : "Add"} {getRoleLabel(role)}
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
                                label="Name"
                                controlId="name"
                                placeholder="Enter Name"
                                register={register}
                                error={errors.name}
                                validation={{ required: "Name is required" }}
                            />
                            <CustomTextField
                                label="Email"
                                controlId="email"
                                placeholder="Enter Email"
                                register={register}
                                error={errors.email}
                                validation={{ required: "Email is required" }}
                            />
                            <CustomTextField
                                label="Phone No"
                                controlId="phone_number"
                                placeholder="Enter Phone No"
                                register={register}
                                error={errors.phone_number}
                                validation={{ required: "Phone no is required" }}
                            />
                            <CustomTextField
                                label="Address"
                                controlId="address"
                                placeholder="Enter Address"
                                register={register}
                                error={errors.address}
                                validation={{ required: "Address is required" }}
                            />
                            <CustomTextFieldSelect
                                label="State"
                                controlId="State"
                                options={states}
                                register={register}
                                fieldName="state_id"
                                error={errors.state_id}
                                requiredMessage="Please select state"
                                defaultValue={isEditable
                                    ? user?.state_id
                                        ? user?.state_id
                                        : ""
                                    : ""}
                                setValue={setValue as (name: string, value: any) => void}
                                onChange={(e) =>
                                    fetchCityFromApi(e.target.value)
                                }
                            />
                            <CustomTextFieldSelect
                                label="City"
                                controlId="City"
                                options={cities}
                                register={register}
                                fieldName="city_id"
                                error={errors.city_id}
                                requiredMessage="Please select city"
                                defaultValue={isEditable
                                    ? user?.city_id
                                        ? user?.city_id
                                        : ""
                                    : ""}
                                setValue={setValue as (name: string, value: any) => void}
                            />
                            <CustomTextField
                                label="Pincode"
                                controlId="pincode"
                                placeholder="Enter Pincode"
                                register={register}
                                error={errors.pincode}
                                validation={{ required: "Pincode is required" }}
                            />
                            <CustomTextFieldUpload
                                label="Profile Photo"
                                {...(user?.profile_url ? { existingImages: [user.profile_url] } : [])}
                                onFileChange={(files, replaceUrls) => {
                                    setFileInputs(files);
                                    setReplaceUrl(replaceUrls);
                                }}
                            />
                            <CustomTextFieldRadio
                                label="Status"
                                name="is_active"
                                options={getStatusOptions()}
                                defaultValue={isEditable ? user?.is_active?.toString() : "true"}
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
        </>
    );
};

AddEditUserDialog.show = (role: number, isEditable: boolean, user: UserModel | null, onRefreshData: () => void) => {
    openDialog("add-user-details-modal", (close) => (
        <AddEditUserDialog
            role={role}
            isEditable={isEditable}
            user={user}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default AddEditUserDialog;
