import React, { useState, useEffect, useRef } from "react";
import type { UseFormUnregister } from "react-hook-form";
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
import type { ServiceAddressCard, AddressCityDropdownRow } from "../../models/OrderItemModel";
import { AppConstant } from "../../constant/AppConstant";
import { CustomFormInput } from "../../components/CustomFormInput";
import ServiceAddressCardsPanel, { serializeServiceAddressCards } from "./ServiceAddressCardsPanel";
import type { CustomerSavedAddressPreview } from "../../helper/userAddressPreview";

/** Digits and at most one decimal point (for text `type="text"` service price). */
function sanitizeDecimalDigits(raw: string): string {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const dotIdx = cleaned.indexOf(".");
    if (dotIdx === -1) return cleaned;
    return cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, "");
}

const newAddressCardId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const defaultAddressCard = (isActive = true): ServiceAddressCard => ({
    id: newAddressCardId(),
    stateId: "",
    cityId: "",
    postal: "",
    line: "",
    stateLabel: "",
    cityLabel: "",
    isActive,
});

const servicePriceFieldValidation = {
    required: "Service price is required",
    validate: (v: unknown): string | true => {
        if (v === "" || v === null || v === undefined) {
            return "Service price is required";
        }
        if (typeof v === "number") {
            if (!Number.isFinite(v)) return "Enter a valid number";
            if (v <= 0) return "Enter an amount greater than 0";
            return true;
        }
        const raw = String(v).trim().replace(/,/g, "");
        if (raw === "" || raw === ".") return "Service price is required";
        const n = Number.parseFloat(raw);
        if (!Number.isFinite(n)) return "Enter a valid number";
        if (n <= 0) return "Enter an amount greater than 0";
        return true;
    },
};

type ServiceItemFormProps = {
    taxDetails: TaxOtherChargesModel
    categoryId: string,
    onChange: (items: OrderItemModel[]) => void;
    register: any;
    setValue: any;
    getValues: any;
    errors: any;
    /** Add Order: compact layout; fees still derived from entered service price. */
    compact?: boolean;
    /** Create order: only one line item, no add/remove controls. */
    singleServiceOnly?: boolean;
    /** Render rows inside a parent section (no inner "Service" card chrome). */
    embedded?: boolean;
    /** Hide service date / time row (parent renders “Scheduled Date/Time”). */
    omitSchedule?: boolean;
    /** Multi-address card grid instead of a single textarea. */
    useAddressCards?: boolean;
    /** When `omitSchedule`, parent-owned date/time is merged from here (create order). */
    scheduleMirror?: OrderItemModel[];
    /** Create flow: states/cities from parent `fetchCityDropDown` (no extra fetches). */
    addressStateOptions?: { value: string; label: string }[];
    addressCityRows?: AddressCityDropdownRow[];
    unregister?: UseFormUnregister<any>;
    /** Create order: show selected customer profile address above service location cards. */
    customerSavedAddresses?: CustomerSavedAddressPreview[];
};

const ServiceItemForm: React.FC<ServiceItemFormProps> = ({
    taxDetails,
    categoryId,
    onChange,
    register,
    setValue,
    getValues,
    errors,
    compact = false,
    singleServiceOnly = false,
    embedded = false,
    omitSchedule = false,
    useAddressCards = false,
    scheduleMirror,
    addressStateOptions,
    addressCityRows,
    unregister,
    customerSavedAddresses,
}) => {
    const [services, setService] = useState<{ value: string; label: string; price?: number }[]>([]);
    const [partners, setPartner] = useState<{ value: string; label: string }[]>([]);
    const prevCategoryRef = useRef<string | null>(null);
    const [serviceItems, setServiceItems] = useState<OrderItemModel[]>([
        {
            service_id: "",
            service_price: 0,
            partner_id: "",
            service_address: "",
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
            address_cards: [defaultAddressCard(true)],
        },
    ]);
    const fetchRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        onChangeRef.current(serviceItems);
    }, [serviceItems]);

    useEffect(() => {
        if (!omitSchedule || !scheduleMirror?.length) return;
        const m0 = scheduleMirror[0];
        setServiceItems((prev) => {
            if (!prev.length) return prev;
            const s0 = prev[0];
            const same =
                (m0.service_date || "") === (s0.service_date || "") &&
                (m0.service_from_time || "") === (s0.service_from_time || "") &&
                (m0.service_to_time || "") === (s0.service_to_time || "");
            if (same) return prev;
            return [
                {
                    ...s0,
                    service_date: m0.service_date ?? s0.service_date,
                    service_from_time: m0.service_from_time ?? s0.service_from_time,
                    service_to_time: m0.service_to_time ?? s0.service_to_time,
                },
                ...prev.slice(1),
            ];
        });
    }, [
        omitSchedule,
        scheduleMirror?.[0]?.service_date,
        scheduleMirror?.[0]?.service_from_time,
        scheduleMirror?.[0]?.service_to_time,
    ]);

    useEffect(() => {
        if (!singleServiceOnly || serviceItems.length <= 1) return;
        setServiceItems((items) => [items[0]]);
    }, [singleServiceOnly, serviceItems.length]);

    useEffect(() => {
        const cid = (categoryId ?? "").trim();
        if (!cid) {
            setService([]);
            return;
        }
        void (async () => {
            if (fetchRef.current) return;
            fetchRef.current = true;
            try {
                const serviceOptions = await fetchServiceDropDown(cid);
                setService(serviceOptions);
            } finally {
                fetchRef.current = false;
            }
        })();
    }, [categoryId]);

    useEffect(() => {
        const next = categoryId ?? "";
        if (prevCategoryRef.current === null) {
            prevCategoryRef.current = next;
            return;
        }
        if (prevCategoryRef.current === next) return;
        if (prevCategoryRef.current === "" && next) {
            prevCategoryRef.current = next;
            return;
        }
        prevCategoryRef.current = next;

        setServiceItems((prev) =>
            prev.map((item, idx) => {
                setValue(`serviceItems.${idx}.service_id`, "");
                setValue(`serviceItems.${idx}.partner_id`, "");
                setValue(`serviceItems.${idx}.service_price`, 0, { shouldValidate: true });
                return {
                    ...item,
                    service_id: "",
                    partner_id: "",
                    service_price: 0,
                    tax: 0,
                    sub_total: 0,
                    user_paltform_fee: 0,
                    total_price: 0,
                    partner_commison_platform_fee: 0,
                    partner_earning: 0,
                    admin_earning: 0,
                    address_cards: [defaultAddressCard(true)],
                    service_address: "",
                };
            })
        );
        setPartner([]);
    }, [categoryId, setValue]);

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
                service_address: "",
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
                address_cards: [defaultAddressCard(true)],
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
                setValue(`serviceItems.${index}.service_id`, value);
                setValue(`serviceItems.${index}.per_hour_price`, perHourPrice);
                setValue(`serviceItems.${index}.service_price`, 0, { shouldValidate: true });
            } else if (field === "service_price") {
                const raw = String(value ?? "").trim().replace(/,/g, "");
                const n = raw === "" ? 0 : Number.parseFloat(raw);
                const price = Number.isFinite(n) ? n : 0;
                updatedServices[index] = {
                    ...updatedServices[index],
                    service_price: price,
                    ...calculateServiceDetails(price),
                };
                setValue(`serviceItems.${index}.service_price`, price, { shouldValidate: true });
            } else if (field === "service_from_time" || field === "service_to_time") {
                updatedServices[index] = {
                    ...updatedServices[index],
                    [field]: value,
                };
                setValue(`serviceItems.${index}.${field}` as any, value);
            } else if (field === "per_hour_price") {
                const n = Number.parseFloat(String(value ?? "").trim());
                const perHour = Number.isFinite(n) ? n : 0;
                updatedServices[index] = {
                    ...updatedServices[index],
                    per_hour_price: perHour,
                };
                setValue(`serviceItems.${index}.per_hour_price`, value);
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

    const showAddRemoveRow = !singleServiceOnly && !embedded;
    const categorySelected = !!(categoryId ?? "").trim();

    const renderServicePriceControl = (index: number) => {
        const priceFieldError = errors.serviceItems?.[index]?.service_price as
            | { message?: string }
            | undefined;
        const invalid = !!priceFieldError;
        const borderColor = invalid
            ? "var(--bs-form-invalid-border-color, #dc3545)"
            : "var(--primary-color)";
        return (
            <div className="d-flex flex-column">
                <div
                    className="d-flex align-items-stretch"
                    style={{
                        border: `1px solid ${borderColor}`,
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "var(--bg-color)",
                        minHeight: 35,
                    }}>
                    <span
                        className="d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                            borderRight: `1px solid ${borderColor}`,
                            color: "var(--primary-txt-color)",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontVariantNumeric: "tabular-nums",
                            paddingLeft: "10px",
                            paddingRight: "10px",
                            minWidth: 40,
                            alignSelf: "stretch",
                        }}>
                        {AppConstant.currencySymbol}
                    </span>
                    <div className="flex-grow-1 d-flex" style={{ minWidth: 0 }}>
                        <CustomFormInput
                            label=""
                            controlId={`serviceItems.${index}.service_price`}
                            placeholder="0.00"
                            register={register}
                            validation={servicePriceFieldValidation}
                            error={undefined}
                            asCol={false}
                            inputType="text"
                            value={
                                serviceItems[index].service_price ??
                                getValues(`serviceItems.${index}.service_price` as any)
                            }
                            onChange={(value) =>
                                handleInputChange(index, "service_price", sanitizeDecimalDigits(value))
                            }
                            inputStyle={{
                                border: "none",
                                borderRadius: 0,
                                boxShadow: "none",
                                marginBottom: 0,
                                minHeight: 35,
                                height: "100%",
                                width: "100%",
                            }}
                            inputClassName="shadow-none"
                        />
                    </div>
                </div>
                {invalid && priceFieldError?.message ? (
                    <div className="invalid-feedback d-block" style={{ marginTop: "0.25rem" }}>
                        {priceFieldError.message}
                    </div>
                ) : null}
            </div>
        );
    };

    const serviceFieldRows = (service: OrderItemModel, index: number) => (
                    <>
                    <Row className={embedded ? "mt-2" : "mt-3"}>
                        <Col xs={4}>
                            <CustomTextFieldSelect
                                label="Service"
                                controlId={`Service`}
                                options={categorySelected ? services : []}
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
                                placeholder={categorySelected ? "Select service" : "Select a category first"}
                                menuPortal
                            />
                        </Col>
                        <Col xs={4}>
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
                                placeholder={
                                    serviceItems[index].service_id
                                        ? "Select partner"
                                        : "Select a service first"
                                }
                                menuPortal
                            />
                        </Col>
                        <Col xs={4}>
                            <Row className="align-items-start mx-0">
                                <Col sm={4} className="d-flex align-items-start px-0">
                                    <label className="custom-profile-lable">Service Price</label>
                                </Col>
                                <Col className="ps-1 pe-0">{renderServicePriceControl(index)}</Col>
                            </Row>
                        </Col>
                    </Row>
                    {!compact && (
                        <Row className="mt-3">
                            <Col xs={4}>
                                <CustomTextField
                                    label="Hours Price"
                                    controlId={`serviceItems.${index}.per_hour_price`}
                                    placeholder="Reference hourly rate"
                                    register={register}
                                    error={errors.serviceItems?.[index]?.per_hour_price}
                                    inputType="number"
                                    value={serviceItems[index].per_hour_price ?? ""}
                                    onChange={(value) => handleInputChange(index, "per_hour_price", value)}
                                />
                            </Col>
                        </Row>
                    )}
                    {!omitSchedule && (
                    <Row className="mt-3">
                        <Col xs={4}>
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
                        <Col xs={4}>
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
                        <Col xs={4}>
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
                    )}
                    {useAddressCards && addressStateOptions && addressCityRows ? (
                        <ServiceAddressCardsPanel
                            cards={
                                serviceItems[index].address_cards?.length
                                    ? serviceItems[index].address_cards!
                                    : [defaultAddressCard(true)]
                            }
                            onChange={(next) => {
                                setServiceItems((prev) =>
                                    prev.map((it, i) =>
                                        i === index
                                            ? {
                                                  ...it,
                                                  address_cards: next,
                                                  service_address: serializeServiceAddressCards(next),
                                              }
                                            : it
                                    )
                                );
                            }}
                            register={register}
                            setValue={setValue}
                            unregister={unregister}
                            stateOptions={addressStateOptions}
                            cityRows={addressCityRows}
                            customerSavedAddresses={customerSavedAddresses}
                        />
                    ) : null}
                    {!useAddressCards && (
                    <Row className="mt-3">
                        <Col xs={12}>
                            <CustomTextField
                                label="Service address"
                                controlId={`serviceItems.${index}.service_address`}
                                placeholder="Enter service address"
                                register={register}
                                error={(errors as Record<string, any>)?.serviceItems?.[index]?.service_address}
                                validation={{ required: "Service address is required" }}
                                onChange={(value) => handleInputChange(index, "service_address", value)}
                                as="textarea"
                                rows={4}
                                labelSize={2}
                            />
                        </Col>
                    </Row>
                    )}
                    <Row>
                        {!compact && (
                            <>
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
                            </>
                        )}
                    </Row>
                    </>
    );

    return (
        <>
            {serviceItems.map((service, index) =>
                embedded ? (
                    <React.Fragment key={index}>{serviceFieldRows(service, index)}</React.Fragment>
                ) : (
                    <section key={index} className="custom-other-details mt-3" style={{ padding: "10px" }}>
                        {showAddRemoveRow && (
                            <Row className="d-flex justify-content-between align-items-center">
                                <Col>
                                    <h3 className="mb-0">Service</h3>
                                </Col>
                                <Col className="text-end">
                                    {index > 0 && (
                                        <label
                                            onClick={(e) => {
                                                e.preventDefault();
                                                removeServiceItem(index);
                                            }}
                                            className="custom-document-delete">
                                            Remove
                                        </label>
                                    )}
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
                                            margin: "0px 10px",
                                        }}
                                        onClick={() => addServiceItem()}>
                                        <img src={addIcon} alt="Add" style={{ height: "14px", width: "14px" }} />
                                        Add
                                    </Button>
                                </Col>
                            </Row>
                        )}
                        {serviceFieldRows(service, index)}
                    </section>
                )
            )}
        </>
    );
};

export default ServiceItemForm;