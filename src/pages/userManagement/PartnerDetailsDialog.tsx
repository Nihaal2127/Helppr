import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Modal, Col, Row } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { UserModel } from "../../models/UserModel";
import { fetchUserById } from "../../services/userService";
import editIcon from "../../assets/icons/edit_red.svg"
import profileIcon from "../../assets/icons/profile.svg"
import { DetailsRow, DetailsRowLink, formatDate, DetailsRowStatus, DetailsRowLinkDocument } from "../../helper/utility";
import AddEditUserDialog from "./AddEditUserDialog";
import AddEditBankAccountDialog from "./AddEditBankAccountDialog";
import { DocumentModel } from "../../models/DocumentModel";

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
        } catch (error) {
            console.error("Error fetching state:", error);
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        fetchDataFromApi();
    }, []);

    const openServices = () => {

    }

    const addDocument = (document : DocumentModel) => {
        console.log("Adding document:", document);
        const payload = {
            image_urls : []
        }
      
    };

    const viewDocument = (document : DocumentModel) => {
        console.log("Viewing document:", document);
        
    };

    const deleteDocument = (document : DocumentModel) => {
        console.log("Deleting document:", document);
    
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
                                <img src={profileIcon} alt=" Profile Picture" width="160px" height="160px" />
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
                                AddEditUserDialog.show(false, true, userDetails!!, onRefreshuser)
                            }} />
                        </div>
                        <Row className="custom-helper-row">
                            <section className="custom-other-details">
                                <h3>Serviced</h3>
                                <DetailsRowLink title="Total Services" value={userDetails?.total_service} onClick={openServices} />
                                <DetailsRowLink title="Completed" value={userDetails?.completed_service} onClick={openServices} />
                                <DetailsRowLink title="In Progress" value={userDetails?.in_progress_service} onClick={openServices} />
                                <DetailsRowLink title="Cancelled" value={userDetails?.cancelled_service} onClick={openServices} />
                                <DetailsRow title="Registered Date" value={formatDate(userDetails?.created_at ? userDetails?.created_at : "")} />
                                <DetailsRow title="Last Service Date" value={formatDate(userDetails?.last_service_date ? userDetails?.last_service_date : "")} />
                                <DetailsRowStatus title="Status" isActive={userDetails?.is_active ? userDetails?.is_active : false} />
                            </section>
                            <Col>
                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Verification</h3>
                                    <DetailsRow title="Status" value={userDetails?.total_payment} />
                                    <DetailsRow title="Verified Date" value={"11-Feb-2025"} />
                                    {/* <DetailsRow title="Verified Date" value={formatDate(userDetails?.last_paid_date ? userDetails?.last_paid_date : "")} /> */}
                                    <DetailsRow title="Verification ID" value={userDetails?.received_payment} />
                                    <DetailsRow title="Registration ID" value={userDetails?.in_progress_payment} />
                                </section>

                                <section className="custom-other-details" style={{ marginLeft: "0px", marginRight: "0px" }}>
                                    <h3>Documents</h3>
                                    {userDetails?.documents?.map((document) => (
                                        <DetailsRowLinkDocument
                                            title={document.name || ""}
                                            isEditable={document.document_images.length === 0 ? false : true}
                                            onViewClick={() => viewDocument(document)}
                                            onAddClick={() => addDocument(document)}
                                            onDeleteClick={() => deleteDocument(document)}
                                        />
                                    ))}
                                    {/* <DetailsRowLinkDocument
                                        title="Aadhar Card"
                                        isEditable={false}
                                        onViewClick={addDocument}
                                        onAddClick={viewDocument}
                                        onDeleteClick={deleteDocument}
                                    />

                                    <DetailsRowLinkDocument
                                        title="Pan Card"
                                        isEditable={true}
                                        onViewClick={addDocument}
                                        onAddClick={viewDocument}
                                        onDeleteClick={deleteDocument}
                                    />

                                    <DetailsRowLinkDocument
                                        title="Driving License"
                                        isEditable={true}
                                        onViewClick={addDocument}
                                        onAddClick={viewDocument}
                                        onDeleteClick={deleteDocument}
                                    />

                                    <DetailsRowLinkDocument
                                        title="Vehicle Registration"
                                        isEditable={true}
                                        onViewClick={addDocument}
                                        onAddClick={viewDocument}
                                        onDeleteClick={deleteDocument}
                                    /> */}
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
