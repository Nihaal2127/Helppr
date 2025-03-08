import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { fetchUserById } from "../../services/userService";
import editIcon from "../../assets/icons/edit_red.svg"
import deleteIcon from "../../assets/icons/delete_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, DetailsRowLink, formatDate, DetailsRowStatus, DetailsRowLinkDocument, showLog } from "../../helper/utility";
import AddEditUserDialog from "./AddEditUserDialog";
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

type PartnerDetailsDialogProps = {
    userId: string;
    onClose: () => void;
    onRefreshData: () => void;
};

const PartnerDetailsDialog: React.FC<PartnerDetailsDialogProps> & {
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

    const addDocument = (document: DocumentModel) => {
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
        openConfirmDialog(
            "Are you sure you want to delete document?",
            "Delete",
            "Cancle",
            async () => {
                const response = await deletePartnerDocument(document._id);
                if (response) {
                    onRefreshuser();
                }
            },
            deleteIcon
        );

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
                                    : profileIcon} alt=" Profile Picture" width="160px" height="160px" />
                            </div>

                            <div className="custom-personal-details">

                                <Col className="custom-helper-column">
                                    <DetailsRow title="Partner ID" value={userDetails?.user_id} />
                                    <DetailsRow title="Partner Name" value={userDetails?.name} />
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
                                AddEditUserDialog.show(2, true, userDetails!!, onRefreshuser)
                            }} />
                        </div>
                        <Row className="custom-helper-row">
                            <section className="custom-other-details">
                                <h3>Serviced</h3>
                                <DetailsRowLink title="Total Services" value={userDetails?.total_service} onClick={() => openServices(null)} />
                                <DetailsRowLink title="Completed" value={userDetails?.completed_service} onClick={() => openServices(3)} />
                                <DetailsRowLink title="In Progress" value={userDetails?.in_progress_service} onClick={() => openServices(2)} />
                                <DetailsRowLink title="Cancelled" value={userDetails?.cancelled_service} onClick={() => openServices(4)} />
                                <DetailsRow title="Registered Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
                                <DetailsRow title="Last Service Date" value={formatDate(userDetails?.last_service_date ? userDetails?.last_service_date : "")} />
                                <DetailsRowStatus title="Status" isActive={userDetails?.is_active ? userDetails?.is_active : false} />
                            </section>
                            <Col>
                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Verification</h3>
                                    <DetailsRow title="Status" value={userDetails?.total_payment} />
                                    <DetailsRow title="Verified Date" value={formatDate(userDetails?.last_paid_date ? userDetails?.last_paid_date : "")} />
                                    <DetailsRow title="Verification ID" value={userDetails?.received_payment} />
                                    <DetailsRow title="Registration ID" value={userDetails?.in_progress_payment} />
                                </section>

                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Documents</h3>
                                    {userDetails?.documents?.map((document) => (
                                        <DetailsRowLinkDocument
                                            title={document.name || ""}
                                            isEditable={document.document_image === "" ? false : true}
                                            onViewClick={() => CustomImagePreviewDialog(document)}
                                            onAddClick={() => addDocument(document)}
                                            onDeleteClick={() => deleteDocument(document)}
                                        />
                                    ))}
                                </section>
                            </Col>
                            <Col>
                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Payment</h3>
                                    <DetailsRow title="Total Payment" value={userDetails?.total_payment} />
                                    <DetailsRow title="Paid Amount" value={userDetails?.paid_amount} />
                                    <DetailsRow title="Balance Amount" value={userDetails?.balance_amount} />
                                    <DetailsRow title="Refund" value={userDetails?.refund_payment} />
                                </section>

                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                                        <h3 style={{ margin: 0 }}>Accounts</h3>
                                        <img
                                            src={editIcon}
                                            alt="edit"
                                            style={{ width: "20px", height: "20px", cursor: "pointer" }}
                                            onClick={() => {
                                                AddEditBankAccountDialog.show(userId, false, userDetails?.bank_account!!, onRefreshuser);
                                            }}
                                        />
                                    </div>
                                    <DetailsRow title="Account Name" value={userDetails?.bank_account?.account_holder_name} />
                                    <DetailsRow title="Account Number" value={userDetails?.bank_account?.account_number} />
                                    <DetailsRow title="IFSC Code" value={userDetails?.bank_account?.ifsc_code} />
                                    <DetailsRow title="Bank Name" value={userDetails?.bank_account?.bank_name} />
                                </section>
                            </Col>
                        </Row>
                    </Modal.Body>
                </div>
            </Modal>
        </>
    );
};

PartnerDetailsDialog.show = (userId: string, onRefreshData: () => void) => {
    const existingModal = document.getElementById("partner-details-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "partner-details-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <PartnerDetailsDialog
            userId={userId}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default PartnerDetailsDialog;
