import React, { useState, useEffect, useRef } from "react";
import { useForm } from 'react-hook-form';
import { Row, Col, Button } from "react-bootstrap";
import { OrderItemModel } from "../../models/OrderItemModel";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import { fetchServiceDropDown } from "../../services/servicesService";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import { fetchPartnerDropDown } from "../../services/userService";
import addIcon from "../../assets/icons/add.svg";
import { TaxOtherChargesModel } from "../../models/TaxOtherChargesModel";

type ServiceItemFormProps = {
    taxDetails: TaxOtherChargesModel
    categoryId: string,
    onChange: (items: OrderItemModel[]) => void;
    register: any;
    setValue: any;
    getValues: any;
    errors: any;
};

const ServiceItemForm: React.FC<ServiceItemFormProps> = ({ taxDetails, categoryId, onChange, register, setValue, getValues, errors }) => {
    const [services, setService] = useState<{ value: string; label: string; price?: number }[]>([]);
    const [partners, setPartner] = useState<{ value: string; label: string }[]>([]);
    const [serviceItems, setServiceItems] = useState<OrderItemModel[]>([
        {
            service_id: "",
            service_price: 0,
            partner_id: "",
            service_date: "",
            service_from_time: "",
            service_to_time: "",
            sub_total: 0,
            tax: 0,
            user_paltform_fee: 0,
            partner_commison_platform_fee: 0,
            partner_earning: 0,
            total_price: 0,
            admin_earning: 0,
        },
    ]);
    const fetchRef = useRef(false);

    useEffect(() => {
        onChange(serviceItems);
    }, [serviceItems]);

    useEffect(() => {
        fetchServiceFromApi();
    }, [categoryId]);

    const fetchServiceFromApi = async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const serviceOptions = await fetchServiceDropDown(categoryId);
            setService(serviceOptions);
        } finally {
            fetchRef.current = false;
        }
    };

    const fetchPartnerFromApi = async (serviceId: string) => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { partners } = await fetchPartnerDropDown(serviceId);
            setPartner(partners.map((partner: any) => ({ value: partner.partner_id, label: partner.partner_name })));
        } finally {
            fetchRef.current = false;
        }
    };

    const addServiceItem = () => {
        setServiceItems(prevServiceItems => [
            ...prevServiceItems,
            {
                service_id: "",
                service_price: 0,
                partner_id: "",
                service_date: "",
                service_from_time: "",
                service_to_time: "",
                sub_total: 0,
                tax: 0,
                user_paltform_fee: 0,
                partner_commison_platform_fee: 0,
                partner_earning: 0,
                total_price: 0,
                admin_earning: 0,

            },
        ]);
    };

    const removeServiceItem = (index: number) => {
        if (serviceItems.length > 1) {
            setServiceItems(serviceItems.filter((_, i) => i !== index));
        }
    };

    const handleInputChange = (index: number, field: keyof OrderItemModel, value: any) => {
        setServiceItems(prevServiceItems => {
            const updatedServices = [...prevServiceItems];

            if (field === "service_id") {
                const selectedService = services.find(service => service.value === value);
                const perHourPrice = selectedService?.price ?? 0;

                fetchPartnerFromApi(selectedService?.value!);

                updatedServices[index] = {
                    ...updatedServices[index],
                    service_id: value,
                    per_hour_price: perHourPrice,
                    service_price: 0,
                    ...calculateServiceDetails(0),
                };
                setValue(`serviceItems.${index}.per_hour_price`, perHourPrice);
            } else if (field === "service_from_time" || field === "service_to_time") {
                const updated = { ...updatedServices[index], [field]: value };
                const { service_from_time, service_to_time, service_price } = updated;

                const perHourPrice = updated.per_hour_price ?? 0;
                const { hours, price } = calculateHoursAndUpdatePrice(service_from_time, service_to_time, perHourPrice);

                updated.hours = hours;
                updated.service_price = price;
                Object.assign(updated, calculateServiceDetails(price));

                updatedServices[index] = updated;
                setValue(`serviceItems.${index}.${field}`, value);
                setValue(`serviceItems.${index}.service_price`, price);

            }
            else {
                updatedServices[index] = {
                    ...updatedServices[index],
                    [field]: value
                };
                setValue(`serviceItems.${index}.${field}` as any, value);
            }
            return updatedServices;
        });
    };

    const calculateServiceDetails = (servicePrice: number) => {
        const tax = (servicePrice * (taxDetails.tax_for_customer / 100));
        const subTotal = servicePrice - tax;
        const userPlatformFee = (servicePrice * (taxDetails.user_platform_fee / 100));
        const totalPrice = servicePrice + userPlatformFee;
        const partnerCommissionPlatformFee = (servicePrice * ((taxDetails.partner_commision_fee + taxDetails.partner_platform_fee) / 100));
        const partnerEarning = (subTotal - partnerCommissionPlatformFee);
        const adminEarning = (userPlatformFee + partnerCommissionPlatformFee);

        return {
            tax: Math.round(tax),
            sub_total: Math.round(subTotal),
            user_paltform_fee: Math.round(userPlatformFee),
            total_price: Math.round(totalPrice),
            partner_commison_platform_fee: Math.round(partnerCommissionPlatformFee),
            partner_earning: Math.round(partnerEarning),
            admin_earning: Math.round(adminEarning),
        };
    };

    const calculateHoursAndUpdatePrice = (from: string, to: string, pricePerHour: number) => {
        if (!from || !to) return { hours: 0, price: 0 };

        const start = new Date(from);
        const end = new Date(to);
        const diffMs = end.getTime() - start.getTime();
        const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;

        const roundedHours = parseFloat(hours.toFixed(2));
        const calculatedPrice = roundedHours * pricePerHour;
        const roundedPrice = Math.round(calculatedPrice);

        return { hours: roundedHours, price: roundedPrice };
    };

    return (
        <>
            {serviceItems.map((service, index) => (
                <section key={index} className="custom-other-details mt-3" style={{ padding: "10px" }}>
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
                        <Col xs={6} className="mt-4">
                            <CustomTextFieldSelect
                                label="Service"
                                controlId={`Service`}
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
                        <Col xs={6} className="mt-4">
                            <CustomTextFieldSelect
                                label="Partner"
                                controlId={`Partner`}
                                options={partners}
                                register={register}
                                fieldName={`serviceItems.${index}.partner_id`}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.partner_id}
                                requiredMessage="Please select partner"
                                defaultValue={service?.partner_id
                                    ? service?.partner_id
                                    : getValues(`serviceItems.${index}.partner_id` as any)}
                                setValue={setValue as (name: string, value: any) => void}
                                onChange={(e) => {
                                    handleInputChange(index, "partner_id", e.target.value)
                                }}
                                labelSize={2}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={3} className="mt-3" >
                            <CustomTextField
                                label="Hours Price"
                                controlId={`serviceItems.${index}.per_hour_price`}
                                placeholder="Enter Hours Price"
                                register={register}
                                value={serviceItems[index].per_hour_price ?? getValues(`serviceItems.${index}.per_hour_price` as any)}
                                error={errors.serviceItems?.[index]?.per_hour_price}
                                validation={{ required: "Price is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} >
                            <CustomTextFieldDatePicket
                                label="Service Date"
                                controlId={`serviceItems.${index}.service_date`}
                                selectedDate={serviceItems[index].service_date ?? getValues(`serviceItems.${index}.service_date` as any)}
                                onChange={(date) => handleInputChange(index, "service_date", date?.toISOString() || "")}
                                placeholderText="Select Date"
                                error={errors.serviceItems?.[index]?.service_date}
                                register={register}
                                validation={{ required: "Service date is required" }}
                                setValue={setValue}
                            />

                        </Col>
                        <Col xs={3}>
                            <CustomTextFieldTimePicket
                                label="From Time"
                                controlId={`serviceItems.${index}.service_from_time`}
                                selectedTime={serviceItems[index].service_from_time ?? getValues(`serviceItems.${index}.service_from_time` as any)}
                                onChange={(date) => handleInputChange(index, "service_from_time", date?.toISOString() || "")}
                                placeholderText="Select Time"
                                error={errors.serviceItems?.[index]?.service_from_time}
                                register={register}
                                validation={{ required: "From time is required" }}
                                setValue={setValue}
                                filterTime={(time) => {
                                    const hour = time.getHours();
                                    return hour >= 8 && hour <= 23;
                                }}
                            />
                        </Col>
                        <Col xs={3}>
                            <CustomTextFieldTimePicket
                                label="To Time"
                                controlId={`serviceItems.${index}.service_to_time`}
                                selectedTime={serviceItems[index].service_to_time ?? getValues(`serviceItems.${index}.service_to_time` as any)}
                                onChange={(date) => handleInputChange(index, "service_to_time", date?.toISOString() || "")}
                                placeholderText="Select Time"
                                error={errors.serviceItems?.[index]?.service_to_time}
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
                    <Row>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Service Price"
                                controlId={`serviceItems.${index}.service_price`}
                                placeholder="Enter Service Price"
                                register={register}
                                value={serviceItems[index].service_price ?? getValues(`serviceItems.${index}.service_price` as any)}
                                error={errors.serviceItems?.[index]?.service_price}
                                validation={{ required: "Service price is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Sub Total"
                                controlId={`serviceItems.${index}.sub_total`}
                                placeholder="Enter Sub Total"
                                register={register}
                                value={serviceItems[index].sub_total}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.sub_total}
                                validation={{ required: "Sub total is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Tax"
                                controlId={`serviceItems.${index}.tax`}
                                placeholder="Enter Tax"
                                register={register}
                                value={serviceItems[index].tax}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.tax}
                                validation={{ required: "Tax is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="User Platform Fee"
                                controlId={`serviceItems.${index}.user_paltform_fee`}
                                placeholder="Enter User Platform Fee"
                                register={register}
                                value={serviceItems[index].user_paltform_fee}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.user_paltform_fee}
                                validation={{ required: "User platform fee is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Partner Commison Platform Fee"
                                controlId={`serviceItems.${index}.partner_commison_platform_fee`}
                                placeholder="Enter Partner Commison Platform Fee"
                                register={register}
                                value={serviceItems[index].partner_commison_platform_fee}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.partner_commison_platform_fee}
                                validation={{ required: "Partner commison platform fee is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Partner Earning"
                                controlId={`serviceItems.${index}.partner_earning`}
                                placeholder="Enter Partner Earning"
                                register={register}
                                value={serviceItems[index].partner_earning}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.partner_earning}
                                validation={{ required: "Partner earning is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Total Price"
                                controlId={`serviceItems.${index}.total_price`}
                                placeholder="Enter Total Price"
                                register={register}
                                value={serviceItems[index].total_price}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.total_price}
                                validation={{ required: "Total price is required" }}
                                isEditable={false}
                            />
                        </Col>
                        <Col xs={3} className="mt-3">
                            <CustomTextField
                                label="Admin Earning"
                                controlId={`serviceItems.${index}.admin_earning`}
                                placeholder="Enter Admin Earning"
                                register={register}
                                value={serviceItems[index].admin_earning}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.admin_earning}
                                validation={{ required: "Admin earning is required" }}
                                isEditable={false}
                            />
                        </Col>
                    </Row>
                </section>
            ))}
        </>
    );
};

export default ServiceItemForm;