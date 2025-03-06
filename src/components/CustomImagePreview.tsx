import ReactDOM from "react-dom/client";
import { Modal } from "react-bootstrap";
import CustomCloseButton from "./CustomCloseButton";
import { DocumentModel } from "../models/DocumentModel";
import { AppConstant } from "../constant/AppConstant";
import { VerificationStatusEnum } from "../constant/VerificationStatusEnum";

export const CustomImagePreviewDialog = (
    documentPreview: DocumentModel,
) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <Modal show={true}
            onHide={closeModal}
            centered
            dialogClassName="custom-big-modal"
        >
            <Modal.Header className="border-bottom-0">
                <Modal.Title as="h5" className="custom-dialog-title mt-0">
                    Verification Status: {VerificationStatusEnum.get(documentPreview.verification_status)?.label}
                </Modal.Title>
                <CustomCloseButton onClose={closeModal} />
            </Modal.Header>
            <Modal.Body className="d-flex justify-content-center align-items-center">
                <img
                    src={`${AppConstant.IMAGE_BASE_URL}${documentPreview.document_image}`}
                    alt="document"
                    className="img-fluid"
                    style={{ maxWidth: "80%", maxHeight: "80%" }}
                />
            </Modal.Body>
        </Modal>
    );
};
