import React from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "../../components/CustomCloseButton";
import { updateStatusDocument } from "../../services/partnerDocumentService";
import CustomTextField from "../../components/CustomTextField";
import { DocumentModel } from "../../models/DocumentModel";

type RejectDocumentDialogProps = {
    documentReject: DocumentModel;
    onClose: () => void;
    onRefreshData: () => void;
};

const RejectDocumentDialog: React.FC<RejectDocumentDialogProps> & {
    show: (documentReject: DocumentModel, onRefreshData: () => void) => void;
} = ({ documentReject, onClose, onRefreshData }) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmitEvent = async (data: any) => {
        const payload = {
            rejected_reasone: data.rejected_reasone,
            status: 3
        };

        let responseUser = await updateStatusDocument(payload, documentReject._id);
        if (responseUser) {
            onClose && onClose();
            onRefreshData();
        }
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <Modal.Title as="h5" className="custom-modal-title">
                        Document Reject
                    </Modal.Title>
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <form
                        noValidate
                        name="reject-document-form"
                        id="reject-document-form"
                        onSubmit={handleSubmit(onSubmitEvent)}
                    >
                        <Row>
                            <CustomTextField
                                label="Rejection Reason"
                                controlId="rejected_reasone"
                                placeholder="Enter rejection reason"
                                register={register}
                                error={errors.reason}
                                validation={{ required: "Rejection reason is required" }}
                            />
                        </Row>
                        <Row className="mt-4">
                            <Col xs={6} className="text-center">
                                <Button type="submit" className="custom-btn-primary" >
                                    Reject
                                </Button>
                            </Col>
                            <Col xs={6} className="text-center" onClick={onClose}>
                                <Button className="custom-btn-secondary">
                                    Cancel
                                </Button>
                            </Col>
                        </Row>
                    </form>
                </Modal.Body>
            </Modal>
        </>
    );
};

RejectDocumentDialog.show = (documentReject: DocumentModel, onRefreshData: () => void) => {
    const existingModal = document.getElementById("reject-document-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "reject-document-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <RejectDocumentDialog
            documentReject={documentReject}
            onClose={closeModal}
            onRefreshData={onRefreshData}
        />
    );
};

export default RejectDocumentDialog;
