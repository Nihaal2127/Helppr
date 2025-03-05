import React, { useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Modal, Button, Row, Col } from "react-bootstrap";
import CustomCloseButton from "./CustomCloseButton";
import uploadIcon from '../assets/icons/upload.svg';

type CustomUploadDialogProps = {
    onFileChange: (files: File[], replaceUrls: string[]) => void;
    onUploadSave: () => void;
    onClose: () => void;
    existingImages?: string[];
};

const CustomUploadDialog: React.FC<CustomUploadDialogProps> & {
    show: (
        onFileChange: (files: File[], replaceUrls: string[]) => void,
        onUploadSave: () => void,
        existingImages?: string[]
    ) => void;
} = ({ onFileChange, onUploadSave, onClose, existingImages = [] }) => {

    const [fileInputs, setFileInputs] = useState<(File | null)[]>([]);
    const [replaceUrls, setReplaceUrls] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (file: File | null) => {
        const index: number = 0;
        const updatedFiles = [...fileInputs];
        const updatedReplaceUrls = [...replaceUrls];

        updatedFiles[index] = file;

        if (file && existingImages[index]) {
            if (!updatedReplaceUrls.includes(existingImages[index])) {
                updatedReplaceUrls.push(existingImages[index]);
            }
        } else if (!file && existingImages[index]) {
            const urlIndex = updatedReplaceUrls.indexOf(existingImages[index]);
            if (urlIndex !== -1) {
                updatedReplaceUrls.splice(urlIndex, 1);
            }
        }

        setFileInputs(updatedFiles);
        setReplaceUrls(updatedReplaceUrls);

        onFileChange(updatedFiles.filter((f) => f !== null) as File[], updatedReplaceUrls);
    };

    return (
        <>
            <Modal show={true} onHide={onClose} centered dialogClassName="custom-big-modal">
                <Modal.Header className="py-3 px-4 border-bottom-0">
                    <CustomCloseButton onClose={onClose} />
                </Modal.Header>
                <Modal.Body className="px-4 pb-4 pt-0">
                    <div className="text-center">
                        <img
                            src={fileInputs[0] ? URL.createObjectURL(fileInputs[0]) : uploadIcon}
                            alt="Upload"
                            style={{
                                height: "160px",
                                width: "160px",
                                objectFit: "contain",
                                cursor: "pointer",
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                console.log("Selected file:", file);
                                handleFileChange(file)
                            }
                        }}
                    />
                    <Row className="mt-4">
                        <Button type="submit" style={{
                            backgroundColor: "var(--secondary-btn)",
                            fontSize: 20,
                            fontWeight: "normal",
                            color: "var(--secondary-txt)",
                            border: "var(--secondary-btn)",
                            borderRadius: "8px",
                            height: "48px",
                            padding: "6px 12px",
                        }}
                            onClick={onUploadSave}>
                            Upload Photo
                        </Button>
                    </Row>
                </Modal.Body>
            </Modal>
        </>
    );
};

CustomUploadDialog.show = (onFileChange: (files: File[], replaceUrls: string[]) => void, onUploadSave: () => void, existingImages?: string[]) => {
    const existingModal = document.getElementById("upload-document-modal");
    if (existingModal) {
        return;
    }
    const modalContainer = document.createElement("div");
    modalContainer.id = "upload-document-modal";
    document.body.appendChild(modalContainer);
    const root = ReactDOM.createRoot(modalContainer);

    const closeModal = () => {
        root.unmount();
        document.body.removeChild(modalContainer);
    };

    root.render(
        <CustomUploadDialog
            onFileChange={onFileChange}
            onUploadSave={onUploadSave}
            existingImages={existingImages}
            onClose={closeModal}
        />
    );
};

export default CustomUploadDialog;
