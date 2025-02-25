import { useState, useRef } from "react";
import { Modal, Row, Button } from "react-bootstrap";
import CustomCloseButton from "./CustomCloseButton";
import uploadIcon from '../assets/icons/upload.svg';

interface CustomUploadProps {
    isOpen?: boolean;
    onClose: () => void;
    onUploadSave: () => void;
    existingImages?: string[];
    onFileChange: (files: File[], replaceUrls: string[]) => void;
}

const CustomUpload = ({
    isOpen,
    onClose,
    onUploadSave,
    existingImages = [],
    onFileChange,
}: CustomUploadProps) => {

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
        <Modal
            show={isOpen}
            onHide={onClose}
            centered
        >
            <Modal.Header className="py-3 px-4 border-bottom-0">
                <CustomCloseButton onClose={onClose} />
            </Modal.Header>
            <Modal.Body className="px-4 pb-4 pt-10">
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
    );
}

export default CustomUpload;