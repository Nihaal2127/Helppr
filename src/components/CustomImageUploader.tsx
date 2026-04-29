import React, { useState, useEffect, useRef } from "react";
import { Button, Col } from "react-bootstrap";
import { AppConstant } from "../constant/AppConstant";
import { showErrorAlert } from "../helper/alertHelper";
import { getSupportedImageExtensions, getSupportedImageMaxSizeBytes, isSupportedImageFile } from "../helper/utility";

interface CustomImageUploaderProps {
  label: string;
  maxFiles?: number;
  isEditable?: boolean;
  existingImages?: string[];
  onFileChange: (files: File[], replaceUrls: string[]) => void;
}

function resolveExistingImageSrc(url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) {
    return `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }
  return `${AppConstant.IMAGE_BASE_URL}${u}?t=${Date.now()}`;
}

function uploadStatusMeta(file: File | null, existingUrl?: string) {
  if (file) {
    return {
      text: `Image selected: ${file.name}`,
      color: "var(--btn-success)",
      title: file.name,
    };
  }
  if ((existingUrl ?? "").trim()) {
    return {
      text: "Image already uploaded",
      color: "var(--content-txt-color)",
      title: "Image already uploaded",
    };
  }
  return {
    text: "No file chosen",
    color: "var(--placeholder-txt)",
    title: "No file chosen",
  };
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
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const initKeyRef = useRef<string>("");
  const existingImagesKey = existingImages.join("|");

  useEffect(() => {
    const initKey = `${isEditable ? "1" : "0"}|${existingImagesKey}`;
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    const initialFileInputs = isEditable
      ? (existingImages.length > 0 ? existingImages.map(() => null) : [null])
      : [null];
    setFileInputs(initialFileInputs);
    setReplaceUrls([]);
  }, [isEditable, existingImages.length, existingImagesKey]);

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

  const addFileInput = () => {
    if (fileInputs.length < maxFiles) {
      setFileInputs((prev) => [...prev, null]);
    }
  };

  return (
    <Col sm={12}>
      <div className="mb-3">
        <label className="me-3 mb-1 mt-3 fw-medium">{label}</label>
        {fileInputs.map((file, index) => (
          <div key={index} className="d-flex align-items-center mb-2">
            {(() => {
              const statusMeta = uploadStatusMeta(file, existingImages[index]);
              return (
                <>
            {isEditable && existingImages[index] && !file ? (
              <div className="me-2">
                <img
                  alt=""
                  src={resolveExistingImageSrc(existingImages[index])}
                  style={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
              </div>
            ) : null}
            <div className="form-control d-flex align-items-center gap-2 py-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => inputRefs.current[index]?.click()}
              >
                Choose File
              </button>
              <span
                className="small text-truncate"
                style={{
                  color: statusMeta.color,
                  maxWidth: "280px",
                }}
                title={statusMeta.title}
              >
                {statusMeta.text}
              </span>
              <input
                type="file"
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                style={{ display: "none" }}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  if (selectedFile && !isSupportedImageFile(selectedFile)) {
                    showErrorAlert(`Only ${getSupportedImageExtensions().join(", ")} formats up to ${Math.floor(getSupportedImageMaxSizeBytes() / 1024)}KB are supported.`);
                    e.target.value = "";
                    return;
                  }
                  handleFileChange(index, selectedFile);
                }}
              />
            </div>
                </>
              );
            })()}
            {/* <Button
              variant="danger"
              className="ms-2"
              onClick={() => removeFileInput(index)}
            >
              Remove
            </Button> */}
          </div>
        ))}
        {maxFiles > 1 && fileInputs.length < maxFiles && (
          <Button
            variant="primary"
            style={{
              backgroundColor: "var(--primary-color)",
              border: "none",
              marginTop: "10px",
            }}
            onClick={addFileInput}
          >
            + Add
          </Button>
        )}
      </div>
    </Col>
  );
};

export default CustomImageUploader;
