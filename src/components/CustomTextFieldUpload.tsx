import React, { useState } from "react";
import { Row, Col } from "react-bootstrap";
import CustomUpload from "./CustomUpload";

interface CustomTextFieldUploadProps {
    label: string;
    linkLable?: string;
    existingImages?: string[];
    onFileChange: (files: File[], replaceUrls: string[]) => void;
    labelSize?: number;
}

const CustomTextFieldUpload: React.FC<CustomTextFieldUploadProps> = ({
    label,
    linkLable = "Upload",
    existingImages,
    onFileChange,
    labelSize = 4,
}) => {

    const [uploadShow, setUploadShow] = useState(false);

    return (
        <>
            <Row className={`align-items-center ${labelSize !== 4 ? "mb-4" : ""}`}>
                <Col sm={labelSize}>
                    <label className="custom-profile-lable">{label}</label>
                </Col>
                <Col>
                    <span
                        style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontWeight: "normal",
                            color: "var(--primary-txt-color)",
                            textDecoration: "underline",
                            cursor: "pointer",
                            
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            setUploadShow(true);
                        }}
                    >{linkLable}</span>
                </Col>
            </Row>

            {uploadShow && (
                <CustomUpload
                    isOpen={uploadShow}
                    onClose={() => setUploadShow(false)}
                    onUploadSave={() => {
                        setUploadShow(false)
                    }}
                    existingImages={existingImages}
                    onFileChange={onFileChange}
                />
            )}
        </>

    );
};

export default CustomTextFieldUpload;
