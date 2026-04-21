import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { createOrUpdateUser, fetchUserById } from "../../services/userService";
import { fetchCityDropDown } from "../../services/cityService";
import { fetchStateDropDown } from "../../services/stateService";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, formatDate } from "../../helper/utility";
import ServiceDetailsDialog from "./ServiceDetailsDialog";
import UserAddressReadOnlyCards from "./UserAddressReadOnlyCards";
import UserViewAddressModal from "./UserViewAddressModal";
import type { UserViewAddressFormValues } from "./UserViewAddressModal";
import { AppConstant } from "../../constant/AppConstant";
import { getLocalStorage } from "../../helper/localStorageHelper";
import { openDialog } from "../../helper/DialogManager";
import { sanitizeIndianPincodeInput } from "../../helper/pincodeValidation";
import { showErrorAlert, showSuccessAlert } from "../../helper/alertHelper";

type UserDetailsDialogProps = {
    userId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const UserDetailsDialog: React.FC<UserDetailsDialogProps> & {
    show: (userId: string, onRefreshData: () => void) => void;
} = ({ userId, onClose, onRefreshData }) => {

    const [userDetails, setUserDetails] = useState<UserModel>();
    const fetchRef = useRef(false);

    const [viewAddrModalOpen, setViewAddrModalOpen] = useState(false);
    const [viewAddrMode, setViewAddrMode] = useState<"edit" | "add">("edit");
    const [viewStates, setViewStates] = useState<{ value: string; label: string }[]>([]);
    const [viewCities, setViewCities] = useState<{ value: string; label: string }[]>([]);

    const fetchDataFromApi = useCallback(async () => {
        if (fetchRef.current) return;
        fetchRef.current = true;
        try {
            const { response, user } = await fetchUserById(userId);
            if (response) {
                setUserDetails(user!!);
            }
        } finally {
            fetchRef.current = false;
        }
    }, [userId]);

    useEffect(() => {
        void fetchDataFromApi();
    }, [fetchDataFromApi]);

    const openServices = (status: number | null) => {
        ServiceDetailsDialog.show(userId, false, status, onRefreshuser);
    };

    const onRefreshuser = async () => {
        await fetchDataFromApi();
        onRefreshData();
    };

    const loadViewCities = useCallback(async (stateId: string) => {
        if (!stateId) {
            setViewCities([]);
            return;
        }
        const opts = await fetchCityDropDown([stateId]);
        setViewCities(opts);
    }, []);

    /** Stable ref so `UserViewAddressModal` effects do not re-run every parent render (was causing a fetch/setState loop). */
    const onViewModalFetchCities = useCallback(
        (stateId: string) => {
            void loadViewCities(stateId);
        },
        [loadViewCities]
    );

    const openViewAddressModal = useCallback(
        async (mode: "edit" | "add") => {
            if (viewStates.length === 0) {
                const s = await fetchStateDropDown();
                setViewStates(s);
            }
            if (mode === "add") {
                setViewCities([]);
            } else if (userDetails?.state_id) {
                await loadViewCities(userDetails.state_id);
            }
            setViewAddrMode(mode);
            setViewAddrModalOpen(true);
        },
        [viewStates.length, userDetails?.state_id, loadViewCities]
    );

    const handleViewAddressSave = useCallback(
        async (values: UserViewAddressFormValues): Promise<boolean> => {
            if (!userDetails?._id) {
                showErrorAlert("Unable to save. User data is missing.");
                return false;
            }
            const pin = sanitizeIndianPincodeInput(values.postal);
            const common: Record<string, unknown> = {
                type: userDetails.type,
                is_from_web: userDetails.is_from_web,
                registration_type: 1,
                created_by_id: getLocalStorage(AppConstant.createdById),
                name: userDetails.name ?? "",
                email: userDetails.email ?? "",
                phone_number: userDetails.phone_number ?? "",
                is_active: userDetails.is_active,
                ...(userDetails.profile_url ? { profile_url: userDetails.profile_url } : {}),
            };

            let payload: Record<string, unknown>;
            if (viewAddrMode === "edit") {
                payload = {
                    ...common,
                    address: values.line,
                    state_id: values.stateId,
                    city_id: values.cityId,
                    pincode: pin,
                };
            } else {
                const raw = userDetails.extra_addresses ?? [];
                const mapped = raw.map((x) => ({
                    state_id: x.state_id ?? "",
                    city_id: x.city_id ?? "",
                    pincode: sanitizeIndianPincodeInput(String(x.pincode ?? "")),
                    address: (x.address ?? "").trim(),
                }));
                payload = {
                    ...common,
                    address: userDetails.address ?? "",
                    state_id: userDetails.state_id ?? "",
                    city_id: userDetails.city_id ?? "",
                    pincode: sanitizeIndianPincodeInput(String(userDetails.pincode ?? "")),
                    extra_addresses: [
                        ...mapped,
                        {
                            state_id: values.stateId,
                            city_id: values.cityId,
                            pincode: pin,
                            address: values.line.trim(),
                        },
                    ],
                };
            }

            const ok = await createOrUpdateUser(payload, true, userDetails._id);
            if (ok) {
                showSuccessAlert(viewAddrMode === "edit" ? "Address updated." : "Address added.");
                const refreshed = await fetchUserById(userId);
                if (refreshed.response && refreshed.user) {
                    setUserDetails(refreshed.user);
                }
                onRefreshData();
                return true;
            }
            showErrorAlert("Could not save address. Please try again.");
            return false;
        },
        [userDetails, viewAddrMode, userId, onRefreshData]
    );

    const viewAddressInitial = useMemo((): UserViewAddressFormValues | null => {
        if (viewAddrMode !== "edit" || !userDetails) return null;
        return {
            stateId: userDetails.state_id ?? "",
            cityId: userDetails.city_id ?? "",
            postal: userDetails.pincode ?? "",
            line: userDetails.address ?? "",
        };
    }, [
        viewAddrMode,
        userDetails?._id,
        userDetails?.state_id,
        userDetails?.city_id,
        userDetails?.pincode,
        userDetails?.address,
    ]);

    return (
        <>
            <Modal
                dialogClassName="custom-big-modal"
                size="xl"
                show={true}
                onHide={onClose}
                centered
            >
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        User Information
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
                                    <DetailsRow title="User Name" value={userDetails?.name} />
                                    <DetailsRow title="Phone No" value={userDetails?.phone_number} />
                                    <DetailsRow title="Registered Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
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
                            </div>
                        <img src={editIcon} alt="edit" onClick={() => {
                            void import("./AddEditUserDialog").then(({ default: AddEditUserDialog }) => {
                                AddEditUserDialog.show(4, true, userDetails!!, onRefreshuser);
                            });
                        }} />
                    </div>
                    {userDetails ? (
                        <section className="custom-other-details mt-3" style={{ padding: "10px" }}>
                            <h3 className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <span>Address</span>
                                <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none fw-semibold"
                                    style={{ color: "var(--primary-color)", fontSize: "15px" }}
                                    onClick={() => void openViewAddressModal("add")}>
                                    + Add address
                                </button>
                            </h3>
                            <UserAddressReadOnlyCards
                                user={userDetails}
                                onEdit={() => void openViewAddressModal("edit")}
                            />
                        </section>
                    ) : null}
                    <Row className="custom-helper-row">
                        <section className="custom-other-details" style={{ paddingBottom: "30px" }}>
                            <h3 className="mb-3">Services</h3>
                            <div className="user-details-service-stats">
                                {(
                                    [
                                        {
                                            label: "Total Services",
                                            node: (
                                                <button
                                                    type="button"
                                                    className="btn btn-link p-0 m-0 align-baseline text-decoration-underline"
                                                    style={{
                                                        fontFamily: "Inter",
                                                        fontSize: "16px",
                                                        color: "var(--primary-color)",
                                                    }}
                                                    onClick={() => openServices(null)}
                                                >
                                                    {userDetails?.total_service == null ? "0" : userDetails.total_service}
                                                </button>
                                            ),
                                        },
                                        {
                                            label: "Completed",
                                            node: <span>{userDetails?.completed_service ?? "-"}</span>,
                                        },
                                        {
                                            label: "In Progress",
                                            node: <span>{userDetails?.in_progress_service ?? "-"}</span>,
                                        },
                                        {
                                            label: "Cancelled",
                                            node: <span>{userDetails?.cancelled_service ?? "-"}</span>,
                                        },
                                    ] as const
                                ).map(({ label, node }) => (
                                    <div
                                        key={label}
                                        className="d-flex align-items-baseline justify-content-between gap-3"
                                        style={{ minHeight: "36px" }}
                                    >
                                        <span
                                            className="custom-personal-row-title"
                                            style={{
                                                flex: "1 1 auto",
                                                minWidth: 0,
                                                fontSize: "16px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <span
                                            className="custom-personal-row-value text-center"
                                            style={{
                                                flex: "0 0 8.5rem",
                                                fontFamily: "Inter",
                                                fontSize: "16px",
                                                fontWeight: "normal",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {node}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="custom-other-details">
                            <h3>Payment</h3>
                            <DetailsRow title="Total Payment" value={`${AppConstant.currencySymbol}${userDetails?.total_amount ? userDetails?.total_amount : 0}`} />
                            <DetailsRow title="Balance Amount" value={`${AppConstant.currencySymbol}${userDetails?.balance_amount ? userDetails?.balance_amount : 0}`} />
                            <DetailsRow title="Refund" value={`${AppConstant.currencySymbol}${userDetails?.refund_payment ? userDetails?.refund_payment : 0}`} />
                        </section>
                    </Row>
                </Modal.Body>
            </Modal>
            {userDetails ? (
                <UserViewAddressModal
                    show={viewAddrModalOpen}
                    title={viewAddrMode === "edit" ? "Edit address" : "Add address"}
                    states={viewStates}
                    cities={viewCities}
                    onFetchCities={onViewModalFetchCities}
                    initial={viewAddressInitial}
                    onHide={() => setViewAddrModalOpen(false)}
                    onSave={handleViewAddressSave}
                />
            ) : null}
        </>
    );
};

UserDetailsDialog.show = (userId: string, onRefreshData: () => void) => {
    openDialog("user-details-modal", (close) => (
        <UserDetailsDialog
            userId={userId}
            onClose={close}
            onRefreshData={onRefreshData}
        />
    ));
};

export default UserDetailsDialog;
