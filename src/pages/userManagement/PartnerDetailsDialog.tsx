import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, Col, Row, Carousel } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { BankAccountModel } from "../../models/BankAccountModel";
import { fetchUserById } from "../../services/userService";
import { getMockVerificationUserById } from "../../mockData/verificationTableMock";
import editIcon from "../../assets/icons/edit_red.svg"
import addIcon from "../../assets/icons/add.svg"
import deleteIcon from "../../assets/icons/delete_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, DetailsRowLink, formatDate, DetailsRowLinkDocument } from "../../helper/utility";
import AddEditBankAccountDialog from "./AddEditBankAccountDialog";
import { DocumentModel } from "../../models/DocumentModel";
import { AppConstant } from "../../constant/AppConstant";
import CustomUploadDialog from "../../components/CustomUpload";
import { createOrUpdateDocument } from "../../services/documentUploadService";
import { updatePartnerDocument, deletePartnerDocument } from "../../services/partnerDocumentService";
import { showErrorAlert } from "../../helper/alertHelper";
import { openConfirmDialog } from "../../components/CustomConfirmDialog";
import { CustomImagePreviewDialog } from "../../components/CustomImagePreview";
import ServiceDetailsDialog from "./ServiceDetailsDialog";
import { openDialog } from "../../helper/DialogManager";
import { fetchCategoryDropDown } from "../../services/categoryService";
import { fetchService } from "../../services/servicesService";
import { buildViewCategoryServiceGroups } from "./partnerCategoryServiceView";
import type { ViewCategoryServicesGroup } from "./partnerCategoryServiceView";
import EditPartnerCategoriesServicesDialog from "./EditPartnerCategoriesServicesDialog";

type PartnerDetailsDialogProps = {
    userId: string;
    onClose: () => void;
    onRefreshData: () => void;
    /**
     * Verification tab: mock user (no `fetchUserById`); same partner layout and edit controls.
     * Verification & Documents uses fixed rows with no Add (PAN shows View/Delete; delete is preview-only).
     */
    verificationStaticPreview?: boolean;
};

type StaticPartnerBankAccount = {
    id: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
};

type CatalogOption = { value: string; label: string };

type CatalogServiceLite = {
    _id: string;
    name: string;
    category_id: string;
    category_name?: string;
};

/** Demo data for multi-account carousel (API may return a single bank_account today). */
const STATIC_PARTNER_BANK_ACCOUNTS: StaticPartnerBankAccount[] = [
    {
        id: "static-acc-1",
        account_holder_name: "Apex Logistics Pvt Ltd",
        account_number: "XXXX4521987321",
        ifsc_code: "HDFC0001234",
        bank_name: "HDFC Bank Ltd.",
    },
    {
        id: "static-acc-2",
        account_holder_name: "Apex Logistics Pvt Ltd",
        account_number: "XXXX8890123456",
        ifsc_code: "SBIN0000456",
        bank_name: "State Bank of India",
    },
    {
        id: "static-acc-3",
        account_holder_name: "Apex Logistics Pvt Ltd",
        account_number: "XXXX3344556677",
        ifsc_code: "ICIC0007890",
        bank_name: "ICICI Bank Ltd.",
    },
    {
        id: "static-acc-4",
        account_holder_name: "Apex Logistics Pvt Ltd",
        account_number: "XXXX1122334455",
        ifsc_code: "AXIS0009988",
        bank_name: "Axis Bank Ltd.",
    },
];

const DUMMY_PARTNER_CATEGORY_SERVICE_GROUPS: ViewCategoryServicesGroup[] = [
    {
        categoryId: "dummy-cat-1",
        categoryLabel: "Home cleaning",
        services: ["Deep clean", "Kitchen cleaning", "Bathroom cleaning"],
    },
    {
        categoryId: "dummy-cat-2",
        categoryLabel: "Appliance repair",
        services: ["AC servicing", "Washing machine repair"],
    },
];

function normalizeBankDigits(value: string): string {
    return value.replace(/\s/g, "").replace(/[xX*]/g, "").toLowerCase();
}

function bankCarouselRowMatchesApiAccount(
    acc: Pick<StaticPartnerBankAccount, "account_number" | "ifsc_code">,
    api: BankAccountModel | null | undefined
): boolean {
    if (!api?._id) return false;
    const ifscMatch =
        acc.ifsc_code.replace(/\s/g, "").toLowerCase() === api.ifsc_code.replace(/\s/g, "").toLowerCase();
    if (!ifscMatch) return false;
    const rowDigits = normalizeBankDigits(acc.account_number);
    const apiDigits = normalizeBankDigits(api.account_number);
    if (rowDigits && apiDigits) {
        return rowDigits === apiDigits || rowDigits.endsWith(apiDigits) || apiDigits.endsWith(rowDigits);
    }
    return acc.account_number.replace(/\s/g, "") === api.account_number.replace(/\s/g, "");
}

function bankAccountFromCarouselRow(
    acc: StaticPartnerBankAccount & { isActive: boolean },
    apiAccount: BankAccountModel | null | undefined
): BankAccountModel {
    if (bankCarouselRowMatchesApiAccount(acc, apiAccount) && apiAccount) {
        return {
            ...apiAccount,
            is_active: apiAccount.is_active ?? acc.isActive,
        };
    }
    return {
        _id: "",
        partner_id: "",
        bank_name: acc.bank_name,
        account_holder_name: acc.account_holder_name,
        account_number: acc.account_number,
        ifsc_code: acc.ifsc_code,
        branch_name: "",
        is_primary: true,
        deleted_at: null,
        created_at: null,
        updated_at: null,
        is_active: acc.isActive,
    };
}

/** Demo labels in Verification & Documents when `verificationStaticPreview` (no live payment/service fields). */
const STATIC_VERIFICATION_PREVIEW_STATUS = "Under review (sample)";
const STATIC_VERIFICATION_PREVIEW_DATE = "—";

/** Sample PAN row for verification preview — image uses bundled asset (see `documentPreviewImageSrc`). */
const STATIC_VERIFICATION_PAN_DOCUMENT: DocumentModel = {
    _id: "ver-preview-pan",
    partner_id: null,
    document_id: "pan-card",
    name: "PAN Card",
    rejected_reasone: "",
    document_image: profileIcon,
    verification_status: 2,
    is_optional: true,
    is_active: true,
    deleted_at: null,
    created_at: null,
    updated_at: null,
};

function PartnerDetailsDialogView({
    userId,
    onClose,
    onRefreshData,
    verificationStaticPreview = false,
}: PartnerDetailsDialogProps) {

    const [userDetails, setUserDetails] = useState<UserModel>();
    const [activeStaticBankAccountId, setActiveStaticBankAccountId] = useState(STATIC_PARTNER_BANK_ACCOUNTS[0].id);
    const [catalogServices, setCatalogServices] = useState<CatalogServiceLite[]>([]);
    const [catalogCategoryOptions, setCatalogCategoryOptions] = useState<CatalogOption[]>([]);
    const fetchRef = useRef(false);

    const orderedStaticBankAccounts = useMemo(() => {
        const active = STATIC_PARTNER_BANK_ACCOUNTS.find((a) => a.id === activeStaticBankAccountId);
        const rest = STATIC_PARTNER_BANK_ACCOUNTS.filter((a) => a.id !== activeStaticBankAccountId);
        const ordered = active ? [active, ...rest] : [...STATIC_PARTNER_BANK_ACCOUNTS];
        return ordered.map((a) => ({ ...a, isActive: a.id === activeStaticBankAccountId }));
    }, [activeStaticBankAccountId]);

    const fetchDataFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            if (verificationStaticPreview) {
                setUserDetails(getMockVerificationUserById(userId));
                return;
            }
            const { response, user } = await fetchUserById(userId);
            if (response) {
                setUserDetails(user!!);
            }
        } finally {
            fetchRef.current = false;
        }
    }, [userId, verificationStaticPreview]);

    const onRefreshuser = useCallback(async () => {
        await fetchDataFromApi();
        onRefreshData();
    }, [fetchDataFromApi, onRefreshData]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    useEffect(() => {
        if (!userDetails?.city_id) {
            setCatalogServices([]);
            setCatalogCategoryOptions([]);
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const [cats, svcRes] = await Promise.all([
                    fetchCategoryDropDown(userDetails.city_id ?? undefined),
                    fetchService(1, 500, {}),
                ]);
                if (cancelled) return;
                const catList = Array.isArray(cats) ? cats.filter((c: CatalogOption) => c?.value) : [];
                setCatalogCategoryOptions([{ value: "select-all", label: "Select All" }, ...catList]);
                const list = svcRes?.response && Array.isArray(svcRes.services) ? svcRes.services : [];
                setCatalogServices(
                    list.map((s) => ({
                        _id: String((s as { _id?: string })._id ?? ""),
                        name: String((s as { name?: string }).name ?? ""),
                        category_id: String((s as { category_id?: string }).category_id ?? ""),
                        category_name: (s as { category_name?: string }).category_name
                            ? String((s as { category_name?: string }).category_name)
                            : undefined,
                    }))
                );
            } catch {
                if (!cancelled) {
                    setCatalogCategoryOptions([{ value: "select-all", label: "Select All" }]);
                    setCatalogServices([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userDetails?.city_id, userDetails?._id]);

    const viewCategoryServiceGroups = useMemo(() => {
        if (!userDetails) return [];
        const built = buildViewCategoryServiceGroups(
            {
                category_ids: userDetails.category_ids ?? undefined,
                service_ids: userDetails.service_ids ?? undefined,
                category_names: userDetails.category_names ?? undefined,
                service_names: userDetails.service_names ?? undefined,
            },
            catalogServices,
            catalogCategoryOptions
        );
        return built.length > 0 ? built : DUMMY_PARTNER_CATEGORY_SERVICE_GROUPS;
    }, [userDetails, catalogServices, catalogCategoryOptions]);

    const openServices = (status: number | null) => {
        if (verificationStaticPreview) {
            showErrorAlert("Service details are not available in verification preview.");
            return;
        }
        // `order_service/getAll?partner_id=` expects the partner document `_id` (ObjectId). Passing display id (e.g. P1029) can trigger a 500 from the API.
        ServiceDetailsDialog.show(userId, true, status, onRefreshuser);
    };

    const addDocument = (document: DocumentModel) => {
        if (verificationStaticPreview) {
            showErrorAlert("Adding documents is not available in verification preview.");
            return;
        }
        CustomUploadDialog.show(
            async (files, replaceUrls) => {
                const formData = new FormData();
                formData.append("type", "1");
                files.forEach((file) => formData.append("files", file));

                let { response, fileList } = await createOrUpdateDocument(formData, false);

                if (response) {

                    const payload = {
                        image_url: fileList[0],
                    };
                    if (!document?._id) {
                        showErrorAlert("Unable to update. ID is missing.");
                        return;
                    }

                    let responseUpdate = await updatePartnerDocument(payload, document._id);
                    if (responseUpdate) {
                        onRefreshuser();
                    }
                }
            }
        )
    };

    const deleteDocument = async (document: DocumentModel) => {
        if (verificationStaticPreview) {
            showErrorAlert("Deleting documents is not available in verification preview.");
            return;
        }
        openConfirmDialog(
            "Are you sure you want to delete document?",
            "Delete",
            "Cancel",
            async () => {
                const response = await deletePartnerDocument(document._id);
                if (response) {
                    onRefreshuser();
                }
            },
            deleteIcon
        );

    };

    return (
        <>
            <Modal
                show={true}
                onHide={onClose}
                centered
                scrollable
                size="xl"
                dialogClassName="custom-big-modal partner-details-dialog"
            >
                    <Modal.Header className="py-3 px-4 border-bottom-0">
                        <Modal.Title as="h5" className="custom-modal-title">
                            Partner Information
                        </Modal.Title>
                        <CustomCloseButton onClose={onClose} />
                    </Modal.Header>
                    <Modal.Body className="px-4 pb-4 pt-0">
                        <div className="custom-info">
                            <div>
                                <p>Personal</p>
                                <img src={userDetails?.profile_url
                                    ? `${AppConstant.IMAGE_BASE_URL}${userDetails?.profile_url}?t=${Date.now()}`
                                    : profileIcon} alt="User profile" width="160px" height="160px" />
                            </div>

                            <div className="custom-personal-details" style={{ flexWrap: "wrap" }}>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Partner Name" value={userDetails?.name} />
                                    <DetailsRow title="Phone No" value={userDetails?.phone_number} />
                                    <DetailsRow title="State" value={userDetails?.state_name} />
                                    <DetailsRow title="Registered Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
                                    <DetailsRow
                                        title="Status"
                                        value={
                                            <span
                                                className={
                                                    userDetails?.is_active ? "custom-active" : "custom-inactive"
                                                }
                                            >
                                                {userDetails?.is_active ? "Active" : "Inactive"}
                                            </span>
                                        }
                                    />
                                </Col>
                                <Col className="custom-helper-column">
                                    <div>
                                        <Row className="row custom-personal-row gx-0 align-items-start">
                                            <div className="col-md-4 custom-personal-row-title">Email ID</div>
                                            <div
                                                className="col-md-8"
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: "normal",
                                                    fontFamily: "Inter",
                                                    color: "var(--txt-color)",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {userDetails?.email === undefined ||
                                                userDetails?.email === "" ||
                                                userDetails?.email === null
                                                    ? "-"
                                                    : userDetails.email}
                                            </div>
                                        </Row>
                                        <Row className="row custom-personal-row gx-0 align-items-start">
                                            <div className="col-md-4 custom-personal-row-title">City</div>
                                            <div
                                                className="col-md-8"
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: "normal",
                                                    fontFamily: "Inter",
                                                    color: "var(--txt-color)",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {userDetails?.city_name === undefined ||
                                                userDetails?.city_name === "" ||
                                                userDetails?.city_name === null
                                                    ? "-"
                                                    : userDetails.city_name}
                                            </div>
                                        </Row>
                                        <Row className="row custom-personal-row gx-0 align-items-start">
                                            <div className="col-md-4 custom-personal-row-title">Postal Code</div>
                                            <div
                                                className="col-md-8"
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: "normal",
                                                    fontFamily: "Inter",
                                                    color: "var(--txt-color)",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {userDetails?.pincode === undefined ||
                                                userDetails?.pincode === "" ||
                                                userDetails?.pincode === null
                                                    ? "-"
                                                    : userDetails.pincode}
                                            </div>
                                        </Row>
                                        <Row className="row custom-personal-row gx-0 align-items-start">
                                            <div className="col-md-4 custom-personal-row-title">Last Service Date</div>
                                            <div
                                                className="col-md-8"
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: "normal",
                                                    fontFamily: "Inter",
                                                    color: "var(--txt-color)",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {formatDate(
                                                    userDetails?.last_service_date
                                                        ? userDetails.last_service_date
                                                        : ""
                                                )}
                                            </div>
                                        </Row>
                                    </div>
                                </Col>
                                <div className="w-100" style={{ flex: "1 1 100%", minWidth: "100%" }}>
                                    <Row className="row custom-personal-row gx-0 align-items-start" style={{ gap: "9rem"}}>
                                        <Col xs={12} sm="auto" className="custom-personal-row-title pe-sm-3 mb-1 mb-sm-0">
                                            Address
                                        </Col>
                                        <Col xs={12} sm style={{ minWidth: 0 }}>
                                            <div
                                                className="text-wrap"
                                                style={{
                                                    fontSize: "16px",
                                                    fontWeight: "normal",
                                                    fontFamily: "Inter",
                                                    color: "var(--txt-color)",
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {userDetails?.address?.trim() ? userDetails.address : "-"}
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                            <img
                                src={editIcon}
                                alt="edit"
                                onClick={() => {
                                    void import("./AddEditUserDialog").then(({ default: AddEditUserDialog }) => {
                                        AddEditUserDialog.show(2, true, userDetails!!, onRefreshuser);
                                    });
                                }}
                            />
                        </div>
                        <Row className="custom-helper-row">
                            <Col>
                                <section
                                    className="custom-other-details "
                                    style={{ marginLeft: "0px", marginRight: "0px" }}
                                >
                                    <h3>Serviced</h3>
                                    <DetailsRowLink
                                        title="No of Services"
                                        value={userDetails?.no_of_services ?? userDetails?.total_service}
                                        onClick={() => openServices(null)}
                                    />
                                    <DetailsRowLink title="Completed" value={userDetails?.completed_service} />
                                    <DetailsRowLink title="In Progress" value={userDetails?.in_progress_service} />
                                    <DetailsRowLink title="Cancelled" value={userDetails?.cancelled_service} />
                                </section>
                            </Col>

                            <Col>
                                <section
                                    className="custom-other-details"
                                    style={{ marginLeft: "0px", marginRight: "0px" }}
                                >
                                    <h3>Payment</h3>
                                    <DetailsRow
                                        title="Total Payment"
                                        value={`${AppConstant.currencySymbol}${userDetails?.total_amount ? userDetails?.total_amount : 0}`}
                                    />
                                    <DetailsRow
                                        title="Paid Amount"
                                        value={`${AppConstant.currencySymbol}${userDetails?.paid_amount ? userDetails?.paid_amount : 0}`}
                                    />
                                    <DetailsRow
                                        title="Balance Amount"
                                        value={`${AppConstant.currencySymbol}${userDetails?.balance_amount ? userDetails?.balance_amount : 0}`}
                                    />
                                    <DetailsRow
                                        title="Refund"
                                        value={`${AppConstant.currencySymbol}${userDetails?.refund_payment ? userDetails?.refund_payment : 0}`}
                                    />
                                </section>
                            </Col>
                            <Col xs={12} md={12}>
                                <section
                                    className="custom-other-details"
                                    style={{ marginLeft: "0px", marginRight: "0px" }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "10px",
                                            paddingRight: "20px",
                                            paddingBottom: '15px'
                                        }}
                                    >
                                        <div>
                                        <h3 style={{ margin: 0 }}>Categories &amp; services</h3>
                                        </div>
                                       <div>
                                       {userDetails ? (
                                            <img
                                                src={editIcon}
                                                alt="Edit categories and services"
                                                title="Edit categories and services"
                                                className="position-absolute"
                                                style={{
                                                    // top: "0.75rem",
                                                    // right: "0.75rem",
                                                    width: "15px",
                                                    height: "15px",
                                                    cursor: "pointer",
                                                    zIndex: 1,
                                                   
                                                }}
                                                onClick={() => {
                                                    openDialog("edit-partner-categories-services", (close) => (
                                                        <EditPartnerCategoriesServicesDialog
                                                            key={`${userDetails._id}-cat-svc-${Date.now()}`}
                                                            user={userDetails}
                                                            initialCategoryIds={(userDetails.category_ids ?? []).map(String)}
                                                            initialServiceIds={(userDetails.service_ids ?? []).map(String)}
                                                            onClose={close}
                                                            onSaved={() => {
                                                                void onRefreshuser();
                                                                close();
                                                            }}
                                                        />
                                                    ));
                                                }}
                                            />
                                        ) : null}
                                       </div>
                                      
                                    </div>
                                    <div
                                        className="rounded position-relative"
                                        style={{
                                            borderColor: "var(--lb1-border)",
                                            background: "var(--bg-color)",
                                        }}
                                    >
                                      
                                        {viewCategoryServiceGroups.length === 0 ? (
                                            <div className="text-muted small py-1">-</div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table
                                                    className="table table-sm table-bordered mb-0 align-middle"
                                                    style={{
                                                        fontSize: "13px",
                                                        color: "var(--content-txt-color)",
                                                        borderColor: "var(--lb1-border)",
                                                    }}
                                                >
                                                    <thead>
                                                        <tr className="" style={{ borderColor: "var(--lb1-border)" }}>
                                                            <th
                                                                scope="col"
                                                                className="fw-semibold py-2 ps-3 pe-0"
                                                                style={{
                                                                    width: "22%",
                                                                    minWidth: "120px",
                                                                    color: "var(--primary-txt-color)",
                                                                }}
                                                            >
                                                                Category
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="fw-semibold  py-2 ps-3 pe-0"
                                                                style={{ color: "var(--primary-txt-color)" }}
                                                            >
                                                                Services offered
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {viewCategoryServiceGroups.map((g) => (
                                                            <tr
                                                                key={g.categoryId}
                                                                style={{ borderColor: "var(--lb1-border)" }}
                                                            >
                                                                <td className="align-top py-2 ps-3 text-wrap">
                                                                    <span style={{ color: "#101010" }}>
                                                                        {g.categoryLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="align-top py-2 ps-3 pe-0">
                                                                    <div className="text-wrap">
                                                                        {g.services.length > 0 ? (
                                                                            <span>{g.services.join(", ")}</span>
                                                                        ) : (
                                                                            <span className="text-muted">—</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </Col>
                        </Row>
                        <Row>
                            <Col className="custom-helper-row">
                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Verification & Documents</h3>
                                    <DetailsRow
                                        title="Verification Status"
                                        value={
                                            verificationStaticPreview
                                                ? STATIC_VERIFICATION_PREVIEW_STATUS
                                                : userDetails?.total_payment
                                        }
                                    />
                                    <DetailsRow
                                        title="Verified Date"
                                        value={
                                            verificationStaticPreview
                                                ? STATIC_VERIFICATION_PREVIEW_DATE
                                                : formatDate(userDetails?.last_paid_date ? userDetails?.last_paid_date : "")
                                        }
                                    />
                                    {verificationStaticPreview ? (
                                        <>
                                            <DetailsRowLinkDocument
                                                title="Vehicle Registration"
                                                isEditable={false}
                                                hideAdd
                                                onAddClick={() => {}}
                                                onViewClick={() => {}}
                                                onDeleteClick={() => {}}
                                            />
                                            <DetailsRowLinkDocument
                                                title="Police Verification Certificate"
                                                isEditable={false}
                                                hideAdd
                                                onAddClick={() => {}}
                                                onViewClick={() => {}}
                                                onDeleteClick={() => {}}
                                            />
                                            <DetailsRowLinkDocument
                                                title="PAN Card"
                                                isEditable
                                                hideAdd
                                                onViewClick={() => CustomImagePreviewDialog(STATIC_VERIFICATION_PAN_DOCUMENT)}
                                                onAddClick={() => {}}
                                                onDeleteClick={() => void deleteDocument(STATIC_VERIFICATION_PAN_DOCUMENT)}
                                            />
                                            <DetailsRowLinkDocument
                                                title="Driving License"
                                                isEditable={false}
                                                hideAdd
                                                onAddClick={() => {}}
                                                onViewClick={() => {}}
                                                onDeleteClick={() => {}}
                                            />
                                            <DetailsRowLinkDocument
                                                title="Aadhar Card"
                                                isEditable={false}
                                                hideAdd
                                                onAddClick={() => {}}
                                                onViewClick={() => {}}
                                                onDeleteClick={() => {}}
                                            />
                                        </>
                                    ) : (
                                        userDetails?.documents?.map((document) => (
                                            <DetailsRowLinkDocument
                                                key={document._id ?? document.document_id ?? document.name ?? ""}
                                                title={document.name || ""}
                                                isEditable={document.document_image === "" ? false : true}
                                                onViewClick={() => CustomImagePreviewDialog(document)}
                                                onAddClick={() => addDocument(document)}
                                                onDeleteClick={() => deleteDocument(document)}
                                            />
                                        ))
                                    )}
                                </section>
                            </Col>

                            <Col className="custom-helper-row">
                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                        <h3 style={{ margin: 0 }}>Accounts</h3>
                                        <div
                                            style={{ cursor: "pointer" }}
                                            onClick={() => {
                                                AddEditBankAccountDialog.show(userId, false, null, onRefreshuser);
                                            }}
                                        >
                                            <img
                                                src={addIcon}
                                                alt="Add bank account"
                                                title="Add bank account"
                                                style={{ width: "18px", height: "18px" }}
                                            />
                                            <span style={{ textDecoration: "underline", color: "var(--primary-txt-color)" }}>
                                                Add
                                            </span>
                                        </div>
                                    </div>
                                    {/*
                                    <DetailsRow title="Account Name" value={userDetails?.bank_account?.account_holder_name} />
                                    <DetailsRow title="Account Number" value={userDetails?.bank_account?.account_number} />
                                    <DetailsRow title="IFSC Code" value={userDetails?.bank_account?.ifsc_code} />
                                    <DetailsRow title="Bank Name" value={userDetails?.bank_account?.bank_name} />
                                    */}
                                    <Carousel
                                        key={activeStaticBankAccountId}
                                        className="partner-accounts-carousel"
                                        interval={null}
                                        controls
                                        style={{marginTop: "1.25rem" }}
                                        indicators
                                        prevIcon={<i className="bi bi-chevron-left fs-4 text-danger " aria-hidden />}
                                        nextIcon={<i className="bi bi-chevron-right fs-4 text-danger" aria-hidden />}
                                    >
                                        {orderedStaticBankAccounts.map((acc) => (
                                            <Carousel.Item key={acc.id}>
                                                <div 
                                                    className="rounded border px-3 py-3 mx-3 mb-4 position-relative"
                                                    style={{
                                                        borderColor: "var(--lb1-border)",
                                                        background: "var(--bg-color)",
                                                        
                                                    }}
                                                >
                                                    <img
                                                        src={editIcon}
                                                        alt="Edit bank account"
                                                        title="Edit bank account"
                                                        className="position-absolute"
                                                        style={{
                                                            top: "0.75rem",
                                                            right: "0.75rem",
                                                            width: "15px",
                                                            height: "15px",
                                                            cursor: "pointer",
                                                            zIndex: 1,
                                                        }}
                                                        onClick={() => {
                                                            const model = bankAccountFromCarouselRow(
                                                                acc,
                                                                userDetails?.bank_account
                                                            );
                                                            AddEditBankAccountDialog.show(
                                                                userId,
                                                                Boolean(model._id),
                                                                model,
                                                                onRefreshuser
                                                            );
                                                        }}
                                                    />
                                                    <DetailsRow title="Account Name" value={acc.account_holder_name} />
                                                    <DetailsRow title="Account Number" value={acc.account_number} />
                                                    <DetailsRow title="IFSC Code" value={acc.ifsc_code} />
                                                    <DetailsRow title="Bank Name" value={acc.bank_name} />
                                                    <DetailsRow
                                                        title="Account Status"
                                                        value={
                                                            <span className={acc.isActive ? "custom-active" : "custom-inactive"}>
                                                                {acc.isActive ? "Active" : "Inactive"}
                                                            </span>
                                                        }
                                                    />
                                                    {/* {!acc.isActive && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger mt-2"
                                                            onClick={() => setActiveStaticBankAccountId(acc.id)}
                                                        >
                                                            Set as active account
                                                        </button>
                                                    )} */}
                                                </div>
                                            </Carousel.Item>
                                        ))}
                                    </Carousel>
                                </section>
                            </Col>
                        </Row>
                        {/* <Row className="custom-helper-row">
                            <Col xs={12} md={12}>
                                <section
                                    className="custom-other-details"
                                    style={{ marginLeft: "0px", marginRight: "0px" }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: "10px",
                                        }}
                                    >
                                        <h3 style={{ margin: 0 }}>Categories &amp; services</h3>
                                    </div>
                                    <div
                                        className="rounded border px-3 py-3 position-relative"
                                        style={{
                                            borderColor: "var(--lb1-border)",
                                            background: "var(--bg-color)",
                                        }}
                                    >
                                        {userDetails ? (
                                            <img
                                                src={editIcon}
                                                alt="Edit categories and services"
                                                title="Edit categories and services"
                                                className="position-absolute"
                                                style={{
                                                    top: "0.75rem",
                                                    right: "0.75rem",
                                                    width: "15px",
                                                    height: "15px",
                                                    cursor: "pointer",
                                                    zIndex: 1,
                                                }}
                                                onClick={() => {
                                                    openDialog("edit-partner-categories-services", (close) => (
                                                        <EditPartnerCategoriesServicesDialog
                                                            key={`${userDetails._id}-cat-svc-${Date.now()}`}
                                                            user={userDetails}
                                                            initialCategoryIds={(userDetails.category_ids ?? []).map(String)}
                                                            initialServiceIds={(userDetails.service_ids ?? []).map(String)}
                                                            onClose={close}
                                                            onSaved={() => {
                                                                void onRefreshuser();
                                                                close();
                                                            }}
                                                        />
                                                    ));
                                                }}
                                            />
                                        ) : null}
                                        {viewCategoryServiceGroups.length === 0 ? (
                                            <div className="text-muted small py-1">-</div>
                                        ) : (
                                            viewCategoryServiceGroups.map((g) => (
                                                <DetailsRow
                                                    key={g.categoryId}
                                                    title={g.categoryLabel}
                                                    value={
                                                        g.services.length > 0 ? g.services.join(", ") : "—"
                                                    }
                                                />
                                            ))
                                        )}
                                    </div>
                                </section>
                            </Col>
                        </Row> */}
                    </Modal.Body>
            </Modal>
        </>
    );
}

const PartnerDetailsDialog = Object.assign(PartnerDetailsDialogView, {
    show(userId: string, onRefreshData: () => void) {
        openDialog("partner-details-modal", (close) => (
            <PartnerDetailsDialogView
                userId={userId}
                onClose={close}
                onRefreshData={onRefreshData}
            />
        ));
    },
    showVerificationPreview(userId: string, onRefreshData: () => void) {
        openDialog("partner-details-verification-preview", (close) => (
            <PartnerDetailsDialogView
                userId={userId}
                onClose={close}
                onRefreshData={onRefreshData}
                verificationStaticPreview
            />
        ));
    },
}) as typeof PartnerDetailsDialogView & {
    show: (userId: string, onRefreshData: () => void) => void;
    showVerificationPreview: (userId: string, onRefreshData: () => void) => void;
};

export default PartnerDetailsDialog;
