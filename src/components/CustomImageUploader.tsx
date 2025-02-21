import React, { useState, useEffect } from "react";
import { Button, Col, Form} from "react-bootstrap";
import { AppConstant } from "../constant/AppConstant";

interface CustomImageUploaderProps {
  label: string;
  maxFiles?: number;
  isEditable?: boolean;
  existingImages?: string[];
  onFileChange: (files: File[], replaceUrls: string[]) => void;
}

const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({
  label,
  maxFiles = 3,
  isEditable = false,
  existingImages = [],
  onFileChange,
}) => {
  const [fileInputs, setFileInputs] = useState<(File | null)[]>([]);
  const [replaceUrls, setReplaceUrls] = useState<string[]>([]);

  useEffect(() => {
    if (isEditable) {
      const initialFileInputs = existingImages.map(() => null);
      setFileInputs(initialFileInputs);
    }else{
      setFileInputs([null]);
    }
  }, [isEditable]);
  
  const handleFileChange = (index: number, file: File | null) => {
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

  const removeFileInput = (index: number) => {
    const updatedFiles = [...fileInputs];
    const updatedReplaceUrls = [...replaceUrls];

    if (existingImages[index]) {
      const urlIndex = updatedReplaceUrls.indexOf(existingImages[index]);
      if (urlIndex !== -1) {
        updatedReplaceUrls.splice(urlIndex, 1);
      }
    }

    updatedFiles.splice(index, 1);
    setFileInputs(updatedFiles);
    setReplaceUrls(updatedReplaceUrls);

    onFileChange(updatedFiles.filter((f) => f !== null) as File[], updatedReplaceUrls);
  };

  const addFileInput = () => {
    if (fileInputs.length < maxFiles) {
      setFileInputs((prev) => [...prev, null]);
    }
  };

  return (
    <Col sm={12}>
      <div className="mb-3">
        <label className="me-3 mb-3 mt-3">{label}</label>
        {fileInputs.map((file, index) => (
          <div key={index} className="d-flex align-items-center mb-2">
            {isEditable && existingImages[index] && !file ? (
              <div className="me-2">
                <img
                  alt={`Existing ${index}`}
                  src={`${AppConstant.IMAGE_BASE_URL}${existingImages[index]}?t=${Date.now()}`}
                  style={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) =>
                handleFileChange(index, e.target.files?.[0] || null)
              }
            />
            <Button
              variant="danger"
              className="ms-2"
              onClick={() => removeFileInput(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        {fileInputs.length < maxFiles && (
          <Button variant="primary" style={{backgroundColor:"var(--primary-color)" , border:"none", marginTop:"10px"}}onClick={addFileInput}>
            + Add
          </Button>
        )}
      </div>
    </Col>
  );
};

export default CustomImageUploader;
