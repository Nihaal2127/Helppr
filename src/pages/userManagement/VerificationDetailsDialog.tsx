import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
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

type VerificationDetailsDialogProps = {
    userId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const VerificationDetailsDialog: React.FC<VerificationDetailsDialogProps> & {
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
        ServiceDetailsDialog.show(status, onRefreshuser);
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
                            Verification Documents
                        </Modal.Title>
                        <CustomCloseButton onClose={onClose} />
                    </Modal.Header>
                    <Modal.Body className="px-4 pb-4 pt-0">
                        <Row className="custom-helper-row">
                            {userDetails?.documents?.map((document) => (
                                <section className="custom-other-details">
                                    <h3>{document.name}</h3>
                                    <DetailsRow title="Name" value={document.name} />
                                    <DetailsRow title="Submmitted Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
                                    <DetailsRowStatus title="Verification Status" isActive={document.is_active ? document.is_active : false} />
                                </section>
                            ))}
                        </Row>
                    </Modal.Body>
                </div>
            </Modal>
        </>
    );
};

VerificationDetailsDialog.show = (userId: string, onRefreshData: () => void) => {
    const existingModal = document.getElementById("user-details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "user-details-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <VerificationDetailsDialog
            userId={userId}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default VerificationDetailsDialog;
