import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { useForm, UseFormRegister } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { CityModel } from "../../models/CityModel";
import { CustomFormInput } from "../../components/CustomFormInput";
import { CustomRadioSelection } from "../../components/CustomRadioSelection";
import { getStatusOptions } from "../../helper/utility";
import CustomFormSelect from "../../components/CustomFormSelect";
import { showErrorAlert } from "../../helper/alertHelper";
import { fetchStateDropDown } from "../../services/stateService";
import { createOrUpdateCity } from "../../services/cityService";

type AddEditCityDialogProps = {
    isEditable: boolean;
    city: CityModel | null;
    onClose: () => void;
    onRefreshData: () => void;
};

const AddEditCityDialog: React.FC<AddEditCityDialogProps> & {
    show: (isEditable: boolean, city: CityModel | null, onRefreshData: () => void) => void;
} = ({ isEditable, city, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CityModel>({
        defaultValues: {
            name: city?.name || "",
            state_id: city?.state_id || "",
            is_active: city?.is_active ?? true,
            city_service_price:city?.city_service_price || 0,
        },
    });

    const [states, setState] = useState<{ value: string; label: string }[]>([]);
    const fetchRef = useRef(false);

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

    useEffect(() => {
        fetchStateFromApi();
    }, []);

    useEffect(() => {
        if (isEditable && city?.is_active !== undefined) {
            setValue("is_active", city.is_active);
        }
    }, [isEditable, city?.is_active]);

    useEffect(() => {
        if (city?.state_id && states.length > 0) {
            const selectedState = states.find((state) => state.value === city.state_id);
            if (selectedState) {
                setValue("state_id", city.state_id);
            }
        }
    }, [states, city?.state_id, setValue]);

    const onSubmitEvent = async (data: CityModel) => {
        const payload = {
            name: data.name,
            state_id: data.state_id,
            is_active: data.is_active,
            city_service_price:Number(data.city_service_price),
        };
        let response;

        if (isEditable) {
            if (!city?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }

            response = await createOrUpdateCity(payload, true, city._id);
        } else {
            response = await createOrUpdateCity(payload, false);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <Modal.Title as="h5" className="custom-modal-title">
                    {isEditable ? "Edit" : "Add"} City
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

                        <CustomFormSelect
                            label=""
                            controlId="state"
                            options={states}
                            register={register as unknown as UseFormRegister<any>}
                            fieldName="state_id"
                            error={errors.state_id}
                            asCol={false}
                            requiredMessage="Please select state"
                            defaultValue={isEditable ? city?.state_id : ""}
                            setValue={setValue as (name: string, value: any) => void}
                        />

                        <CustomFormInput
                            label=""
                            controlId="name"
                            placeholder="Enter City Name"
                            register={register}
                            error={errors.name}
                            asCol={false}
                            validation={{ required: "City name is required" }}
                        />
                        <CustomFormInput
                            label=""
                            controlId="city_service_price"
                            placeholder="Enter City service Price"
                            register={register}
                            error={errors.city_service_price}
                            asCol={false}
                            inputType="number"
                            validation={{ required: "City service price is required" }}
                        />
                        <CustomRadioSelection
                            label=""
                            name="is_active"
                            options={getStatusOptions()}
                            defaultValue={isEditable ? city?.is_active?.toString() : "true"}
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

AddEditCityDialog.show = (isEditable: boolean, city: CityModel | null, onRefreshData: () => void) => {
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
        <AddEditCityDialog
            isEditable={isEditable}
            city={city}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default AddEditCityDialog;
