import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from 'react-hook-form';
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { ShowDetailsRow, showLog } from "../../helper/utility";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchCityDropDown } from "../../services/cityService";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import ServiceItemForm from "./ServiceItemForm";
import { CustomFormInput } from "../../components/CustomFormInput";
import { fetchUserDropDown } from "../../services/userService";
import { UserModel } from "../../models/UserModel";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";
import { showErrorAlert } from "../../helper/alertHelper";
import { OrderItemModel } from "../../models/OrderItemModel";
import { CategoryModel } from "../../models/CategoryModel";

type CreateUpdateOrderDialogProps = {
    isEditable: boolean;
    order: OrderModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const CreateUpdateOrderDialog: React.FC<CreateUpdateOrderDialogProps> & {
    show: (isEditable: boolean, order: OrderModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, order, onClose, onRefreshData }) => {
    const { register, formState: { errors }, setValue, getValues, handleSubmit } = useForm();

    const [categories, setCategory] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<{ value: string; label: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<UserModel>();
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [payments] = useState<{ value: string; label: string }[]>([{ value: "1", label: "COD" }, { value: "2", label: "Credit Card" }]);
    const [serviceItems, setServiceItems] = useState<OrderItemModel[]>([]);

    const fetchRef = useRef(false);

    const fetchCategoryFromApi = async (cityId: string) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const categoryOptions = await fetchCategoryDropDown(cityId);
            setCategory(categoryOptions);
        } finally {
            fetchRef.current = false;
        }
    };

    const fetchUserFromApi = async (phone_number: string) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { users } = await fetchUserDropDown(4);
            setSelectedUser(users.find((user) => user.phone_number === phone_number));
        } finally {
            fetchRef.current = false;
        }
    };

    const fetchDataFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const cityOptions = await fetchCityDropDown();
            setCity(cityOptions);
            const { users } = await fetchUserDropDown(2);
        } finally {
            fetchRef.current = false;
        }
    };


    useEffect(() => {
        fetchDataFromApi();
    }, []);

    const onSubmitEvent = async (data: any) => {

        const payload = {
            user_id: selectedUser?._id,
            user_unique_id: selectedUser?.user_id,
            city_id: data.city_id,
            category_id: data.category_id,
            payment_id: data.payment_id,
            comments: data.comments,
            total_amount: totalAmount,
            service_items: serviceItems,
            created_by_id: getLocalStorage(AppConstant.createdById),
        };

        showLog("payload:", payload);
        // let responseService;
        // if (isEditable) {
        //     if (!order?._id) {
        //         showErrorAlert("Unable to update. ID is missing.");
        //         return;
        //     }

        //     responseService = await createOrUpdateOrder(payload, true, order?._id);
        // } else {
        //     responseService = await createOrUpdateOrder(payload, false,);
        // }

        // if (responseService) {
        //     onClose && onClose();
        //     onRefreshData();
        // }
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
                <Modal.Body className="px-4 pb-4 pt-0" style={{ maxHeight: "70vh", overflowY: "auto" }}>
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
                                        // value={isEditable
                                        //     ? order?.user_phone_number
                                        //         ? order?.user_phone_number
                                        //         : getValues("user_phone_number")
                                        //     : getValues("user_phone_number")}
                                        onChange={async (value) => await fetchUserFromApi(value)}
                                    />
                                </Col>
                                <ShowDetailsRow title="User ID" value={selectedUser?.user_id} />
                                <ShowDetailsRow title="User Name" value={selectedUser?.name} />
                            </Row>
                            <Row>
                                <ShowDetailsRow title="Location" value={selectedUser?.city_name} />
                                <ShowDetailsRow title="Address" value={selectedUser?.address} />
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
                                                : getValues("city_id")
                                            : getValues("city_id")}
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
                                                : getValues("category_id")
                                            : getValues("category_id")}
                                        setValue={setValue as (name: string, value: any) => void}
                                        onChange={async (e) =>
                                            setSelectedCategory(e.target.value)
                                        }
                                    />
                                </Col>
                                <Col xs={4} className="mt-2">
                                    <CustomTextFieldSelect
                                        label="Payment Mode"
                                        controlId="Payment"
                                        options={payments}
                                        register={register}
                                        fieldName="payment_id"
                                        error={errors.payment_id}
                                        requiredMessage="Please select payment"
                                        defaultValue={isEditable
                                            ? order?.payment_id
                                                ? order?.payment_id
                                                : getValues("payment_id")
                                            : getValues("payment_id")}
                                        setValue={setValue as (name: string, value: any) => void}
                                    />
                                </Col>
                            </Row>
                        </section>
                        <ServiceItemForm categoryId={selectedCategory} onChange={setServiceItems} />
                        <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                            <h3>Comments</h3>
                            <CustomFormInput
                                label=""
                                controlId="comments"
                                placeholder="Write Something"
                                register={register}
                                as="textarea"
                                asCol={false}
                                rows={5}
                            />
                        </section>
                        <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                            <h3>Payment</h3>
                            <Row>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Service Amount: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{totalAmount}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Tax Amount: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{totalAmount}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Platform Charges: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{totalAmount}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>Total Amount: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>{totalAmount}</label>
                                </Col>
                            </Row>
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