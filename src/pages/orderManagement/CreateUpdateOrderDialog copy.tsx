import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { DetailsRow, getStatusOptions, ShowDetailsRow, showLog } from "../../helper/utility";
import CustomFormSelect from "../../components/CustomFormSelect";
import CustomImageUploader from "../../components/CustomImageUploader";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import CustomMultiSelect from "../../components/CustomMultiSelect";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import addIcon from "../../assets/icons/add.svg";
import { fetchServiceDropDown } from "../../services/servicesService";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { OrderItemModel } from "../../models/OrderItemModel";

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
        getValues,
        formState: { errors },
    } = useForm<OrderModel>({
        defaultValues: {
        },
    });
    const [serviceItems, setServiceItems] = useState<OrderItemModel[]>([
        {
            _id: "",
            order_id: "",
            service_id: "",
            service_price: 0,
            service_date: "",
            service_from_time: "",
            service_to_time: "",
        },
    ]);

    const [categories, setCategory] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const [services, setService] = useState<{ value: string; label: string }[]>([]);
    const fetchCategoryRef = useRef(false);
    const fetchCityRef = useRef(false);
    const fetchServiceRef = useRef(false);

    const fetchCategoryFromApi = async (cityId: string) => {
        if (fetchCategoryRef.current) return;
        fetchCategoryRef.current = true;
        try {
            const categoryOptions = await fetchCategoryDropDown();
            setCategory(categoryOptions);
        } finally {
            fetchCategoryRef.current = false;
        }
    };

    const fetchCityFromApi = async () => {
        if (fetchCityRef.current) return;
        fetchCityRef.current = true;
        try {
            const cityOptions = await fetchCityDropDown();
            setCity(cityOptions);
        } finally {
            fetchCityRef.current = false;
        }
    };

    const fetchServiceFromApi = async (categoryId: string) => {
        if (fetchServiceRef.current) return;
        fetchServiceRef.current = true;
        try {
            const serviceOptions = await fetchServiceDropDown();
            setService(serviceOptions);
        } finally {
            fetchServiceRef.current = false;
        }
    };

    useEffect(() => {
        // fetchDataFromApi();
        fetchCityFromApi();
    }, []);

    const onSubmitEvent = async (data: any) => {

        const payload = {
            // name: data.name,
            // desc: data.desc,
            // price: data.price,
            // is_active: data.is_active,
            // category_id: data.category_id,
            // city_ids: cityIds,
            // state_ids: stateIds,
            // ...(image_url !== "" && { image_url })
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

    const addServiceItem = () => {
        setServiceItems([
            ...serviceItems,
            {
                _id: "",
                order_id: "",
                service_id: "",
                service_price: 0,
                service_date: "",
                service_from_time: "",
                service_to_time: "",
            },
        ]);
    };


    const removeServiceItem = (index: number) => {
        if (serviceItems.length > 1) {
            setServiceItems(serviceItems.filter((_, i) => i !== index));
        }
    };

    const handleInputChange = (index: number, field: keyof OrderItemModel, value: any) => {
        const updatedServices = [...serviceItems];
        updatedServices[index] = { ...updatedServices[index], [field]: value };
        setServiceItems(updatedServices);
        //setValue(`${field}_${index}`, value);
    };

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
                        onSubmit={handleSubmit(onSubmitEvent)}>
                        <section className="custom-other-details" style={{ padding: "10px" }}>
                            <h3>User</h3>

                            <Row>
                                <Col xs={4}>
                                    <CustomTextField
                                        label="Phone No"
                                        controlId="user_phone_number"
                                        placeholder="Enter Phone Number"
                                        register={register}
                                        error={errors.user_phone_number}
                                        validation={{ required: "Phone number is required" }}
                                    />
                                </Col>
                                <ShowDetailsRow title="User ID" value="U123" />
                                <ShowDetailsRow title="User Name" value="User name 123" />
                            </Row>
                            <Row>
                                <ShowDetailsRow title="Location" value="Location 123" />
                                <ShowDetailsRow title="Address" value="Kalawad road, 150ft ring road rajkot" />
                            </Row>
                        </section>
                        <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                            <Row>
                                <Col xs={4} className="mt-2">
                                    <CustomTextFieldSelect
                                        label="City"
                                        controlId="City"
                                        options={cities}
                                        register={register}
                                        fieldName="city_id"
                                        error={errors.city_id}
                                        requiredMessage="Please select city"
                                        defaultValue={isEditable
                                            ? order?.city_id
                                                ? order?.city_id
                                                : ""
                                            : ""}
                                        setValue={setValue as (name: string, value: any) => void}
                                        onChange={async (e) =>
                                            await fetchCategoryFromApi(e.target.value)
                                        }
                                    />
                                </Col>
                                <Col xs={4} className="mt-2">
                                    <CustomTextFieldSelect
                                        label="Category"
                                        controlId="Category"
                                        options={categories}
                                        register={register}
                                        fieldName="category_id"
                                        error={errors.category_id}
                                        requiredMessage="Please select category"
                                        defaultValue={isEditable
                                            ? order?.category_id
                                                ? order?.category_id
                                                : ""
                                            : ""}
                                        setValue={setValue as (name: string, value: any) => void}
                                        onChange={async (e) =>
                                            await fetchCategoryFromApi(e.target.value)
                                        }
                                    />
                                </Col>
                                <Col xs={4} className="mt-2">
                                    <div className="d-flex justify-content-end">
                                        <Button className="custom-add-button"
                                            onClick={() => { addServiceItem(); }}>
                                            <img src={addIcon} />
                                            Add
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </section>
                        {serviceItems.map((service, index) => (
                            <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                                <Row className="d-flex justify-content-between align-items-center">
                                    <Col>
                                        <h3 className="mb-0">Service</h3>
                                    </Col>
                                    <Col className="text-end">
                                        <label
                                            onClick={(e) => { e.preventDefault(); removeServiceItem(index); }}
                                            className="custom-document-delete">
                                            Remove
                                        </label>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={4} className="mt-2">
                                        <CustomTextFieldSelect
                                            label="Service"
                                            controlId="Service"
                                            options={services}
                                            register={register}
                                            fieldName={`service_id_${index}`}
                                            error={errors?.[`service_id_${index}` as keyof typeof errors]?.message}
                                            requiredMessage="Please select service"
                                            defaultValue={isEditable ? service?.service_id || "" : ""}
                                            setValue={setValue as (name: string, value: any) => void}
                                            onChange={(e) => handleInputChange(index, "service_id", e.target.value)}
                                        />
                                    </Col>
                                    <Col xs={4} className="mt-2">
                                        <CustomTextField
                                            label="Price"
                                            controlId="price"
                                            placeholder="Enter Price"
                                            register={register}
                                            error={errors?.[`service_price_${index}` as keyof typeof errors]?.message}
                                            validation={{ required: "Price is required" }}
                                            isEditable={false}
                                        />
                                    </Col>
                                </Row>
                                <Row>
                                    <Col xs={4} className="mt-2">
                                        <CustomTextFieldDatePicket
                                            label="Service Date"
                                            controlId="service_date"
                                            selectedDate={service?.service_date ?? getValues(`service_date_${index}` as keyof OrderModel)}
                                            onChange={(date) => handleInputChange(index, "service_date", date?.toISOString() || "")}
                                            placeholderText="Select service date"
                                            error={errors?.[`service_date_${index}` as keyof typeof errors]?.message}
                                            register={register}
                                            validation={{ required: "Service date is required" }}
                                            setValue={setValue}
                                        />
                                    </Col>
                                    <Col xs={4} className="mt-2">
                                        <CustomTextFieldTimePicket
                                            label="From Time"
                                            controlId="service_from_time"
                                            selectedTime={service?.service_from_time ?? getValues(`service_from_time_${index}` as keyof OrderModel)}
                                            onChange={(date) => handleInputChange(index, "service_from_time", date?.toISOString() || "")}
                                            placeholderText="Select from time"
                                            error={errors?.[`service_from_time_${index}` as keyof typeof errors]?.message}
                                            register={register}
                                            validation={{ required: "From time is required" }}
                                            setValue={setValue}
                                            filterTime={(time) => {
                                                const hour = time.getHours();
                                                return hour >= 8 && hour <= 23;
                                            }}
                                        />
                                    </Col>
                                    <Col xs={4} className="mt-2">
                                        <CustomTextFieldTimePicket
                                            label="To Time"
                                            controlId="service_to_time"
                                            selectedTime={service?.service_to_time ?? getValues(`service_to_time_${index}` as keyof OrderModel)}
                                            onChange={(date) => handleInputChange(index, "service_to_time", date?.toISOString() || "")}
                                            placeholderText="Select to time"
                                            error={errors?.[`service_to_time_${index}` as keyof typeof errors]?.message}
                                            register={register}
                                            validation={{ required: "To time is required" }}
                                            setValue={setValue}
                                            filterTime={(time) => {
                                                const hour = time.getHours();
                                                return hour >= 8 && hour <= 23;
                                            }}
                                        />
                                    </Col>
                                </Row>
                            </section>
                        ))}
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