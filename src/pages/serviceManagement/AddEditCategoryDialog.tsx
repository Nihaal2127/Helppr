import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CategoryModel } from "../../models/CategoryModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions } from "../../helper/utility";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateCategory } from "../../services/categoryService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";

type AddEditCategoryDialogProps = {
    isEditable: boolean;
    category: CategoryModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditCategoryDialog: React.FC<AddEditCategoryDialogProps> & {
    show: (isEditable: boolean, category: CategoryModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, category, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CategoryModel>({
        defaultValues: {
            name: category?.name || "",
            desc: category?.desc || "",
            is_active: category?.is_active ?? true,
        },
    });

    const [fileInputs, setFileInputs] = useState<File[]>([]);
    const [replaceUrls, setReplaceUrl] = useState<string[]>([]);
    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const [stateIds, setStateIds] = useState<string[]>([]);
    const [cityIds, setCityIds] = useState<string[]>([]);
    const fetchRef = useRef(false);
    const fetchCityRef = useRef(false);

    const fetchStateFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const stateOptions = await fetchStateDropDown();
            setState([{ value: "select-all", label: "Select All" }, ...stateOptions]);

            if(isEditable && category){
                setStateIds(category.state_ids);
                setCityIds(category.city_ids);
                await fetchCityFromApi(category.state_ids);
            }
        } catch (error) {
            console.error("Error fetching state:", error);
        } finally {
            fetchRef.current = false;
        }
    };

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

    const onSubmitEvent = async (data: CategoryModel) => {

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
                if(fileList.length > 0){
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
            is_active: data.is_active,
            city_ids: cityIds,
            state_ids: stateIds,
            ...(image_url !== "" && { image_url })
        };

        let responseCategory;
        if (isEditable) {
            if (!category?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            responseCategory = await createOrUpdateCategory(payload, true, category?._id);
        } else {
            responseCategory = await createOrUpdateCategory(payload, false,);
        }

        if (responseCategory) {
            onClose && onClose();
            onRefreshData();
        }
    };

    useEffect(() => {
        fetchStateFromApi();
    }, []);

    useEffect(() => {
        if (isEditable && category?.is_active !== undefined) {
            setValue("is_active", category.is_active);
        }
    }, [isEditable, category?.is_active]);

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Edit" : "Add"} Category
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
                            placeholder="Enter Category Name"
                            register={register}
                            error={errors.name}
                            asCol={false}
                            validation={{ required: "Category name is required" }}
                        />
                        <CustomFormInput
                            label=""
                            controlId="desc"
                            placeholder="Enter Category Description"
                            register={register}
                            error={errors.desc}
                            asCol={false}
                            validation={{ required: "Category description is required" }}
                            as="textarea"
                            rows={4}
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
                            existingImages={category?.image_url ? [category.image_url] : []}
                            onFileChange={(files, replaceUrls) => {
                                setFileInputs(files);
                                setReplaceUrl(replaceUrls);
                            }}
                        />
                        <CustomRadioSelection
                            label=""
                            name="is_active"
                            options={getStatusOptions()}
                            defaultValue={isEditable ? category?.is_active?.toString() : "true"}
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

AddEditCategoryDialog.show = (isEditable: boolean, category: CategoryModel | null, onRefreshData: () => void) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <AddEditCategoryDialog
            isEditable={isEditable}
            category={category}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddEditCategoryDialog;
