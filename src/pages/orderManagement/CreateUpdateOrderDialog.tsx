import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions, showLog } from "../../helper/utility";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";

type CreateUpdateOrderDialogProps = {
    isEditable: boolean;
    order: OrderModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const CreateUpdateOrderDialog: React.FC<CreateUpdateOrderDialogProps> & {
    show: (isEditable: boolean, order: OrderModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, order, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<OrderModel>({
        defaultValues: {
            // name: service?.name || "",
            // desc: service?.desc || "",
            // price: service?.price || 0,
            // is_active: service?.is_active ?? true,
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

            // if (isEditable && order) {
            //     setStateIds(order.state_id);
            //     setCityIds(order.city_id);
            //     await fetchCityFromApi(order.state_id);
            // }
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

    const onSubmitEvent = async (data: OrderModel) => {

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
            // name: data.name,
            // desc: data.desc,
            // price: data.price,
            // is_active: data.is_active,
            // category_id: data.category_id,
            city_ids: cityIds,
            state_ids: stateIds,
            ...(image_url !== "" && { image_url })
        };

        let responseService;
        if (isEditable) {
            if (!order?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            responseService = await createOrUpdateOrder(payload, true, order?._id);
        } else {
            responseService = await createOrUpdateOrder(payload, false,);
        }

        if (responseService) {
            onClose && onClose();
            onRefreshData();
        }
    };

    // useEffect(() => {
    //     if (isEditable && service?.is_active !== undefined) {
    //         setValue("is_active", service.is_active);
    //     }
    // }, [isEditable, service?.is_active]);

    // useEffect(() => {
    //     if (service?.category_id && categories.length > 0) {
    //         const selectedCategory = categories.find((category) => category.value === service.category_id);
    //         if (selectedCategory) {
    //             setValue("category_id", service.category_id);
    //         }
    //     }
    // }, [categories, service?.category_id, setValue]);

    return (
        <Modal show={true} onHide={onClose} centered>
            <div className="custom-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Update" : "Create"} Order
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="order-form"
                        id="order-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <section className="custom-other-details" style={{ padding: "10px" }}>
                            <h3>User</h3>
                        </section>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    {isEditable ? "Update" : "Create"}
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
    );
};

CreateUpdateOrderDialog.show = (isEditable: boolean, order: OrderModel | null, onRefreshData: () => void) => {
    const existingModal = document.getElementById("order-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "order-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <CreateUpdateOrderDialog
            isEditable={isEditable}
            order={order}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default CreateUpdateOrderDialog;
