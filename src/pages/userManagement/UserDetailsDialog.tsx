import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { fetchUserById } from "../../services/userService";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, formatDate } from "../../helper/utility";
import ServiceDetailsDialog from "./ServiceDetailsDialog";
import { AppConstant } from "../../constant/AppConstant";
import { openDialog } from "../../helper/DialogManager";

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
    }
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
                                    <DetailsRow title="State" value={userDetails?.state_name} />
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
                        <img src={editIcon} alt="edit" onClick={() => {
                            void import("./AddEditUserDialog").then(({ default: AddEditUserDialog }) => {
                                AddEditUserDialog.show(4, true, userDetails!!, onRefreshuser);
                            });
                        }} />
                    </div>
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
