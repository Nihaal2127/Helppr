import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { ServiceModel } from "../../models/ServiceModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions } from "../../helper/utility";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateService } from "../../services/servicesService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";

type AddEditServiceDialogProps = {
    isEditable: boolean;
    service: ServiceModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditServiceDialog: React.FC<AddEditServiceDialogProps> & {
    show: (isEditable: boolean, category: ServiceModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, service, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ServiceModel>({
        defaultValues: {
            name: service?.name || "",
            desc: service?.desc || "",
            price: service?.price || 0,
            is_active: service?.is_active ?? true,
        },
    });

    const [categories, setCategory] = useState<{ value: string; label: string }[]>([]);
    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const [stateIds, setStateIds] = useState<string[]>([]);
    const [cityIds, setCityIds] = useState<string[]>([]);
    const fetchRef = useRef(false);
    const fetchCityRef = useRef(false);

    const fetchDataFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const categoryOptions = await fetchCategoryDropDown();
            setCategory(categoryOptions);

            const stateOptions = await fetchStateDropDown();
            setState([{ value: "select-all", label: "Select All" }, ...stateOptions]);

            if (isEditable && service) {
                setStateIds(service.state_ids);
                setCityIds(service.city_ids);
                await fetchCityFromApi(service.state_ids);
            }
        } catch (error) {
            console.error("Error fetching category:", error);
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    const fetchCityFromApi = async (stateIdList: string[]) => {
        if (fetchCityRef.current) return;
        fetchCityRef.current = true;
        try {
            const cityOptions = await fetchCityDropDown(stateIdList);
            setCity([{ value: "select-all", label: "Select All" }, ...cityOptions]);
        } catch (error) {
            console.error("Error fetching city:", error);
        } finally {
            fetchCityRef.current = false;
        }
    };

    const handleStateSelection = async (selectedOptions: { value: string; label: string }[]) => {
        const isSelectAllSelected = selectedOptions.some((option) => option.value === "select-all");

        let selectedIds: string[] = [];

        if (isSelectAllSelected) {
            const allStates = states.filter((state) => state.value !== "select-all");
            const isAllSelected =
                states.length === allStates.length &&
                allStates.every((state) => states.includes(state));

            selectedIds = isAllSelected ? [] : allStates.map((state) => state.value);
        } else {
            selectedIds = selectedOptions.map((option) => option.value);
        }

        setStateIds(selectedIds);

        setCity([]);
        setCityIds([]);

        if (selectedIds.length > 0) {
            await fetchCityFromApi(selectedIds);
        }
    };

    const handleCitySelection = (selectedOptions: { value: string; label: string }[],) => {
        const isSelectAllSelected = selectedOptions.some((option) => option.value === "select-all");

        let selectedIds: string[] = [];

        if (isSelectAllSelected) {
            const allCity = cities.filter((city) => city.value !== "select-all");
            const isAllSelected =
                cities.length === allCity.length &&
                allCity.every((city) => cities.includes(city));

            selectedIds = isAllSelected ? [] : allCity.map((city) => city.value);
        } else {
            selectedIds = selectedOptions.map((option) => option.value);
        }

        setCityIds(selectedIds);
    };

    const onSubmitEvent = async (data: ServiceModel) => {

        let image_url = "";
        if (fileInputs.length > 0) {
            const formData = new FormData();
            formData.append("type", "2");
            fileInputs.forEach((file) => formData.append("files", file));
            if (isEditable) {
                if (replaceUrls.length > 0) {
                    formData.append("update_file_urls", JSON.stringify(replaceUrls));
                }
            }

            let { response, fileList } = await createOrUpdateDocument(formData, isEditable);
            if (response) {
                if (fileList.length > 0) {
                    image_url = fileList[0].toString();
                }
            }
        }

        if (!isEditable && image_url === "") {
            showErrorAlert("Please select image");
            return;
        }
        const payload = {
            name: data.name,
            desc: data.desc,
            price: data.price,
            is_active: data.is_active,
            category_id: data.category_id,
            city_ids: cityIds,
            state_ids: stateIds,
            ...(image_url !== "" && { image_url })
        };

        let responseService;
        if (isEditable) {
            if (!service?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            responseService = await createOrUpdateService(payload, true, service?._id);
        } else {
            responseService = await createOrUpdateService(payload, false,);
        }

        if (responseService) {
            onClose && onClose();
            onRefreshData();
        }
    };

    useEffect(() => {
        if (isEditable && service?.is_active !== undefined) {
            setValue("is_active", service.is_active);
        }
    }, [isEditable, service?.is_active]);

    useEffect(() => {
        if (service?.category_id && categories.length > 0) {
            const selectedCategory = categories.find((category) => category.value === service.category_id);
            if (selectedCategory) {
                setValue("category_id", service.category_id);
            }
        }
    }, [categories, service?.category_id, setValue]);

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Edit" : "Add"} Service
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
                            placeholder="Enter Service Name"
                            register={register}
                            error={errors.name}
                            asCol={false}
                            validation={{ required: "Service name is required" }}
                        />
                        <CustomFormInput
                            label=""
                            controlId="desc"
                            placeholder="Enter Service Description"
                            register={register}
                            error={errors.desc}
                            asCol={false}
                            validation={{ required: "Service description is required" }}
                            as="textarea"
                            rows={4}
                        />

                        <CustomFormInput
                            label=""
                            controlId="price"
                            placeholder="Enter Service Price"
                            register={register}
                            error={errors.price}
                            asCol={false}
                            inputType="number"
                            validation={{ required: "Service price is required" }}
                        />

                        <CustomFormSelect
                            label=""
                            controlId="category"
                            options={categories}
                            register={register as unknown as UseFormRegister<any>}
                            fieldName="category_id"
                            error={errors.category_id}
                            asCol={false}
                            requiredMessage="Please select category"
                            defaultValue={isEditable ? service?.category_id : ""}
                            setValue={setValue as (name: string, value: any) => void}
                        />
<CustomMultiSelect
                            label=""
                            controlId="State"
                            options={states}
                            value={states.filter((state) => stateIds.includes(state.value))}
                            onChange={(selectedOptions) => {
                                handleStateSelection(selectedOptions);
                            }}
                            asCol={false}
                        />
                        <CustomMultiSelect
                            label=""
                            controlId="City"
                            options={cities}
                            value={cities.filter((city) => cityIds.includes(city.value))}
                            onChange={(selectedOptions) => {
                                handleCitySelection(selectedOptions);
                            }}
                            asCol={false}
                        />
                        <CustomImageUploader
                            label="Upload Category Image"
                            maxFiles={1}
                            isEditable={isEditable}
                            existingImages={service?.image_url ? [service.image_url] : []}
                            onFileChange={(files, replaceUrls) => {
                                setFileInputs(files);
                                setReplaceUrl(replaceUrls);
                            }}
                        />
                        <CustomRadioSelection
                            label=""
                            name="is_active"
                            options={getStatusOptions()}
                            defaultValue={isEditable ? service?.is_active?.toString() : "true"}
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

AddEditServiceDialog.show = (isEditable: boolean, category: ServiceModel | null, onRefreshData: () => void) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddEditServiceDialog
            isEditable={isEditable}
            service={category}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddEditServiceDialog;
