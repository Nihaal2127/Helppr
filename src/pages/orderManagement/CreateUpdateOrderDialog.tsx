import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from 'react-hook-form';
import { Modal, Button, Row, Col, Form, Table } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { OrderModel } from "../../models/OrderModel";
import { ShowDetailsRow } from "../../helper/utility";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { createOrUpdateOrder } from "../../services/orderService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchTaxOtherChargesById } from "../../services/taxOtherChargesService";
import CustomTextField from "../../components/CustomTextField";
import CustomTextFieldSelect from "../../components/CustomTextFieldSelect";
import CustomTextFieldDatePicket from "../../components/CustomTextFieldDatePicket";
import CustomTextFieldTimePicket from "../../components/CustomTextFieldTimePicket";
import ServiceItemForm from "./ServiceItemForm";
import { CustomFormInput } from "../../components/CustomFormInput";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomFormSelect from "../../components/CustomFormSelect";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { fetchUserDropDown } from "../../services/userService";
import { getOffers } from "../../services/settingsService";
import { UserModel } from "../../models/UserModel";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { AppConstant } from "../../constant/AppConstant";
import { orderPaymentModeSelectOptions } from "../../constant/PaymentEnum";
import { showErrorAlert } from "../../helper/alertHelper";
import { OrderItemModel } from "../../models/OrderItemModel";
import { TaxOtherChargesModel } from "../../models/TaxOtherChargesModel";
import { openDialog} from "../../helper/DialogManager";
import type { CustomerPaymentRow, OrderPaymentExtV1, PartnerPaymentRow } from "../../helper/orderPaymentStorage";
import {
    mergePaymentExtension,
    sumCustomerAmounts,
    sumPartnerAmounts,
    customerPaidBalanceForEdit,
    partnerPaidBalanceForEdit,
} from "../../helper/orderPaymentStorage";
import {
    resolveOrderOfferBreakdown,
    computeCreateOrderOfferDiscountRupees,
    splitOfferContributionAmounts,
} from "../../helper/orderDisplayHelpers";
import { serializeServiceAddressCards } from "./ServiceAddressCardsPanel";
import { buildCustomerSavedAddressPreview } from "../../helper/userAddressPreview";

/** Align create-order payment UI with `OrderPaymentEditModal` tokens. */
const FONT_BODY = "0.9375rem";
const FONT_LABEL = "14px";
const FONT_TOTAL = "1.125rem";

const moneyTabular: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
};

const sectionShell: React.CSSProperties = {
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid var(--txtfld-border, rgba(0, 0, 0, 0.08))",
    backgroundColor: "var(--bg-color)",
};

const paymentSubcard: React.CSSProperties = {
    backgroundColor: "var(--bg-color)",
};

const summaryRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "10px 0",
    fontSize: FONT_BODY,
    borderBottom: "1px solid var(--txtfld-border, rgba(0,0,0,0.08))",
};

const summaryLabel: React.CSSProperties = {
    color: "var(--content-txt-color, #6c757d)",
    fontWeight: 500,
    minWidth: 0,
};

const summaryValueTop: React.CSSProperties = {
    fontWeight: 600,
    textAlign: "right",
    alignSelf: "flex-start",
    ...moneyTabular,
};

const summaryTotalWrap: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    paddingTop: "12px",
    marginTop: "8px",
    borderTop: "2px solid var(--txtfld-border, rgba(0,0,0,0.14))",
};

const summaryTotalLabel: React.CSSProperties = {
    fontSize: FONT_TOTAL,
    fontWeight: 700,
    color: "var(--primary-txt-color, #1a1a1a)",
};

const summaryTotalValue: React.CSSProperties = {
    fontSize: FONT_TOTAL,
    fontWeight: 700,
    textAlign: "right",
    color: "var(--primary-color, #0d6efd)",
    ...moneyTabular,
};

const priceSummarySection: React.CSSProperties = {
    ...sectionShell,
    marginTop: "12px",
    padding: "14px 16px",
};

const PAY_TYPES = ["COD", "Razor pay", "UPI", "Online", "Cash", "—"].map((t) => ({ value: t, label: t }));

const newPayRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const tableThCreate: React.CSSProperties = {
    color: "var(--primary-txt-color)",
    fontSize: FONT_LABEL,
};

const tablePriceInputCreate: React.CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    marginBottom: 0,
    fontSize: FONT_BODY,
    textAlign: "right",
};

const offerSublineCreate: React.CSSProperties = {
    fontSize: FONT_LABEL,
    fontWeight: 500,
    color: "var(--content-txt-color, #6c757d)",
    marginTop: "4px",
    lineHeight: 1.35,
};

/** Percent label for offer admin/partner split (one decimal when needed). */
function formatOfferSplitPercent(n: number): string {
    if (!Number.isFinite(n) || n < 0) return "0";
    const rounded = Math.round(n * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

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
        control,
        formState: { errors },
        setValue,
        getValues,
        handleSubmit,
        unregister,
        watch,
    } = useForm<any>();
    /** Avoid `useWatch` + `useForm<any>()` — TS2589 deep instantiation on `control`. */
    const offerIdWatch = watch("offer_id") as string | undefined;
    const [offerModalOpen, setOfferModalOpen] = useState(false);

    const [categories, setCategory] = useState<{ value: string; label: string }[]>([]);
    const [cities, setCity] = useState<
        { value: string; label: string; state_id?: string; state_name?: string }[]
    >([]);

    const addressStateOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of cities) {
            if (c.state_id) {
                const lab = (c.state_name?.trim() || c.state_id).trim();
                if (!m.has(c.state_id)) m.set(c.state_id, lab || c.state_id);
            }
        }
        return [{ value: "", label: "Select state" }, ...Array.from(m, ([value, label]) => ({ value, label }))];
    }, [cities]);

    const addressCityRows = useMemo(() => cities, [cities]);

    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<UserModel>();
    const [taxDetails, setTaxDetails] = useState<TaxOtherChargesModel | null>();
    const [paymentDetails, setPaymentDetails] = useState({
        subTotal: 0,
        tax: 0,
        userPlatformFee: 0,
        totalPrice: 0,
        partnerCommissionPlatformFee: 0,
        adminEarning: 0
    });
    const payments = orderPaymentModeSelectOptions;
    const [serviceItems, setServiceItems] = useState<OrderItemModel[]>([]);
    const [offerOptions, setOfferOptions] = useState<{ value: string; label: string }[]>([{ value: "", label: "None" }]);
    const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);
    const [customerUsers, setCustomerUsers] = useState<UserModel[]>([]);
    const [customerUserOptions, setCustomerUserOptions] = useState<{ value: string; label: string }[]>([]);

    const customerSavedAddressPreview = useMemo(
        () => buildCustomerSavedAddressPreview(selectedUser),
        [selectedUser]
    );
    const [createPaymentExt, setCreatePaymentExt] = useState<OrderPaymentExtV1>(() => ({
        v: 1,
        serviceAmount: 0,
        taxPercent: 0,
        commissionPercent: 0,
        otherCharges: [],
        customerPayments: [
            { id: newPayRowId(), date: "", amount: 0, type: "COD", description: "" },
        ],
        partnerPayments: [{ id: newPayRowId(), date: "", amount: 0, description: "" }],
    }));

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
            const { response, taxOtherCharges } = await fetchTaxOtherChargesById();
            if (response) {
                setTaxDetails(taxOtherCharges);
            }
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    useEffect(() => {
        if (isEditable) return;
        void (async () => {
            const categoryOptions = await fetchCategoryDropDown();
            setCategory(categoryOptions);
        })();
        setValue("comments", "");
        setValue("offer_id", "");
        setValue("customer_user_id", "");
        setValue("city_id", "");
        setCreatePaymentExt({
            v: 1,
            serviceAmount: 0,
            taxPercent: 0,
            commissionPercent: 0,
            otherCharges: [],
            customerPayments: [
                { id: newPayRowId(), date: "", amount: 0, type: "COD", description: "" },
            ],
            partnerPayments: [{ id: newPayRowId(), date: "", amount: 0, description: "" }],
        });
    }, [isEditable]);

    useEffect(() => {
        const offers = getOffers().filter(
            (o) => o.status === "active" && (o.applicableOn === "orders" || o.applicableOn === "quotes")
        );
        setOfferOptions([
            { value: "", label: "None" },
            ...offers.map((o) => ({
                value: o.id,
                label: `${o.offerName} (${o.offerId})`,
            })),
        ]);
        const loadEmployees = async () => {
            const { users } = await fetchUserDropDown(2);
            setEmployeeOptions(
                users.map((u) => ({
                    value: u._id,
                    label: (u.name && String(u.name).trim()) || u.user_id || u._id,
                }))
            );
        };
        const loadCustomers = async () => {
            const { users } = await fetchUserDropDown(4);
            setCustomerUsers(users);
            setCustomerUserOptions(
                users.map((u) => ({
                    value: u._id,
                    label: (u.name && String(u.name).trim()) || u.user_id || u.phone_number || u._id,
                }))
            );
        };
        void loadEmployees();
        void loadCustomers();
    }, []);

    useEffect(() => {
        if (!isEditable || !order) return;
        const init = async () => {
            setValue("user_phone_number", order.user_phone_number ?? "");
            setValue("city_id", order.city_id ?? "");
            setValue("category_id", order.category_id ?? "");
            setValue(
                "payment_mode_id",
                order.payment_mode_id != null ? String(order.payment_mode_id) : "2"
            );
            setValue("comments", order.comment ?? "");
            setValue("offer_id", order.offer_id ?? "");
            const defaultEmployee = order.created_by_id ?? getLocalStorage(AppConstant.createdById) ?? "";
            setValue("created_by_id", defaultEmployee);
            setSelectedCategory(order.category_id ?? "");
            if (order.city_id) {
                const categoryOptions = await fetchCategoryDropDown(order.city_id);
                setCategory(categoryOptions);
            }
            if (order.user_info) {
                setSelectedUser(order.user_info);
            } else if (order.user_phone_number) {
                await fetchUserFromApi(order.user_phone_number);
            }
            setServiceItems(order.service_items?.length ? order.service_items.map((s) => ({ ...s })) : []);
        };
        void init();
    }, [isEditable, order?._id]);

    const calculatePrices = useCallback(() => {
        let subTotal = 0;
        let tax = 0;
        let userPlatformFee = 0;
        let totalPrice = 0;
        let partnerCommissionPlatformFee = 0;
        let adminEarning = 0;

        for (let i = 0; i < serviceItems.length; i++) {
            const serviceItem = serviceItems[i];
            subTotal += serviceItem.sub_total ?? 0;
            tax += serviceItem.tax ?? 0;
            userPlatformFee += serviceItem.user_paltform_fee ?? 0;
            totalPrice += serviceItem.total_price ?? 0;
            partnerCommissionPlatformFee += serviceItem.partner_commison_platform_fee ?? 0;
            adminEarning += serviceItem.admin_earning ?? 0;
        }

        setPaymentDetails({
            subTotal: Math.round(subTotal),
            tax: Math.round(tax),
            userPlatformFee: Math.round(userPlatformFee),
            totalPrice: Math.round(totalPrice),
            partnerCommissionPlatformFee: Math.round(partnerCommissionPlatformFee),
            adminEarning: Math.round(adminEarning),
        });
    }, [serviceItems]);

    useEffect(() => {
        calculatePrices();
    }, [calculatePrices]);

    useEffect(() => {
        if (isEditable || !taxDetails) return;
        setCreatePaymentExt((prev) => ({
            ...prev,
            serviceAmount: paymentDetails.subTotal,
            taxPercent: Number(taxDetails.tax_for_customer) || 0,
            commissionPercent:
                (Number(taxDetails.partner_commision_fee) || 0) +
                (Number(taxDetails.partner_platform_fee) || 0),
        }));
    }, [isEditable, taxDetails, paymentDetails.subTotal]);

    const previewOfferBreakdown = useMemo(() => {
        const id = (offerIdWatch ?? "").trim();
        const fromSettings = getOffers().find((o) => o.id === id || String(o.offerId) === id);
        const sub = Number(paymentDetails.subTotal) || 0;
        const total = Number(paymentDetails.totalPrice) || 0;

        const { discount, percentOff, baseUsed } = computeCreateOrderOfferDiscountRupees({
            offerId: id,
            fromSettings,
            orderTotalPrice: total,
            orderSubTotal: sub,
        });
        const discountRounded = Math.round(discount * 100) / 100;
        const { admin, partner } = splitOfferContributionAmounts(discountRounded, fromSettings);

        const synthetic = {
            offer_id: id || undefined,
            offer_name: fromSettings?.offerName,
            sub_total: paymentDetails.subTotal,
            total_price: paymentDetails.totalPrice,
            ...(discountRounded > 0 ? { offer_discount_amount: discountRounded } : {}),
        } as OrderModel;

        const resolved = resolveOrderOfferBreakdown(synthetic);
        return {
            ...resolved,
            appliedDiscount: discountRounded,
            totalOfferValue: discountRounded,
            adminContribution: admin,
            partnerContribution: partner,
            percentOffOrder: percentOff,
            discountBaseForPercent: percentOff != null ? baseUsed : undefined,
        };
    }, [offerIdWatch, paymentDetails.subTotal, paymentDetails.totalPrice]);

    /** Admin / partner share of the applied discount (rupees), for subline copy. */
    const offerContributionPercents = useMemo(() => {
        const disc = Number(previewOfferBreakdown.appliedDiscount) || 0;
        const admin = Number(previewOfferBreakdown.adminContribution) || 0;
        const partner = Number(previewOfferBreakdown.partnerContribution) || 0;
        if (disc > 0.009) {
            return { adminPct: (admin / disc) * 100, partnerPct: (partner / disc) * 100 };
        }
        return { adminPct: 0, partnerPct: 0 };
    }, [
        previewOfferBreakdown.appliedDiscount,
        previewOfferBreakdown.adminContribution,
        previewOfferBreakdown.partnerContribution,
    ]);

    const totalPriceGrossCreate = Number(paymentDetails.totalPrice || 0);
    const createOfferDiscount =
        !isEditable &&
        (offerIdWatch ?? "").trim() !== "" &&
        previewOfferBreakdown.appliedDiscount > 0.009
            ? previewOfferBreakdown.appliedDiscount
            : 0;
    const totalPriceAfterOfferCreate = Math.max(0, totalPriceGrossCreate - createOfferDiscount);
    const createFinalTotal = !isEditable ? totalPriceAfterOfferCreate : paymentDetails.totalPrice;

    const createPartnerCap = Math.max(0, paymentDetails.subTotal);
    const createCustomerPaidBal = useMemo(
        () => customerPaidBalanceForEdit(createPaymentExt, createFinalTotal, false),
        [createPaymentExt, createFinalTotal]
    );
    const createPartnerPaidBal = useMemo(
        () => partnerPaidBalanceForEdit(createPaymentExt, createPartnerCap, createPaymentExt.serviceAmount, false),
        [createPaymentExt, createPartnerCap]
    );
    const canAddCustomerCreate = createCustomerPaidBal.balance > 0.009;
    const canAddPartnerCreate = createPartnerPaidBal.balance > 0.009;

    const updateCreateCustomer = (id: string, patch: Partial<CustomerPaymentRow>) => {
        setCreatePaymentExt((e) => ({
            ...e,
            customerPayments: e.customerPayments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
    };
    const updateCreatePartner = (id: string, patch: Partial<PartnerPaymentRow>) => {
        setCreatePaymentExt((e) => ({
            ...e,
            partnerPayments: e.partnerPayments.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
    };

    const patchCreateScheduleField = useCallback(
        (field: "service_date" | "service_from_time" | "service_to_time", value: string) => {
            setServiceItems((prev) => {
                const base: OrderItemModel =
                    prev[0] ??
                    ({
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
                    } as OrderItemModel);
                const next0 = { ...base, [field]: value };
                const next = prev.length ? [next0, ...prev.slice(1)] : [next0];
                setValue(`serviceItems.0.${field}` as any, value, { shouldValidate: true });
                return next;
            });
        },
        [setValue]
    );

    const taxPctLabel = taxDetails ? Number(taxDetails.tax_for_customer) || 0 : 0;
    const commissionPctLabel = taxDetails
        ? (Number(taxDetails.partner_commision_fee) || 0) + (Number(taxDetails.partner_platform_fee) || 0)
        : 0;

    const onSubmitEvent = async (data: any) => {
        if (!isEditable) {
            const addrText = serializeServiceAddressCards(serviceItems[0]?.address_cards);
            if (!addrText.trim()) {
                showErrorAlert("Please add at least one service address with details.");
                return;
            }
        }

        const updatedServiceItems = serviceItems.map((item) => ({
            ...item,
            user_id: selectedUser?._id,
            category_id: data.category_id,
        }));

        const payloadServiceItems = updatedServiceItems.map((item) => {
            const { address_cards, ...rest } = item;
            const serialized =
                address_cards?.length ? serializeServiceAddressCards(address_cards).trim() : "";
            return {
                ...rest,
                service_address: serialized || (rest.service_address ?? ""),
            };
        });

        const firstAddr = payloadServiceItems.find((s) => s.service_address?.trim())?.service_address?.trim();
        const resolvedCityId =
            data.city_id ||
            selectedUser?.city_id ||
            (cities.length > 0 ? cities[0].value : "");

        let commentsOut = (data.comments ?? "").trim();
        let isPaidOut = false;
        if (!isEditable) {
            const extForSave: OrderPaymentExtV1 = {
                ...createPaymentExt,
                serviceAmount: paymentDetails.subTotal,
                taxPercent: taxDetails ? Number(taxDetails.tax_for_customer) || 0 : 0,
                commissionPercent: taxDetails
                    ? (Number(taxDetails.partner_commision_fee) || 0) +
                      (Number(taxDetails.partner_platform_fee) || 0)
                    : 0,
            };
            commentsOut = mergePaymentExtension(commentsOut, extForSave);
            const customerSum = sumCustomerAmounts(extForSave.customerPayments);
            isPaidOut = customerSum >= createFinalTotal - 0.01;
        }

        const payload = {
            user_id: selectedUser?._id,
            user_unique_id: selectedUser?.user_id,
            city_id: resolvedCityId,
            category_id: data.category_id,
            is_paid: !isEditable ? isPaidOut : !!(order?.is_paid ?? false),
            payment_mode_id: !isEditable ? "2" : String(data.payment_mode_id ?? order?.payment_mode_id ?? "2"),
            transaction_id: !isEditable ? "" : (order?.transaction_id != null ? String(order.transaction_id) : ""),
            created_by_id: data.created_by_id || getLocalStorage(AppConstant.createdById),
            ...(data.offer_id ? { offer_id: data.offer_id } : {}),
            ...(data.offer_id &&
            !isEditable &&
            previewOfferBreakdown.appliedDiscount > 0.009 && {
                offer_discount_amount: previewOfferBreakdown.appliedDiscount,
            }),
            order_status: isEditable && order ? order.order_status : 2,
            type: 1,
            order_date: new Date().toISOString(),
            address: firstAddr || selectedUser?.address,
            sub_total: paymentDetails.subTotal,
            tax: paymentDetails.tax,
            discount_amount: 0,
            user_paltform_fee: paymentDetails.userPlatformFee,
            partner_commison_platform_fee: paymentDetails.partnerCommissionPlatformFee,
            total_price: !isEditable ? createFinalTotal : paymentDetails.totalPrice,
            admin_earning: paymentDetails.adminEarning,
            service_items: payloadServiceItems,
            comments: !isEditable ? commentsOut : (data.comments ?? ""),
            name: selectedUser?.name,
            email: selectedUser?.email,
            contact: selectedUser?.phone_number,
        };
        let response;
        if (isEditable) {
            if (!order?._id) {
                showErrorAlert("Unable to update. ID is missing.");
                return;
            }
            response = await createOrUpdateOrder(payload, true, order?._id);
        } else {
            response = await createOrUpdateOrder(payload, false,);
        }

        if (response) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
        <Modal show={true} onHide={onClose} centered>
            <div className="custom-order-model-detail">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        {isEditable ? "Update" : "Create"} Order
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body
                    className="px-4 pb-4 pt-0"
                    style={{
                        maxHeight: "70vh",
                        overflowY: "auto",
                        fontSize: !isEditable ? FONT_BODY : undefined,
                    }}>
                    <form
                        noValidate
                        name="order-form"
                        id="order-form"
                        onSubmit={handleSubmit(onSubmitEvent)}>
                        {!isEditable ? (
                            <>
                                <section className="custom-other-details mt-2" style={sectionShell}>
                                    <Row className="align-items-center mb-3 pb-2 border-bottom">
                                        <Col>
                                            <h3 className="mb-0">Order information</h3>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col xs={12} md={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="User"
                                                controlId="User"
                                                options={customerUserOptions}
                                                register={register}
                                                fieldName="customer_user_id"
                                                error={errors.customer_user_id}
                                                requiredMessage="Please select user"
                                                defaultValue={getValues("customer_user_id")}
                                                setValue={setValue as (name: string, value: any) => void}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const u = customerUsers.find((cu) => cu._id === id);
                                                    setSelectedUser(u);
                                                    setValue("user_phone_number", u?.phone_number ?? "");
                                                    if (u?.city_id) {
                                                        setValue("city_id", u.city_id);
                                                        void fetchCategoryFromApi(u.city_id);
                                                    } else {
                                                        setValue("city_id", "");
                                                    }
                                                }}
                                                menuPortal
                                            />
                                        </Col>
                                        <Col xs={12} md={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="Category"
                                                controlId="Category"
                                                options={categories}
                                                register={register}
                                                fieldName="category_id"
                                                error={errors.category_id}
                                                requiredMessage="Please select category"
                                                defaultValue={getValues("category_id")}
                                                setValue={setValue as (name: string, value: any) => void}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                menuPortal
                                            />
                                        </Col>
                                        <Col xs={12} md={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="Employee"
                                                controlId="Employee"
                                                options={employeeOptions}
                                                register={register}
                                                fieldName="created_by_id"
                                                error={errors.created_by_id}
                                                requiredMessage={
                                                    employeeOptions.length > 0 ? "Please select employee" : undefined
                                                }
                                                defaultValue={getLocalStorage(AppConstant.createdById) ?? ""}
                                                setValue={setValue as (name: string, value: any) => void}
                                                menuPortal
                                            />
                                        </Col>
                                    </Row>
                                    {taxDetails && (
                                        <ServiceItemForm
                                            taxDetails={taxDetails}
                                            categoryId={selectedCategory}
                                            onChange={setServiceItems}
                                            register={register}
                                            setValue={setValue}
                                            getValues={getValues}
                                            errors={errors}
                                            compact
                                            embedded
                                            singleServiceOnly
                                            omitSchedule
                                            useAddressCards
                                            scheduleMirror={serviceItems}
                                            addressStateOptions={addressStateOptions}
                                            addressCityRows={addressCityRows}
                                            unregister={unregister}
                                            customerSavedAddresses={customerSavedAddressPreview}
                                        />
                                    )}
                                    <Row className="align-items-end">
                                        
                                    </Row>
                                </section>

                                {taxDetails ? (
                                    <section className="custom-other-details mt-3" style={sectionShell}>
                                        <Row className="align-items-center mb-3 pb-2 border-bottom">
                                            <Col>
                                                <h3 className="mb-0">Scheduled Date/Time</h3>
                                            </Col>
                                        </Row>
                                        <Row className="mt-1">
                                            <Col xs={12} md={4}>
                                                <CustomTextFieldDatePicket
                                                    label="Service Date"
                                                    controlId="serviceItems.0.service_date"
                                                    selectedDate={
                                                        serviceItems[0]?.service_date ??
                                                        getValues("serviceItems.0.service_date" as any)
                                                    }
                                                    onChange={(date) =>
                                                        patchCreateScheduleField(
                                                            "service_date",
                                                            date?.toISOString() || ""
                                                        )
                                                    }
                                                    placeholderText="Select Date"
                                                    error={(errors as Record<string, any>)?.serviceItems?.[0]?.service_date}
                                                    register={register}
                                                    validation={{ required: "Service date is required" }}
                                                    setValue={setValue}
                                                />
                                            </Col>
                                            <Col xs={12} md={4}>
                                                <CustomTextFieldTimePicket
                                                    label="From Time"
                                                    controlId="serviceItems.0.service_from_time"
                                                    selectedTime={
                                                        serviceItems[0]?.service_from_time ??
                                                        getValues("serviceItems.0.service_from_time" as any)
                                                    }
                                                    onChange={(date) =>
                                                        patchCreateScheduleField(
                                                            "service_from_time",
                                                            date?.toISOString() || ""
                                                        )
                                                    }
                                                    placeholderText="Select Time"
                                                    error={(errors as Record<string, any>)?.serviceItems?.[0]?.service_from_time}
                                                    register={register}
                                                    validation={{ required: "From time is required" }}
                                                    setValue={setValue}
                                                    filterTime={(time) => {
                                                        const hour = time.getHours();
                                                        return hour >= 8 && hour <= 23;
                                                    }}
                                                />
                                            </Col>
                                            <Col xs={12} md={4}>
                                                <CustomTextFieldTimePicket
                                                    label="To Time"
                                                    controlId="serviceItems.0.service_to_time"
                                                    selectedTime={
                                                        serviceItems[0]?.service_to_time ??
                                                        getValues("serviceItems.0.service_to_time" as any)
                                                    }
                                                    onChange={(date) =>
                                                        patchCreateScheduleField(
                                                            "service_to_time",
                                                            date?.toISOString() || ""
                                                        )
                                                    }
                                                    placeholderText="Select Time"
                                                    error={(errors as Record<string, any>)?.serviceItems?.[0]?.service_to_time}
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
                                ) : null}

                                <section className="custom-other-details mt-3" style={sectionShell}>
                                    <Row className="align-items-center mb-3 pb-2 border-bottom">
                                        <Col>
                                            <h3 className="mb-0">Payment information</h3>
                                        </Col>
                                    </Row>

                                    <div style={priceSummarySection}>
                                        <div style={paymentSubcard}>
                                            <div style={summaryRow}>
                                                <span style={summaryLabel}>Service Amount</span>
                                                <span style={summaryValueTop}>
                                                    {AppConstant.currencySymbol}
                                                    {Number(paymentDetails.subTotal || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div style={summaryRow}>
                                                <span style={summaryLabel}>
                                                    Tax ({taxPctLabel.toFixed(2)}%)
                                                </span>
                                                <span style={summaryValueTop}>
                                                    {AppConstant.currencySymbol}
                                                    {Number(paymentDetails.tax || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div style={summaryRow}>
                                                <span style={summaryLabel}>
                                                    Commission ({commissionPctLabel.toFixed(2)}%)
                                                </span>
                                                <span style={summaryValueTop}>
                                                    {AppConstant.currencySymbol}
                                                    {Number(paymentDetails.partnerCommissionPlatformFee || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div style={summaryRow}>
                                                <div
                                                    className="d-flex flex-column align-items-start gap-1"
                                                    style={{ minWidth: 0, flex: "1 1 auto" }}>
                                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                                        <span style={summaryLabel}>Offer</span>
                                                        {(offerIdWatch ?? "").trim() ? (
                                                            <span
                                                                className="px-2 py-0 rounded-pill"
                                                                style={{
                                                                    fontSize: FONT_LABEL,
                                                                    fontWeight: 600,
                                                                    border: "1px solid var(--primary-color)",
                                                                    color: "var(--primary-txt-color)",
                                                                    backgroundColor: "var(--bg-color)",
                                                                }}>
                                                                {String(
                                                                    previewOfferBreakdown.offerCode ??
                                                                        previewOfferBreakdown.offerName ??
                                                                        offerIdWatch ??
                                                                        ""
                                                                ).trim()}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {(offerIdWatch ?? "").trim() ? (
                                                        <span style={offerSublineCreate}>
                                                            {previewOfferBreakdown.percentOffOrder != null ? (
                                                                <>
                                                                    ({" "}
                                                                    {formatOfferSplitPercent(
                                                                        previewOfferBreakdown.percentOffOrder
                                                                    )}
                                                                    % off order total {AppConstant.currencySymbol}
                                                                    {(
                                                                        previewOfferBreakdown.discountBaseForPercent ??
                                                                        0
                                                                    ).toFixed(2)}{" "}
                                                                    · Discount {AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.appliedDiscount.toFixed(2)} ·
                                                                    Admin{" "}
                                                                    {formatOfferSplitPercent(
                                                                        offerContributionPercents.adminPct
                                                                    )}
                                                                    % ({AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.adminContribution.toFixed(2)}) ·
                                                                    Partner{" "}
                                                                    {formatOfferSplitPercent(
                                                                        offerContributionPercents.partnerPct
                                                                    )}
                                                                    % ({AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.partnerContribution.toFixed(2)}{" "}
                                                                    ) )
                                                                </>
                                                            ) : (
                                                                <>
                                                                    ( Total discount value {AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.appliedDiscount.toFixed(2)} ·
                                                                    Admin{" "}
                                                                    {formatOfferSplitPercent(
                                                                        offerContributionPercents.adminPct
                                                                    )}
                                                                    % ({AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.adminContribution.toFixed(2)}) ·
                                                                    Partner{" "}
                                                                    {formatOfferSplitPercent(
                                                                        offerContributionPercents.partnerPct
                                                                    )}
                                                                    % ({AppConstant.currencySymbol}
                                                                    {previewOfferBreakdown.partnerContribution.toFixed(2)}{" "}
                                                                    ) )
                                                                </>
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span
                                                    style={{
                                                        ...summaryValueTop,
                                                        flexShrink: 0,
                                                        color:
                                                            (offerIdWatch ?? "").trim() !== "" &&
                                                            previewOfferBreakdown.appliedDiscount > 0.009
                                                                ? "var(--bs-success, #198754)"
                                                                : undefined,
                                                    }}>
                                                    {(offerIdWatch ?? "").trim() !== "" &&
                                                    previewOfferBreakdown.appliedDiscount > 0.009
                                                        ? `-${AppConstant.currencySymbol}${previewOfferBreakdown.appliedDiscount.toFixed(2)}`
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    ...summaryTotalWrap,
                                                    flexWrap: "wrap",
                                                    rowGap: "6px",
                                                }}>
                                                <div className="d-flex flex-wrap align-items-center gap-2">
                                                    <span style={summaryTotalLabel}>Total Price</span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0 small"
                                                        style={{
                                                            color: "var(--primary-color)",
                                                            textDecoration: "underline",
                                                            fontSize: FONT_LABEL,
                                                            fontWeight: 600,
                                                        }}
                                                        onClick={() => {
                                                            if ((offerIdWatch ?? "").trim()) {
                                                                setValue("offer_id", "", {
                                                                    shouldValidate: true,
                                                                    shouldDirty: true,
                                                                });
                                                            } else {
                                                                setOfferModalOpen(true);
                                                            }
                                                        }}>
                                                        {(offerIdWatch ?? "").trim() ? "Remove offer" : "Apply offer"}
                                                    </button>
                                                </div>
                                                <div className="text-end">
                                                    <span style={summaryTotalValue}>
                                                        {AppConstant.currencySymbol}
                                                        {totalPriceAfterOfferCreate.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="custom-other-details mt-3" style={sectionShell}>
                                        <Row className="align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap g-2">
                                            <Col xs="auto" className="me-auto d-flex flex-wrap align-items-baseline gap-2 gap-md-3">
                                                <h3 className="mb-0">User payments</h3>
                                                <span className="text-secondary" style={{ fontSize: FONT_LABEL }}>
                                                    Final total
                                                </span>
                                                <span className="fw-semibold" style={{ ...moneyTabular, fontSize: FONT_BODY }}>
                                                    {AppConstant.currencySymbol}
                                                    {Number(createFinalTotal || 0).toFixed(2)}
                                                </span>
                                            </Col>
                                            <Col xs="auto">
                                                <Button
                                                    type="button"
                                                    className="custom-btn-secondary w-auto"
                                                    disabled={!canAddCustomerCreate}
                                                    onClick={() =>
                                                        setCreatePaymentExt((e) => ({
                                                            ...e,
                                                            customerPayments: [
                                                                ...e.customerPayments,
                                                                {
                                                                    id: newPayRowId(),
                                                                    date: "",
                                                                    amount: 0,
                                                                    type: "COD",
                                                                    description: "",
                                                                },
                                                            ],
                                                        }))
                                                    }>
                                                    Add User payment
                                                </Button>
                                            </Col>
                                        </Row>
                                        <div style={paymentSubcard}>
                                            <Table
                                                bordered
                                                size="sm"
                                                className="mb-0 align-middle"
                                                style={{ color: "var(--content-txt-color)", width: "100%" }}>
                                                <colgroup>
                                                    <col style={{ width: 44 }} />
                                                    <col style={{ width: 170 }} />
                                                    <col style={{ width: 120 }} />
                                                    <col style={{ width: 150 }} />
                                                    <col />
                                                    <col style={{ width: 44 }} />
                                                </colgroup>
                                                <thead className="table-light">
                                                    <tr style={{ borderColor: "var(--lb1-border, var(--txtfld-border))" }}>
                                                        <th className="text-center fw-semibold" style={tableThCreate}>
                                                            S.No
                                                        </th>
                                                        <th className="text-start fw-semibold" style={tableThCreate}>
                                                            Date
                                                        </th>
                                                        <th className="text-end fw-semibold" style={tableThCreate}>
                                                            Paid amount
                                                        </th>
                                                        <th className="text-start fw-semibold" style={tableThCreate}>
                                                            Type
                                                        </th>
                                                        <th className="text-start fw-semibold" style={tableThCreate}>
                                                            Description
                                                        </th>
                                                        <th
                                                            className="text-center fw-semibold"
                                                            style={tableThCreate}
                                                            aria-label="Remove row"
                                                        />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {createPaymentExt.customerPayments.map((row, idx) => (
                                                        <tr key={row.id}>
                                                            <td className="align-middle text-center fw-medium">{idx + 1}</td>
                                                            <td className="align-middle">
                                                                <CustomDatePicker
                                                                    label=""
                                                                    controlId={`create-cust-date-${row.id}`}
                                                                    selectedDate={row.date || null}
                                                                    onChange={(d: Date | null) => {
                                                                        if (!d) return;
                                                                        const y = d.getFullYear();
                                                                        const m = `${d.getMonth() + 1}`.padStart(2, "0");
                                                                        const day = `${d.getDate()}`.padStart(2, "0");
                                                                        updateCreateCustomer(row.id, {
                                                                            date: `${y}-${m}-${day}`,
                                                                        });
                                                                    }}
                                                                    register={register}
                                                                    setValue={setValue}
                                                                    asCol={false}
                                                                    groupClassName="mb-0"
                                                                    filterDate={() => true}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <CustomFormInput
                                                                    label=""
                                                                    controlId={`create-cust-amt-${row.id}`}
                                                                    placeholder="0.00"
                                                                    register={register}
                                                                    asCol={false}
                                                                    inputType="text"
                                                                    inputClassName="text-end"
                                                                    inputStyle={tablePriceInputCreate}
                                                                    value={row.amount === 0 ? "" : String(row.amount)}
                                                                    onChange={(val) => {
                                                                        setCreatePaymentExt((e) => {
                                                                            const cap = Math.max(0, createFinalTotal);
                                                                            const otherSum = sumCustomerAmounts(
                                                                                e.customerPayments.filter(
                                                                                    (r) => r.id !== row.id
                                                                                )
                                                                            );
                                                                            const maxForRow = Math.max(0, cap - otherSum);
                                                                            const t = val.trim();
                                                                            let nextAmount = 0;
                                                                            if (t !== "") {
                                                                                const n = parseFloat(t);
                                                                                if (!Number.isNaN(n) && n >= 0) {
                                                                                    nextAmount = Math.min(n, maxForRow);
                                                                                }
                                                                            }
                                                                            return {
                                                                                ...e,
                                                                                customerPayments:
                                                                                    e.customerPayments.map((r) =>
                                                                                        r.id === row.id
                                                                                            ? { ...r, amount: nextAmount }
                                                                                            : r
                                                                                    ),
                                                                            };
                                                                        });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <CustomFormSelect
                                                                    label=""
                                                                    controlId={`create-cust-type-${row.id}`}
                                                                    register={register}
                                                                    fieldName={`createCustPayType_${row.id}`}
                                                                    options={PAY_TYPES}
                                                                    defaultValue={row.type}
                                                                    setValue={setValue}
                                                                    asCol={false}
                                                                    noBottomMargin
                                                                    menuPortal
                                                                    onChange={(ev: React.ChangeEvent<HTMLSelectElement>) =>
                                                                        updateCreateCustomer(row.id, {
                                                                            type: ev.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </td>
                                                            <td
                                                                className="align-middle text-wrap"
                                                                style={{ wordBreak: "break-word" }}>
                                                                <Form.Control
                                                                    size="sm"
                                                                    className="custom-form-input"
                                                                    style={{ fontSize: FONT_BODY, marginBottom: 0 }}
                                                                    value={row.description}
                                                                    onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                                                                        updateCreateCustomer(row.id, {
                                                                            description: ev.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <i
                                                                    className="bi bi-trash text-danger fs-6"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    title="Remove row"
                                                                    aria-label="Remove user payment row"
                                                                    onClick={() => {
                                                                        if (createPaymentExt.customerPayments.length <= 1)
                                                                            return;
                                                                        openConfirmDialog(
                                                                            "Are you sure you want to delete this user payment entry?",
                                                                            "Delete",
                                                                            "Cancel",
                                                                            () =>
                                                                                setCreatePaymentExt((e) => ({
                                                                                    ...e,
                                                                                    customerPayments:
                                                                                        e.customerPayments.filter(
                                                                                            (r) => r.id !== row.id
                                                                                        ),
                                                                                }))
                                                                        );
                                                                    }}
                                                                    onKeyDown={(ev) => {
                                                                        if (ev.key !== "Enter" && ev.key !== " ")
                                                                            return;
                                                                        ev.preventDefault();
                                                                        (ev.target as HTMLElement).click();
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                        <div className="mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Total Paid</span>
                                                <span className="fw-semibold" style={moneyTabular}>
                                                    {AppConstant.currencySymbol}
                                                    {createCustomerPaidBal.totalPaid.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Balance</span>
                                                <span className="fw-semibold" style={moneyTabular}>
                                                    {AppConstant.currencySymbol}
                                                    {createCustomerPaidBal.balance.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="custom-other-details mt-3 mb-0" style={sectionShell}>
                                        <Row className="align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap g-2">
                                            <Col xs="auto" className="me-auto d-flex flex-wrap align-items-baseline gap-2 gap-md-3">
                                                <h3 className="mb-0">Partner payments</h3>
                                                <span className="text-secondary" style={{ fontSize: FONT_LABEL }}>
                                                    Partner total
                                                </span>
                                                <span className="fw-semibold" style={{ ...moneyTabular, fontSize: FONT_BODY }}>
                                                    {AppConstant.currencySymbol}
                                                    {Number(createPartnerCap || 0).toFixed(2)}
                                                </span>
                                            </Col>
                                            <Col xs="auto">
                                                <Button
                                                    type="button"
                                                    className="custom-btn-secondary w-auto"
                                                    disabled={!canAddPartnerCreate}
                                                    onClick={() =>
                                                        setCreatePaymentExt((e) => ({
                                                            ...e,
                                                            partnerPayments: [
                                                                ...e.partnerPayments,
                                                                { id: newPayRowId(), date: "", amount: 0, description: "" },
                                                            ],
                                                        }))
                                                    }>
                                                    Add partner payment
                                                </Button>
                                            </Col>
                                        </Row>
                                        <div style={paymentSubcard}>
                                            <Table
                                                bordered
                                                size="sm"
                                                className="mb-0 align-middle"
                                                style={{ color: "var(--content-txt-color)", width: "100%" }}>
                                                <colgroup>
                                                    <col style={{ width: 44 }} />
                                                    <col style={{ width: 170 }} />
                                                    <col style={{ width: 120 }} />
                                                    <col />
                                                    <col style={{ width: 44 }} />
                                                </colgroup>
                                                <thead className="table-light">
                                                    <tr style={{ borderColor: "var(--lb1-border, var(--txtfld-border))" }}>
                                                        <th className="text-center fw-semibold" style={tableThCreate}>
                                                            S.No
                                                        </th>
                                                        <th className="text-start fw-semibold" style={tableThCreate}>
                                                            Date
                                                        </th>
                                                        <th className="text-end fw-semibold" style={tableThCreate}>
                                                            Paid amount
                                                        </th>
                                                        <th className="text-start fw-semibold" style={tableThCreate}>
                                                            Description
                                                        </th>
                                                        <th
                                                            className="text-center fw-semibold"
                                                            style={tableThCreate}
                                                            aria-label="Remove row"
                                                        />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {createPaymentExt.partnerPayments.map((row, idx) => (
                                                        <tr key={row.id}>
                                                            <td className="align-middle text-center fw-medium">{idx + 1}</td>
                                                            <td className="align-middle">
                                                                <CustomDatePicker
                                                                    label=""
                                                                    controlId={`create-part-date-${row.id}`}
                                                                    selectedDate={row.date || null}
                                                                    onChange={(d: Date | null) => {
                                                                        if (!d) return;
                                                                        const y = d.getFullYear();
                                                                        const m = `${d.getMonth() + 1}`.padStart(2, "0");
                                                                        const day = `${d.getDate()}`.padStart(2, "0");
                                                                        updateCreatePartner(row.id, {
                                                                            date: `${y}-${m}-${day}`,
                                                                        });
                                                                    }}
                                                                    register={register}
                                                                    setValue={setValue}
                                                                    asCol={false}
                                                                    groupClassName="mb-0"
                                                                    filterDate={() => true}
                                                                />
                                                            </td>
                                                            <td className="align-middle">
                                                                <CustomFormInput
                                                                    label=""
                                                                    controlId={`create-part-amt-${row.id}`}
                                                                    placeholder="0.00"
                                                                    register={register}
                                                                    asCol={false}
                                                                    inputType="text"
                                                                    inputClassName="text-end"
                                                                    inputStyle={tablePriceInputCreate}
                                                                    value={row.amount === 0 ? "" : String(row.amount)}
                                                                    onChange={(val) => {
                                                                        setCreatePaymentExt((e) => {
                                                                            const cap = Math.max(0, createPartnerCap);
                                                                            const otherSum = sumPartnerAmounts(
                                                                                e.partnerPayments.filter(
                                                                                    (r) => r.id !== row.id
                                                                                )
                                                                            );
                                                                            const maxForRow = Math.max(0, cap - otherSum);
                                                                            const t = val.trim();
                                                                            let nextAmount = 0;
                                                                            if (t !== "") {
                                                                                const n = parseFloat(t);
                                                                                if (!Number.isNaN(n) && n >= 0) {
                                                                                    nextAmount = Math.min(n, maxForRow);
                                                                                }
                                                                            }
                                                                            return {
                                                                                ...e,
                                                                                partnerPayments: e.partnerPayments.map(
                                                                                    (r) =>
                                                                                        r.id === row.id
                                                                                            ? { ...r, amount: nextAmount }
                                                                                            : r
                                                                                ),
                                                                            };
                                                                        });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td
                                                                className="align-middle text-wrap"
                                                                style={{ wordBreak: "break-word" }}>
                                                                <Form.Control
                                                                    size="sm"
                                                                    className="custom-form-input"
                                                                    style={{ fontSize: FONT_BODY, marginBottom: 0 }}
                                                                    value={row.description}
                                                                    onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                                                                        updateCreatePartner(row.id, {
                                                                            description: ev.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <i
                                                                    className="bi bi-trash text-danger fs-6"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    title="Remove row"
                                                                    aria-label="Remove partner payment row"
                                                                    onClick={() => {
                                                                        if (createPaymentExt.partnerPayments.length <= 1)
                                                                            return;
                                                                        openConfirmDialog(
                                                                            "Are you sure you want to delete this partner payment entry?",
                                                                            "Delete",
                                                                            "Cancel",
                                                                            () =>
                                                                                setCreatePaymentExt((e) => ({
                                                                                    ...e,
                                                                                    partnerPayments:
                                                                                        e.partnerPayments.filter(
                                                                                            (r) => r.id !== row.id
                                                                                        ),
                                                                                }))
                                                                        );
                                                                    }}
                                                                    onKeyDown={(ev) => {
                                                                        if (ev.key !== "Enter" && ev.key !== " ")
                                                                            return;
                                                                        ev.preventDefault();
                                                                        (ev.target as HTMLElement).click();
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                        <div className="mt-3 pt-3 border-top">
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Total Paid</span>
                                                <span className="fw-semibold" style={moneyTabular}>
                                                    {AppConstant.currencySymbol}
                                                    {createPartnerPaidBal.totalPaid.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center py-1">
                                                <span className="text-secondary">Balance</span>
                                                <span className="fw-semibold" style={moneyTabular}>
                                                    {AppConstant.currencySymbol}
                                                    {createPartnerPaidBal.balance.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        ) : (
                            <>
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
                                                onChange={async (value) => await fetchUserFromApi(value)}
                                            />
                                        </Col>
                                        <ShowDetailsRow title="User ID" value={selectedUser?.user_id} />
                                        <ShowDetailsRow title="User Name" value={selectedUser?.name} />
                                    </Row>
                                    <Row>
                                        <ShowDetailsRow
                                            title="Address"
                                            value={selectedUser?.address ?? selectedUser?.city_name ?? "-"}
                                        />
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
                                                defaultValue={
                                                    order?.city_id
                                                        ? order?.city_id
                                                        : getValues("city_id")
                                                }
                                                setValue={setValue as (name: string, value: any) => void}
                                                onChange={async (e) => await fetchCategoryFromApi(e.target.value)}
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
                                                defaultValue={
                                                    order?.category_id
                                                        ? order?.category_id
                                                        : getValues("category_id")
                                                }
                                                setValue={setValue as (name: string, value: any) => void}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                            />
                                        </Col>
                                        <Col xs={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="Payment Mode"
                                                controlId="Payment"
                                                options={payments}
                                                register={register}
                                                fieldName="payment_mode_id"
                                                error={errors.payment_mode_id}
                                                requiredMessage="Please select payment"
                                                defaultValue={
                                                    order?.payment_mode_id
                                                        ? order?.payment_mode_id
                                                        : getValues("payment_mode_id")
                                                }
                                                setValue={setValue as (name: string, value: any) => void}
                                            />
                                        </Col>
                                        <Col xs={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="Offer"
                                                controlId="offer_id"
                                                options={offerOptions}
                                                register={register}
                                                fieldName="offer_id"
                                                error={errors.offer_id}
                                                defaultValue={order?.offer_id ?? ""}
                                                setValue={setValue as (name: string, value: any) => void}
                                            />
                                        </Col>
                                        <Col xs={4} className="mt-2">
                                            <CustomTextFieldSelect
                                                label="Employee"
                                                controlId="created_by_id"
                                                options={employeeOptions}
                                                register={register}
                                                fieldName="created_by_id"
                                                error={errors.created_by_id}
                                                requiredMessage={
                                                    employeeOptions.length > 0 ? "Please select employee" : undefined
                                                }
                                                defaultValue={
                                                    order?.created_by_id ??
                                                    getLocalStorage(AppConstant.createdById) ??
                                                    ""
                                                }
                                                setValue={setValue as (name: string, value: any) => void}
                                            />
                                        </Col>
                                    </Row>
                                </section>
                            </>
                        )}
                        {isEditable && taxDetails && (
                            <ServiceItemForm
                                taxDetails={taxDetails}
                                categoryId={selectedCategory}
                                onChange={setServiceItems}
                                register={register}
                                setValue={setValue}
                                getValues={getValues}
                                errors={errors}
                                compact={false}
                            />
                        )}
                        {isEditable && (
                            <>
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
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${paymentDetails.subTotal ? paymentDetails.subTotal : 0}`}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>User Platform Fee: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${paymentDetails.userPlatformFee ? paymentDetails.userPlatformFee : 0}`}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Tax: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${paymentDetails.tax ? paymentDetails.tax : 0}`}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>Total Price: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 25, color: ("var(--primary-txt-color)") }}>{`${AppConstant.currencySymbol}${paymentDetails.totalPrice ? paymentDetails.totalPrice : 0}`}</label>
                                </Col>

                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Partner Commission Platform Fee: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${paymentDetails.partnerCommissionPlatformFee ? paymentDetails.partnerCommissionPlatformFee : 0}`}</label>
                                </Col>
                                <Col xs={12} className="text-end">
                                    <label className="col custom-personal-row-title" style={{ fontSize: 18 }}>Admin Earning: </label>
                                    <label className="col custom-personal-row-value" style={{ fontSize: 18 }}>{`${AppConstant.currencySymbol}${paymentDetails.adminEarning ? paymentDetails.adminEarning : 0}`}</label>
                                </Col>
                            </Row>
                        </section>
                        </>
                         )}
                        <Row className="mt-4">
                            <Col xs={12} className="text-center d-flex justify-content-end gap-3">
                                <Button type="submit" className="custom-btn-primary">
                                    {isEditable ? "Update" : "Create"}
                                </Button>
                                <Button type="button" className="custom-btn-secondary" onClick={onClose}>
                                    Cancel
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </div>
        </Modal>
        {!isEditable && (
            <Modal
                show={offerModalOpen}
                onHide={() => setOfferModalOpen(false)}
                centered
                enforceFocus={false}>
                <Modal.Header closeButton className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Apply offer
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <CustomTextFieldSelect
                        label="Offer"
                        controlId="Offer_modal"
                        options={offerOptions}
                        register={register}
                        fieldName="offer_id"
                        error={errors.offer_id}
                        defaultValue={getValues("offer_id")}
                        setValue={setValue as (name: string, value: any) => void}
                        menuPortal
                    />
                </Modal.Body>
                <Modal.Footer className="border-top-0 pt-0">
                    <Button type="button" className="custom-btn-primary" onClick={() => setOfferModalOpen(false)}>
                        Done
                    </Button>
                </Modal.Footer>
            </Modal>
        )}
        </>
    );
};

CreateUpdateOrderDialog.show = (isEditable: boolean, order: OrderModel | null, onRefreshData: () => void) => {
    openDialog("order-modal", (close) => (
        <CreateUpdateOrderDialog
            isEditable={isEditable}
            order={order}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default CreateUpdateOrderDialog;