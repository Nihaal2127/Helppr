import React, { useState, useEffect, useRef } from "react";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { fetchUserById } from "../../services/userService";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, DetailsRowLink, formatDate, DetailsRowStatus } from "../../helper/utility";
import AddEditUserDialog from "./AddEditUserDialog";
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

    const fetchDataFromApi = async () => {
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
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

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
                show={true}
                onHide={onClose}
                centered
            >
                <div className="custom-model-detail">
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
                                    : profileIcon} alt=" Profile Picture" width="160px" height="160px" />
                            </div>

                            <div className="custom-personal-details">

                                <Col className="custom-helper-column">
                                    <DetailsRow title="User ID" value={userDetails?.user_id} />
                                    <DetailsRow title="User Name" value={userDetails?.name} />
                                    <DetailsRow title="Email ID" value={userDetails?.email} />
                                    <DetailsRow title="Phone No" value={userDetails?.phone_number} />
                                </Col>
                                <Col className="custom-helper-column">
                                    <DetailsRow title="Address" value={userDetails?.address} />
                                    <DetailsRow title="State" value={userDetails?.state_name} />
                                    <DetailsRow title="City" value={userDetails?.city_name} />
                                    <DetailsRow title="Postal Code" value={userDetails?.pincode} />
                                </Col>
                            </div>
                            <img src={editIcon} alt="edit" onClick={() => {
                                AddEditUserDialog.show(4, true, userDetails!!, onRefreshuser)
                            }} />
                        </div>
                        <Row className="custom-helper-row">
                            <section className="custom-other-details" style={{ paddingBottom: "30px" }}>
                                <h3>Services</h3>
                                <DetailsRowLink title="Total Services" value={userDetails?.total_service} onClick={() => openServices(null)} />
                                <DetailsRowLink title="Completed" value={userDetails?.completed_service} onClick={() => openServices(3)} />
                                <DetailsRowLink title="In Progress" value={userDetails?.in_progress_service} onClick={() => openServices(2)} />
                                <DetailsRowLink title="Cancelled" value={userDetails?.cancelled_service} onClick={() => openServices(4)} />
                                <DetailsRow title="Registered Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
                                <DetailsRow title="Last Service Date" value={formatDate(userDetails?.last_service_date ? userDetails?.last_service_date : "")} />
                                <DetailsRowStatus title="Status" isActive={userDetails?.is_active ? userDetails?.is_active : false} />
                            </section>
                            <section className="custom-other-details">
                                <h3>Payment</h3>
                                <DetailsRow title="Total Payment" value={`${AppConstant.currencySymbol}${userDetails?.total_amount ? userDetails?.total_amount : 0}`} />
                                <DetailsRow title="Balance Amount" value={`${AppConstant.currencySymbol}${userDetails?.balance_amount ? userDetails?.balance_amount : 0}`} />
                                <DetailsRow title="Refund" value={`${AppConstant.currencySymbol}${userDetails?.refund_payment ? userDetails?.refund_payment : 0}`} />
                            </section>
                        </Row>
                    </Modal.Body>
                </div>
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
