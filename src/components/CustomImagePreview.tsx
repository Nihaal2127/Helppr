import ReactDOM from "react-dom";
import { Modal } from "react-bootstrap";
import CustomCloseButton from "./CustomCloseButton";
import { DocumentModel } from "../models/DocumentModel";
import { AppConstant } from "../constant/AppConstant";
import { verificationStatusCell } from "../helper/utility";

function documentPreviewImageSrc(documentPreview: DocumentModel): string {
    const img = documentPreview.document_image ?? "";
    if (!img) return "";
    if (/^(https?:|data:)/i.test(img) || img.startsWith("/")) {
        return img;
    }
    return `${AppConstant.IMAGE_BASE_URL}${img}`;
}

export const CustomImagePreviewDialog = (
    documentPreview: DocumentModel,
) => {
    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);

    const closeModal = () => {
        ReactDOM.unmountComponentAtNode(modalContainer);
        document.body.removeChild(modalContainer);
    };

    const imageSrc = documentPreviewImageSrc(documentPreview);

    ReactDOM.render(
        <Modal show={true}
            onHide={closeModal}
            centered
            dialogClassName="custom-big-modal"
        >
            <Modal.Header className="border-bottom-0">
                <Modal.Title as="h5" className="custom-dialog-title mt-0">
                    Verification Status: {verificationStatusCell(documentPreview.verification_status)({})}
                </Modal.Title>
                <CustomCloseButton onClose={closeModal} />
            </Modal.Header>
            <Modal.Body className="d-flex justify-content-center align-items-center">
                <img
                    src={imageSrc}
                    alt="document"
                    className="img-fluid"
                    style={{ maxWidth: "80%", maxHeight: "80%" }}
                />
            </Modal.Body>
        </Modal>,
        modalContainer
    );
};
