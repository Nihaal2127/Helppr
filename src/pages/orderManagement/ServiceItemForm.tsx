import React, { useState, useEffect, useRef } from "react";
import { useForm } from 'react-hook-form';
import { Row, Col, Button } from "react-bootstrap";
import { OrderItemModel } from "../../models/OrderItemModel";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { fetchServiceDropDown } from "../../services/servicesService";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import addIcon from "../../assets/icons/add.svg";
import { showLog } from "../../helper/utility";

type ServiceItemFormProps = {
    categoryId: string,
    onChange: (items: OrderItemModel[]) => void;
};


const ServiceItemForm: React.FC<ServiceItemFormProps> = ({ categoryId, onChange }) => {
    const { register, formState: { errors }, setValue, getValues } = useForm<OrderItemModel>();
    const [services, setService] = useState<{ value: string; label: string; price?: number }[]>([]);
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
    const fetchServiceRef = useRef(false);

    useEffect(() => {
        onChange(serviceItems);
    }, [serviceItems]);

    useEffect(() => {
        fetchServiceFromApi();
    }, []);

    const fetchServiceFromApi = async () => {
        if (fetchServiceRef.current) return;
        fetchServiceRef.current = true;
        try {
            const serviceOptions = await fetchServiceDropDown();
            setService(serviceOptions);
        } finally {
            fetchServiceRef.current = false;
        }
    };

    const addServiceItem = () => {
        setServiceItems(prevServiceItems => [
            ...prevServiceItems,
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

    // const handleInputChange = (index: number, field: keyof OrderItemModel, value: any) => {
    //     const updatedServices = [...serviceItems];
    //     showLog("field:",field);
    //     if (field == "service_id") {
    //         const selectedService = services.find((service) => service.value === value);
    //         showLog("selectedService:",selectedService);
    //         const price = selectedService?.price ? selectedService?.price : 0;
    //         showLog("price:",price);
    //         updatedServices[index] = { ...updatedServices[index], ["service_price"]: price };
    //         setValue(`service_price`, price);
    //     }
    //     updatedServices[index] = { ...updatedServices[index], [field]: value };
    //     setServiceItems(updatedServices);
    //     // setValue(`${field}`, value);
    //    // setValue(`${field}_${index}`, value);
    // };

    const handleInputChange = (index: number, field: keyof OrderItemModel, value: any) => {
        setServiceItems(prevServiceItems => {
            const updatedServices = [...prevServiceItems];
    
            if (field === "service_id") {
                const selectedService = services.find(service => service.value === value);
                const price = selectedService?.price ?? 0;
    
                updatedServices[index] = { 
                    ...updatedServices[index], 
                    service_price: price, 
                    service_id: value 
                };
    
                setValue(`serviceItems.${index}.service_price` as any, price);
            } else {
                updatedServices[index] = { 
                    ...updatedServices[index], 
                    [field]: value 
                };
                setValue(`serviceItems.${index}.${field}` as any, value);
            }
    
            return updatedServices;
        });
    };

    
    return (
        <>
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
                            <Button
                                style={{
                                    height: "26px",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--bg-color)",
                                    color: "var(--primary-color)",
                                    fontFamily: "Inter",
                                    fontSize: "14px",
                                    fontWeight: "normal",
                                    border: "1px solid var(--primary-txt-color)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "0 10px",
                                    margin: "0px 10px"
                                }}
                                onClick={() => addServiceItem()}>
                                <img src={addIcon} alt="Add" style={{ height: "14px", width: "14px" }} />
                                Add
                            </Button>

                        </Col>
                    </Row>
                    <Row>
                        <Col xs={6} className="mt-2">
                            <CustomTextFieldSelect
                                label="Service"
                                controlId={`serviceItems.${index}.service_id`}
                                options={services}
                                register={register}
                                fieldName={`serviceItems.${index}.service_id`}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.service_id}
                                requiredMessage="Please select service"
                                defaultValue={service?.service_id
                                    ? service?.service_id
                                    : getValues(`serviceItems.${index}.service_id` as any)}
                                setValue={setValue as (name: string, value: any) => void}
                                onChange={(e) => {
                                    handleInputChange(index, "service_id", e.target.value)
                                }}
                                labelSize={2}
                            />
                        </Col>
                        <Col xs={4} className="mt-2">
                            <CustomTextField
                                label="Price"
                                controlId={`serviceItems.${index}.price`}
                                placeholder="Enter Price"
                                register={register}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.service_price}
                                //error={(errors as Record<string, any>)[`service_price_${index}`]} 
                                validation={{ required: "Price is required" }}
                                isEditable={false}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={4} >
                            <CustomTextFieldDatePicket
                                label="Service Date"
                                controlId="service_date"
                                selectedDate={service?.service_date ?? getValues(`service_date`)}
                                onChange={(date) => handleInputChange(index, "service_date", date?.toISOString() || "")}
                                placeholderText="Select service date"
                                error={errors.service_date}
                                register={register}
                                validation={{ required: "Service date is required" }}
                                setValue={setValue}
                            />
                        </Col>
                        <Col xs={4}>
                            <CustomTextFieldTimePicket
                                label="From Time"
                                controlId="service_from_time"
                                selectedTime={service?.service_from_time ?? getValues(`service_from_time`)}
                                onChange={(date) => handleInputChange(index, "service_from_time", date?.toISOString() || "")}
                                placeholderText="Select from time"
                                error={errors.service_from_time}
                                register={register}
                                validation={{ required: "From time is required" }}
                                setValue={setValue}
                                filterTime={(time) => {
                                    const hour = time.getHours();
                                    return hour >= 8 && hour <= 23;
                                }}
                            />
                        </Col>
                        <Col xs={4}>
                            <CustomTextFieldTimePicket
                                label="To Time"
                                controlId="service_to_time"
                                selectedTime={service?.service_to_time ?? getValues(`service_to_time`)}
                                onChange={(date) => handleInputChange(index, "service_to_time", date?.toISOString() || "")}
                                placeholderText="Select to time"
                                error={errors.service_to_time}
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
        </>
    );
};

export default ServiceItemForm;