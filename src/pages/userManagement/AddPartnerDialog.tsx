import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { getStatusOptions } from "../../helper/utility";
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

type AddPartnerDialogProps = {
    onClose: () => void;
    onRefreshData: () => void;
};

const AddPartnerDialog: React.FC<AddPartnerDialogProps> & {
    show: (onRefreshData: () => void) => void;
} = ({ onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<UserModel>({});

    const [fileInputs, setFileInputs] = useState<File[]>([]);
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

            let { response, fileList } = await createOrUpdateDocument(formData, false);
            if (response) {
                if (fileList.length > 0) {
                    profile_url = fileList[0].toString();
                }
            }
        }

        if (profile_url === "") {
            showErrorAlert("Please select image");
            return;
        }
        const payload = {
            type: 2,
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

            ...(profile_url !== "" && { profile_url })
        };

        const responseUser = await createOrUpdateUser(payload, false,);

        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    useEffect(() => {
        fetchStateFromApi();
    }, []);

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                centered
            >
                <div className="custom-model-detail">
                    <Modal.Header className="py-3 px-4 border-bottom-0">
                        <Modal.Title as="h5" className="custom-modal-title">
                            Add Partner
                        </Modal.Title>
                        <CustomCloseButton onClose={onClose} />
                    </Modal.Header>
                    <Modal.Body className="px-4 pb-4 pt-0">
                        <form
                            noValidate
                            name="partner-form"
                            id="partner-form"
                            onSubmit={handleSubmit(onSubmitEvent)}
                        >
                            <Row>
                                <Col xs={4}>
                                    <Row>
                                        <span className="custom-model-detail-title">Basic Details</span>
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
                                            defaultValue=""
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
                                            defaultValue=""
                                            setValue={setValue as (name: string, value: any) => void}
                                        />
                                        <CustomTextFieldUpload
                                            label="Profile Photo"
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                            }}
                                        />
                                        <CustomTextFieldRadio
                                            label="Status"
                                            name="is_active"
                                            options={getStatusOptions()}
                                            defaultValue={"true"}
                                            setValue={setValue}
                                        />
                                    </Row>
                                </Col>
                                <Col xs={4}>
                                    <Row>
                                        <span className="custom-model-detail-title">Documents</span>
                                        <CustomTextFieldUpload
                                            label="Aadhar Card"
                                            labelSize={6}
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                            }}
                                        />
                                        <CustomTextFieldUpload
                                            label="Pan Card"
                                            labelSize={6}
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                            }}
                                        />
                                        <CustomTextFieldUpload
                                            label="Vehicle Registration"
                                            labelSize={6}
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                            }}
                                        />
                                        <CustomTextFieldUpload
                                            labelSize={6}
                                            label="Driving License"
                                            onFileChange={(files, replaceUrls) => {
                                                setFileInputs(files);
                                            }}
                                        />
                                    </Row>
                                </Col>
                                <Col xs={4}>
                                    <Row>
                                        <span className="custom-model-detail-title">Bank Info</span>
                                        <CustomTextField
                                            label="Account Name"
                                            controlId="name"
                                            placeholder="Enter Account Name"
                                            register={register}
                                            error={errors.name}
                                            validation={{ required: "Account name is required" }}
                                            labelSize={5}
                                        />
                                        <CustomTextField
                                            label="Account Number"
                                            controlId="email"
                                            placeholder="Enter Account Number"
                                            register={register}
                                            error={errors.email}
                                            validation={{ required: "Account number is required" }}
                                            labelSize={5}
                                        />
                                        <CustomTextField
                                            label="IFSC Code"
                                            controlId="phone_number"
                                            placeholder="Enter IFSC Code"
                                            register={register}
                                            error={errors.phone_number}
                                            validation={{ required: "IFSC code is required" }}
                                            labelSize={5}
                                        />
                                        <CustomTextField
                                            label="Bank Name"
                                            controlId="address"
                                            placeholder="Enter Bank Name"
                                            register={register}
                                            error={errors.address}
                                            validation={{ required: "Bank name is required" }}
                                            labelSize={5}
                                        />
                                    </Row>
                                </Col>
                            </Row>

                            <Row className="mt-4">
                                <Col xs={6} className="text-center">
                                    <Button type="submit" className="custom-btn-primary" >
                                        Add
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
                </div>
            </Modal>
        </>
    );
};

AddPartnerDialog.show = (onRefreshData: () => void) => {
    const existingModal = document.getElementById("details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "details-modal"; 

    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddPartnerDialog
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddPartnerDialog;
